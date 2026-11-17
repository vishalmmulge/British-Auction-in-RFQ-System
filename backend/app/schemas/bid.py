from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict, field_serializer

from app.utils.time import ensure_utc


class BidBase(BaseModel):
    rfq_id: int
    carrier_name: str = Field(..., min_length=1, max_length=100)
    freight_charges: Decimal = Field(..., ge=0)
    origin_charges: Decimal = Field(..., ge=0)
    destination_charges: Decimal = Field(..., ge=0)
    transit_time: str = Field(..., min_length=1, max_length=100)
    quote_validity: str = Field(..., min_length=1, max_length=100)


class BidCreate(BidBase):
    pass


class BidRead(BidBase):
    id: int
    rfq_id: int
    carrier_name: Optional[str] = None
    supplier_id: int
    total_amount: Decimal
    submitted_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("submitted_at")
    def serialize_utc(self, value: datetime) -> Optional[str]:
        return ensure_utc(value).isoformat() if value else None