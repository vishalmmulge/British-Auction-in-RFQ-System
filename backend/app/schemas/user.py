from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    username: str
    role: str = "supplier"


class UserCreate(UserBase):
    password: str


class UserRead(UserBase):
    id: int
    is_active: bool

    model_config = {"from_attributes": True}


class UserLogin(BaseModel):
    username: str
    password: str