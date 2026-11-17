from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy import JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class AuctionActivity(Base):
    __tablename__ = "auction_activity"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    rfq_id: Mapped[int] = mapped_column(ForeignKey("rfqs.id"), nullable=False, index=True)
    bid_id: Mapped[Optional[int]] = mapped_column(ForeignKey("bids.id"), nullable=True, index=True)
    actor_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    activity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)