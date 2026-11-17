from datetime import datetime
from typing import Optional
from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class RFQStatus:
    DRAFT = "draft"
    ACTIVE = "active"
    CLOSED = "closed"
    FORCED_CLOSED = "forced_closed"
    CANCELLED = "cancelled"


class RFQ(Base):
    __tablename__ = "rfqs"

    __table_args__ = (
        CheckConstraint("bid_close_time > bid_start_time", name="chk_rfq_bid_close_after_start"),
        CheckConstraint("forced_close_time > bid_close_time", name="chk_rfq_forced_close_after_bid_close"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    reference_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    buyer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bid_start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    bid_close_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    forced_close_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    pickup_service_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(
        Enum(
            RFQStatus.DRAFT,
            RFQStatus.ACTIVE,
            RFQStatus.CLOSED,
            RFQStatus.FORCED_CLOSED,
            RFQStatus.CANCELLED,
            values_callable=lambda obj: [e for e in obj],
        ),
        default=RFQStatus.DRAFT,
        nullable=False,
        index=True,
    )
    current_close_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    extension_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )