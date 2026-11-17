from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timezone

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.rfq import RFQ, RFQStatus
from app.models.auction_setting import AuctionSetting
from app.models.auction_trigger import AuctionTrigger
from app.schemas.rfq import RFQCreate, RFQRead, RFQUpdate
from app.schemas.auction_setting import AuctionSettingCreate, AuctionSettingRead
from app.utils.time import now_utc

router = APIRouter()


def require_buyer(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "buyer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Buyer role required")
    return current_user


@router.post("/", response_model=RFQRead, status_code=status.HTTP_201_CREATED)
def create_rfq(
    rfq_in: RFQCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_buyer),
):
    existing = db.query(RFQ).filter(RFQ.reference_id == rfq_in.reference_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Reference ID already exists")

    db_rfq = RFQ(
        reference_id=rfq_in.reference_id,
        buyer_id=current_user.id,
        name=rfq_in.name,
        description=rfq_in.description,
        bid_start_time=rfq_in.bid_start_time,
        bid_close_time=rfq_in.bid_close_time,
        forced_close_time=rfq_in.forced_close_time,
        pickup_service_date=rfq_in.pickup_service_date,
        status=RFQStatus.DRAFT,
        current_close_time=rfq_in.bid_close_time,
    )
    db.add(db_rfq)
    db.commit()
    db.refresh(db_rfq)
    return db_rfq


@router.get("/", response_model=List[RFQRead])
def list_rfq(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
):
    query = db.query(RFQ)
    if current_user.role == "supplier":
        query = query.filter(RFQ.status == RFQStatus.ACTIVE)
    else:
        query = query.filter(RFQ.buyer_id == current_user.id)
    return query.offset(skip).limit(limit).all()


@router.get("/{rfq_id}", response_model=RFQRead)
def get_rfq(
    rfq_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    if current_user.role == "buyer" and rfq.buyer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this RFQ")
    return rfq


@router.patch("/{rfq_id}", response_model=RFQRead)
def update_rfq(
    rfq_id: int,
    rfq_in: RFQUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_buyer),
):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    if rfq.buyer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this RFQ")
    if rfq.status != RFQStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Can only update draft RFQs")

    update_data = rfq_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(rfq, field, value)

    if "bid_start_time" in update_data or "bid_close_time" in update_data:
        if rfq.bid_close_time <= rfq.bid_start_time:
            raise HTTPException(status_code=400, detail="bid_close_time must be later than bid_start_time")
    if "forced_close_time" in update_data or "bid_close_time" in update_data:
        if rfq.forced_close_time <= rfq.bid_close_time:
            raise HTTPException(status_code=400, detail="forced_close_time must be later than bid_close_time")

    db.commit()
    db.refresh(rfq)
    return rfq


@router.post("/{rfq_id}/settings", response_model=AuctionSettingRead)
def configure_auction_settings(
    rfq_id: int,
    settings_in: AuctionSettingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_buyer),
):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    if rfq.buyer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if rfq.status != RFQStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Can only configure settings for draft RFQs")

    existing = db.query(AuctionSetting).filter(AuctionSetting.rfq_id == rfq_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Auction settings already configured")

    db_setting = AuctionSetting(
        rfq_id=rfq_id,
        extension_window_minutes=settings_in.extension_window_minutes,
        extension_duration_minutes=settings_in.extension_duration_minutes,
        max_extensions=settings_in.max_extensions,
    )
    db.add(db_setting)
    db.commit()
    db.refresh(db_setting)
    return db_setting


@router.post("/{rfq_id}/triggers", response_model=dict)
def configure_triggers(
    rfq_id: int,
    trigger_types: List[str] = Body(..., embed=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_buyer),
):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    if rfq.buyer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if rfq.status != RFQStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Can only configure triggers for draft RFQs")
    if len(set(trigger_types)) != len(trigger_types):
        raise HTTPException(status_code=400, detail="Duplicate trigger types are not allowed")

    from app.models.auction_trigger import AuctionTrigger

    valid_types = {"last_bid", "rank_change", "l1_change"}
    for t in trigger_types:
        if t not in valid_types:
            raise HTTPException(status_code=400, detail=f"Invalid trigger type: {t}")

    db.query(AuctionTrigger).filter(AuctionTrigger.rfq_id == rfq_id).delete()

    for t in trigger_types:
        db.add(AuctionTrigger(rfq_id=rfq_id, trigger_type=t))

    db.commit()
    return {"rfq_id": rfq_id, "triggers": trigger_types}


@router.post("/{rfq_id}/start")
def start_auction(
    rfq_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_buyer),
):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    if rfq.buyer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if rfq.status != RFQStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only draft RFQs can be started")

    settings = db.query(AuctionSetting).filter(AuctionSetting.rfq_id == rfq_id).first()
    if not settings:
        raise HTTPException(status_code=400, detail="Auction settings must be configured before starting")

    rfq.status = RFQStatus.ACTIVE
    rfq.current_close_time = rfq.bid_close_time
    db.commit()
    return {"rfq_id": rfq_id, "status": rfq.status, "current_close_time": rfq.current_close_time}


@router.post("/{rfq_id}/close")
def force_close_auction(
    rfq_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_buyer),
):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    if rfq.buyer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    rfq.status = RFQStatus.FORCED_CLOSED
    db.commit()
    return {"rfq_id": rfq_id, "status": rfq.status}