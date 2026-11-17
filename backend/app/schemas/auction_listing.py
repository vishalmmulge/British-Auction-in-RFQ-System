from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, field_serializer
from typing import Optional

from app.utils.time import ensure_utc


class AuctionListingItem(BaseModel):
    rfq_id: int
    reference_id: str
    name: str
    status: str
    lowest_bid: Optional[Decimal]
    current_closing_time: datetime
    forced_closing_time: datetime
    buyer_id: int

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("current_closing_time", "forced_closing_time")
    def serialize_utc(self, value: datetime) -> Optional[str]:
        return ensure_utc(value).isoformat() if value else None
