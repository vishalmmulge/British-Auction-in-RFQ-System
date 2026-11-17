from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, select
from decimal import Decimal
from datetime import datetime, timezone, timedelta

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.rfq import RFQ, RFQStatus
from app.models.bid import Bid
from app.models.auction_setting import AuctionSetting
from app.models.auction_trigger import AuctionTrigger
from app.models.auction_activity import AuctionActivity
from app.schemas.bid import BidCreate, BidRead
from app.utils.time import now_utc, ensure_utc

router = APIRouter()

# Text used in the extension reason.
TRIGGER_LABELS = {
    "last_bid": "Bid received within the last {window} minutes of the closing time",
    "rank_change": "Supplier ranking changed",
    "l1_change": "L1 (lowest priced) supplier changed",
}


def get_latest_bids_per_supplier(db: Session, rfq_id: int):
    latest_bids_subq = (
        select(Bid.id)
        .where(Bid.rfq_id == rfq_id)
        .group_by(Bid.supplier_id)
        .having(Bid.id == func.max(Bid.id))
    )
    return (
        db.query(Bid)
        .filter(Bid.id.in_(latest_bids_subq))
        .order_by(Bid.total_amount.asc(), Bid.submitted_at.asc(), Bid.id.asc())
        .all()
    )


def rankings_equal(list1, list2) -> bool:
    if len(list1) != len(list2):
        return False
    return all(a.supplier_id == b.supplier_id for a, b in zip(list1, list2))


@router.post("/", response_model=BidRead, status_code=status.HTTP_201_CREATED)
def submit_bid(
    bid_in: BidCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "supplier":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Supplier role required")

    server_now = now_utc()

    rfq = db.query(RFQ).filter(RFQ.id == bid_in.rfq_id).with_for_update().first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    forced_close = ensure_utc(rfq.forced_close_time)
    current_close = ensure_utc(rfq.current_close_time)
    bid_start = ensure_utc(rfq.bid_start_time)
    if server_now >= forced_close:
        if rfq.status == RFQStatus.ACTIVE:
            rfq.status = RFQStatus.FORCED_CLOSED
            db.add(rfq)
            db.commit()
        raise HTTPException(status_code=400, detail="Auction has been force-closed")
    if server_now >= current_close:
        if rfq.status == RFQStatus.ACTIVE:
            rfq.status = RFQStatus.CLOSED
            db.add(rfq)
            db.commit()
        raise HTTPException(status_code=400, detail="Auction has closed")

    if rfq.status != RFQStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Auction is not active")
    if server_now < bid_start:
        raise HTTPException(status_code=400, detail="Auction has not started yet")
    if server_now >= current_close:
        raise HTTPException(status_code=400, detail="Auction has closed")
    if server_now >= forced_close:
        raise HTTPException(status_code=400, detail="Auction has been force-closed")

    pre_bid_rankings = get_latest_bids_per_supplier(db, rfq.id)
    pre_bid_l1_id = pre_bid_rankings[0].supplier_id if pre_bid_rankings else None

    total_amount = bid_in.freight_charges + bid_in.origin_charges + bid_in.destination_charges

    new_bid = Bid(
        rfq_id=bid_in.rfq_id,
        supplier_id=current_user.id,
        carrier_name=bid_in.carrier_name,
        freight_charges=bid_in.freight_charges,
        origin_charges=bid_in.origin_charges,
        destination_charges=bid_in.destination_charges,
        total_amount=total_amount,
        transit_time=bid_in.transit_time,
        quote_validity=bid_in.quote_validity,
    )
    db.add(new_bid)
    db.flush()

    submitted_at_aware = ensure_utc(new_bid.submitted_at)
    db.add(AuctionActivity(
        rfq_id=rfq.id,
        bid_id=new_bid.id,
        actor_id=current_user.id,
        activity_type="bid_placed",
        details={
            "carrier_name": new_bid.carrier_name,
            "total_amount": float(new_bid.total_amount),
            "submitted_at": submitted_at_aware.isoformat() if submitted_at_aware else None,
        },
    ))

    post_bid_rankings = get_latest_bids_per_supplier(db, rfq.id)
    post_bid_l1_id = post_bid_rankings[0].supplier_id if post_bid_rankings else None

    # The first bid creates the ranking, it does not change one.
    rank_changed = bool(pre_bid_rankings) and not rankings_equal(pre_bid_rankings, post_bid_rankings)
    if rank_changed:
        db.add(AuctionActivity(
            rfq_id=rfq.id,
            bid_id=new_bid.id,
            actor_id=current_user.id,
            activity_type="rank_changed",
            details={"previous_l1": pre_bid_l1_id, "new_l1": post_bid_l1_id},
        ))

    setting = db.query(AuctionSetting).filter(AuctionSetting.rfq_id == rfq.id).first()
    triggers = db.query(AuctionTrigger).filter(AuctionTrigger.rfq_id == rfq.id).all()
    enabled_trigger_types = {t.trigger_type for t in triggers}

    extension_triggered = False
    triggered_types = []
    if setting and enabled_trigger_types:
        remaining_time = current_close - server_now
        in_window = timedelta(0) < remaining_time <= timedelta(minutes=setting.extension_window_minutes)

        if in_window:
            for trigger_type in enabled_trigger_types:
                triggered = False
                if trigger_type == "last_bid":
                    bid_submitted = submitted_at_aware
                    window_start = current_close - timedelta(minutes=setting.extension_window_minutes)
                    current_close_aware = current_close
                    if window_start <= bid_submitted < current_close_aware:
                        triggered = True
                elif trigger_type == "rank_change":
                    if rank_changed:
                        triggered = True
                elif trigger_type == "l1_change":
                    if pre_bid_l1_id is not None and pre_bid_l1_id != post_bid_l1_id:
                        triggered = True

                if triggered:
                    extension_triggered = True
                    triggered_types.append(trigger_type)

    if extension_triggered and setting:
        max_ext = setting.max_extensions
        if max_ext is None or rfq.extension_count < max_ext:
            current_close_aware = current_close
            forced_close_aware = forced_close
            new_close_time = min(
                current_close_aware + timedelta(minutes=setting.extension_duration_minutes),
                forced_close_aware,
            )
            rfq.current_close_time = new_close_time
            rfq.extension_count += 1
            rfq.status = RFQStatus.ACTIVE

            reason_parts = [
                TRIGGER_LABELS.get(t, t).format(window=setting.extension_window_minutes)
                for t in triggered_types
            ]
            reason = "; ".join(reason_parts)
            capped_at_forced_close = new_close_time >= forced_close_aware

            db.add(AuctionActivity(
                rfq_id=rfq.id,
                bid_id=new_bid.id,
                actor_id=current_user.id,
                activity_type="extension",
                details={
                    "reason": reason,
                    "trigger_types": triggered_types,
                    "extension_window_minutes": setting.extension_window_minutes,
                    "extension_duration_minutes": setting.extension_duration_minutes,
                    "capped_at_forced_close": capped_at_forced_close,
                    "old_close_time": current_close_aware.isoformat(),
                    "new_close_time": new_close_time.isoformat(),
                    "forced_close_time": forced_close_aware.isoformat(),
                },
            ))

    db.add(rfq)
    db.commit()
    db.refresh(new_bid)

    return BidRead(
        id=new_bid.id,
        rfq_id=new_bid.rfq_id,
        carrier_name=new_bid.carrier_name,
        supplier_id=new_bid.supplier_id,
        freight_charges=new_bid.freight_charges,
        origin_charges=new_bid.origin_charges,
        destination_charges=new_bid.destination_charges,
        total_amount=new_bid.total_amount,
        transit_time=new_bid.transit_time,
        quote_validity=new_bid.quote_validity,
        submitted_at=new_bid.submitted_at,
    )