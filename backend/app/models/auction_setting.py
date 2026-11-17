from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class AuctionSetting(Base):
    __tablename__ = "auction_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    rfq_id: Mapped[int] = mapped_column(ForeignKey("rfqs.id"), unique=True, nullable=False, index=True)
    extension_window_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    extension_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    max_extensions: Mapped[int] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)