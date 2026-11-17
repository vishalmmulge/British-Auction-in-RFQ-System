from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class AuctionTrigger(Base):
    __tablename__ = "auction_triggers"

    __table_args__ = (
        UniqueConstraint("rfq_id", "trigger_type", name="uq_auction_triggers_rfq_type"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    rfq_id: Mapped[int] = mapped_column(ForeignKey("rfqs.id"), nullable=False, index=True)
    trigger_type: Mapped[str] = mapped_column(String(50), nullable=False)