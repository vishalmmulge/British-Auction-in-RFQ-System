from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_serializer
from typing import Optional, Any

from app.utils.time import ensure_utc


class AuctionActivityRead(BaseModel):
    id: int
    rfq_id: int
    bid_id: Optional[int]
    actor_id: Optional[int]
    activity_type: str
    details: Optional[Any]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at")
    def serialize_utc(self, value: datetime) -> Optional[str]:
        return ensure_utc(value).isoformat() if value else None
