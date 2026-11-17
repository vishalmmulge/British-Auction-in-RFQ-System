from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Bid(Base):
    __tablename__ = "bids"

    __table_args__ = (
        CheckConstraint("freight_charges >= 0", name="chk_bid_freight_non_negative"),
        CheckConstraint("origin_charges >= 0", name="chk_bid_origin_non_negative"),
        CheckConstraint("destination_charges >= 0", name="chk_bid_destination_non_negative"),
        Index("ix_bids_rfq_supplier_submitted", "rfq_id", "supplier_id", "submitted_at"),
        Index("ix_bids_rfq_total", "rfq_id", "total_amount"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    rfq_id: Mapped[int] = mapped_column(ForeignKey("rfqs.id"), nullable=False, index=True)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    carrier_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    freight_charges: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    origin_charges: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    destination_charges: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    transit_time: Mapped[str] = mapped_column(String(100), nullable=False)
    quote_validity: Mapped[str] = mapped_column(String(100), nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)