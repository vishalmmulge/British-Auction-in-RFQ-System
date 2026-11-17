from datetime import datetime
from pydantic import BaseModel, Field, model_validator, field_serializer
from typing import Optional

from app.utils.time import ensure_utc


DATETIME_FIELDS = (
    "bid_start_time",
    "bid_close_time",
    "forced_close_time",
    "pickup_service_date",
    "current_close_time",
    "created_at",
    "updated_at",
)


class RFQBase(BaseModel):
    reference_id: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    bid_start_time: datetime
    bid_close_time: datetime
    forced_close_time: datetime
    pickup_service_date: datetime

    @model_validator(mode="after")
    def validate_times(self) -> "RFQBase":
        if self.bid_close_time <= self.bid_start_time:
            raise ValueError("bid_close_time must be later than bid_start_time")
        if self.forced_close_time <= self.bid_close_time:
            raise ValueError("forced_close_time must be later than bid_close_time")
        return self


class RFQCreate(RFQBase):
    pass


class RFQUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    bid_start_time: Optional[datetime] = None
    bid_close_time: Optional[datetime] = None
    forced_close_time: Optional[datetime] = None
    pickup_service_date: Optional[datetime] = None


class RFQRead(RFQBase):
    id: int
    buyer_id: int
    status: str
    current_close_time: datetime
    extension_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_serializer(*DATETIME_FIELDS)
    def serialize_utc(self, value: datetime) -> Optional[str]:
        return ensure_utc(value).isoformat() if value else None