from pydantic import BaseModel, Field, ConfigDict
from typing import Optional


class AuctionSettingBase(BaseModel):
    extension_window_minutes: int = Field(..., gt=0)
    extension_duration_minutes: int = Field(..., gt=0)
    max_extensions: Optional[int] = Field(default=None, ge=0)


class AuctionSettingCreate(AuctionSettingBase):
    pass


class AuctionSettingUpdate(BaseModel):
    extension_window_minutes: Optional[int] = Field(default=None, gt=0)
    extension_duration_minutes: Optional[int] = Field(default=None, gt=0)
    max_extensions: Optional[int] = Field(default=None, ge=0)


class AuctionSettingRead(AuctionSettingBase):
    id: int
    rfq_id: int
    max_extensions: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)