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
    capacity: int = Field(default=20, gt=0, le=500)


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
    center_id: int
    crop_id: int
    quantity: float = Field(gt=0)
    booking_date: date
    slot_id: int


class BookingResponse(BaseModel):
    id: int
    farmer_id: int
    center_id: int
    crop_id: Optional[int] = None

    token_number: str

    quantity: float
    booking_date: date
    slot_id: Optional[int] = None

    status: str

    price: Optional[float] = None

    payment_status: str
    payment_method: Optional[str] = None

    checked_in: bool
    arrival_time: Optional[datetime] = None

    created_at: datetime

    class Config:
        from_attributes = True



class ProcurementCreate(BaseModel):
    booking_id: int
    crop: str
    quantity: float = Field(gt=0)
    quality: Optional[str] = None
    price_per_kg: Optional[float] = Field(default=None, ge=0)


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

class QueueBookingResponse(BaseModel):
    id: int
    token_number: int
    farmer_id: int
    farmer_name: str
    slot_id: int
    status: str
    slot_date: date
    start_time: time
    end_time: time


class QueueResponse(BaseModel):
    center_id: int
    currently_serving: Optional[QueueBookingResponse] = None
    waiting: list[QueueBookingResponse]

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CropCreate(BaseModel):
    crop_name: str
    variety: Optional[str] = None
    season: Optional[str] = None
    quantity: float = Field(gt=0)


class CropResponse(BaseModel):
    id: int
    farmer_id: int
    crop_name: str
    variety: Optional[str] = None
    season: Optional[str] = None
    quantity: float
    remaining_quantity: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class WeighmentCreate(BaseModel):
    declared_bags: Optional[int] = None
    bag_weight_kg: Optional[float] = None
    declared_weight_kg: Optional[float] = None

    weighed_bags: int = Field(gt=0)
    gross_weight_kg: float = Field(gt=0)
    tare_weight_kg: float = Field(ge=0)

class WeighmentResponse(BaseModel):
    id: int
    booking_id: int

    declared_bags: Optional[int] = None
    bag_weight_kg: Optional[float] = None
    declared_weight_kg: Optional[float] = None

    weighed_bags: int
    gross_weight_kg: float
    tare_weight_kg: float
    net_weight_kg: float

    accepted_weight_kg: float
    accepted_quintals: float

    created_at: datetime

    class Config:
        from_attributes = True



class QualityCheckCreate(BaseModel):
    moisture_percent: float = Field(ge=0)
    foreign_matter_percent: float = Field(ge=0)
    damaged_grains_percent: float = Field(ge=0)
    slightly_damaged_percent: float = Field(ge=0)
    shrivelled_broken_percent: float = Field(ge=0)
    other_grains_percent: float = Field(ge=0)
    weevilled_grains_percent: float = Field(ge=0)


class QualityCheckResponse(BaseModel):
    id: int
    booking_id: int

    moisture_percent: float
    foreign_matter_percent: float
    damaged_grains_percent: float
    slightly_damaged_percent: float
    shrivelled_broken_percent: float
    other_grains_percent: float
    weevilled_grains_percent: float

    grade: Optional[str] = None
    result: str
    rejection_reason: Optional[str] = None
    recommendation: Optional[str] = None
    quality_deduction: float
    created_at: datetime

    class Config:
        from_attributes = True