from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.rfq import RFQ
from app.models.auction_activity import AuctionActivity
from app.utils.time import ensure_utc

router = APIRouter()


def iso_utc(value):
    return ensure_utc(value).isoformat() if value else None


@router.get("/", response_model=List[dict])
def list_recent_activity(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Recent activity for auctions the current user can see."""
    query = (
        db.query(AuctionActivity, RFQ)
        .join(RFQ, RFQ.id == AuctionActivity.rfq_id)
    )
    if current_user.role == "buyer":
        query = query.filter(RFQ.buyer_id == current_user.id)

    rows = (
        query.order_by(desc(AuctionActivity.created_at), desc(AuctionActivity.id))
        .limit(max(1, min(limit, 500)))
        .all()
    )

    return [
        {
            "id": activity.id,
            "rfq_id": rfq.id,
            "rfq_name": rfq.name,
            "reference_id": rfq.reference_id,
            "activity_type": activity.activity_type,
            "details": activity.details,
            "created_at": iso_utc(activity.created_at),
        }
        for activity, rfq in rows
    ]
