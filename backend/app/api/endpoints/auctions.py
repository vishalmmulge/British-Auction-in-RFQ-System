from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, select
from typing import List
from datetime import datetime, timezone

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.rfq import RFQ, RFQStatus
from app.models.bid import Bid
from app.models.auction_setting import AuctionSetting
from app.models.auction_trigger import AuctionTrigger
from app.models.auction_activity import AuctionActivity
from app.schemas.auction_listing import AuctionListingItem
from app.schemas.auction_activity import AuctionActivityRead
from app.utils.time import now_utc, ensure_utc

router = APIRouter()


def iso_utc(value: datetime) -> str:
    """Return datetimes with an explicit UTC offset."""
    return ensure_utc(value).isoformat()


def reconcile_rfq_status(rfq: RFQ, db: Session, server_now: datetime) -> RFQ:
    # Only active auctions change status here.
    if rfq.status != RFQStatus.ACTIVE:
        return rfq

    forced_close = ensure_utc(rfq.forced_close_time)
    current_close = ensure_utc(rfq.current_close_time)
    if server_now >= forced_close:
        rfq.status = RFQStatus.FORCED_CLOSED
    elif server_now >= current_close:
        rfq.status = RFQStatus.CLOSED
    else:
        return rfq

    db.add(rfq)
    return rfq


@router.get("/", response_model=List[AuctionListingItem])
def list_auctions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    server_now = now_utc()
    rfqs = db.query(RFQ).all()

    for rfq in rfqs:
        reconcile_rfq_status(rfq, db, server_now)
    db.commit()

    results = []
    for rfq in rfqs:
        latest_bids_subq = (
            select(Bid.id)
            .where(Bid.rfq_id == rfq.id)
            .group_by(Bid.supplier_id)
            .having(Bid.id == func.max(Bid.id))
        )
        latest_bids = db.query(Bid).filter(Bid.id.in_(latest_bids_subq)).all()
        lowest_bid = min((b.total_amount for b in latest_bids), default=None)

        results.append(AuctionListingItem(
            rfq_id=rfq.id,
            reference_id=rfq.reference_id,
            name=rfq.name,
            status=rfq.status,
            lowest_bid=lowest_bid,
            current_closing_time=rfq.current_close_time,
            forced_closing_time=rfq.forced_close_time,
            buyer_id=rfq.buyer_id,
        ))

    return results


@router.get("/{rfq_id}")
def get_auction_detail(
    rfq_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    server_now = now_utc()
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    reconcile_rfq_status(rfq, db, server_now)
    db.commit()
    db.refresh(rfq)

    all_bids = (
        db.query(Bid)
        .filter(Bid.rfq_id == rfq_id)
        .order_by(Bid.total_amount.asc(), Bid.submitted_at.asc(), Bid.id.asc())
        .all()
    )

    latest_bids_subq = (
        select(Bid.id)
        .where(Bid.rfq_id == rfq_id)
        .group_by(Bid.supplier_id)
        .having(Bid.id == func.max(Bid.id))
    )
    latest_bids = (
        db.query(Bid)
        .filter(Bid.id.in_(latest_bids_subq))
        .order_by(Bid.total_amount.asc(), Bid.submitted_at.asc(), Bid.id.asc())
        .all()
    )

    rankings = []
    for rank, bid in enumerate(latest_bids, start=1):
        rankings.append({
            "rank": rank,
            "bid_id": bid.id,
            "supplier_id": bid.supplier_id,
            "carrier_name": bid.carrier_name,
            "total_amount": float(bid.total_amount),
            "freight_charges": float(bid.freight_charges),
            "origin_charges": float(bid.origin_charges),
            "destination_charges": float(bid.destination_charges),
            "transit_time": bid.transit_time,
            "quote_validity": bid.quote_validity,
            "submitted_at": iso_utc(bid.submitted_at),
        })

    setting = db.query(AuctionSetting).filter(AuctionSetting.rfq_id == rfq_id).first()
    triggers = db.query(AuctionTrigger).filter(AuctionTrigger.rfq_id == rfq_id).all()

    activities = (
        db.query(AuctionActivity)
        .filter(AuctionActivity.rfq_id == rfq_id)
        .order_by(desc(AuctionActivity.created_at))
        .all()
    )

    return {
        "rfq": {
            "id": rfq.id,
            "reference_id": rfq.reference_id,
            "name": rfq.name,
            "status": rfq.status,
            "bid_start_time": iso_utc(rfq.bid_start_time),
            "bid_close_time": iso_utc(rfq.bid_close_time),
            "forced_close_time": iso_utc(rfq.forced_close_time),
            "current_close_time": iso_utc(rfq.current_close_time),
            "pickup_service_date": iso_utc(rfq.pickup_service_date),
            "extension_count": rfq.extension_count,
        },
        "settings": {
            "extension_window_minutes": setting.extension_window_minutes if setting else None,
            "extension_duration_minutes": setting.extension_duration_minutes if setting else None,
            "max_extensions": setting.max_extensions if setting else None,
        } if setting else None,
        "triggers": [t.trigger_type for t in triggers],
        "rankings": rankings,
        "all_bids": [
            {
                "id": b.id,
                "supplier_id": b.supplier_id,
                "carrier_name": b.carrier_name,
                "total_amount": float(b.total_amount),
                "freight_charges": float(b.freight_charges),
                "origin_charges": float(b.origin_charges),
                "destination_charges": float(b.destination_charges),
                "transit_time": b.transit_time,
                "quote_validity": b.quote_validity,
                "submitted_at": iso_utc(b.submitted_at),
            }
            for b in all_bids
        ],
        "activities": [
            {
                "id": a.id,
                "activity_type": a.activity_type,
                "details": a.details,
                "created_at": iso_utc(a.created_at),
            }
            for a in activities
        ],
    }


@router.get("/{rfq_id}/activities", response_model=List[dict])
def get_auction_activities(
    rfq_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    activities = (
        db.query(AuctionActivity)
        .filter(AuctionActivity.rfq_id == rfq_id)
        .order_by(desc(AuctionActivity.created_at))
        .all()
    )
    return [
        {
            "id": a.id,
            "activity_type": a.activity_type,
            "details": a.details,
            "created_at": iso_utc(a.created_at),
        }
        for a in activities
    ]