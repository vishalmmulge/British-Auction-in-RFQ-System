from pydantic import BaseModel, ConfigDict


class AuctionTriggerBase(BaseModel):
    trigger_type: str


class AuctionTriggerCreate(AuctionTriggerBase):
    pass


class AuctionTriggerRead(AuctionTriggerBase):
    id: int
    rfq_id: int

    model_config = ConfigDict(from_attributes=True)