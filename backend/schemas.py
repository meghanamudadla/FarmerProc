from typing import Optional
from datetime import date, time, datetime

from pydantic import BaseModel, Field




class UserRegister(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=10, max_length=15)
    password: str = Field(min_length=6, max_length=72)
    village: Optional[str] = None
    district: Optional[str] = None
    land_area: Optional[float] = None


class UserLogin(BaseModel):
    phone: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str




class FarmerResponse(BaseModel):
    id: int
    farmer_id: str
    village: Optional[str] = None
    district: Optional[str] = None
    land_area: Optional[float] = None

    class Config:
        from_attributes = True




class CenterCreate(BaseModel):
    name: str
    location: Optional[str] = None
    district: Optional[str] = None
    capacity: int = 100


class CenterResponse(BaseModel):
    id: int
    name: str
    location: Optional[str] = None
    district: Optional[str] = None
    capacity: int

    class Config:
        from_attributes = True




class SlotCreate(BaseModel):
    center_id: int
    date: date
    start_time: time
    end_time: time
    capacity: int = 20


class SlotResponse(BaseModel):
    id: int
    center_id: int
    date: date
    start_time: time
    end_time: time
    capacity: int

    class Config:
        from_attributes = True




class BookingCreate(BaseModel):
    slot_id: int


class BookingResponse(BaseModel):
    id: int
    farmer_id: int
    slot_id: int
    token_number: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True



class ProcurementCreate(BaseModel):
    booking_id: int
    crop: str
    quantity: float
    quality: Optional[str] = None
    price_per_kg: Optional[float] = None


class ProcurementResponse(BaseModel):
    id: int
    booking_id: int
    crop: str
    quantity: float
    quality: Optional[str] = None
    price_per_kg: Optional[float] = None
    total_amount: Optional[float] = None
    status: str

    class Config:
        from_attributes = True




class PaymentCreate(BaseModel):
    procurement_id: int
    amount: float


class PaymentResponse(BaseModel):
    id: int
    procurement_id: int
    amount: float
    transaction_id: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True