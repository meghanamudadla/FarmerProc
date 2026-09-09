from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    Date,
    DateTime,
    Time,
    ForeignKey
)
from sqlalchemy.orm import relationship

from database import Base


# ============================================================
# USER
# ============================================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(
        String(100),
        nullable=False
    )

    phone = Column(
        String(15),
        unique=True,
        nullable=False,
        index=True
    )

    hashed_password = Column(
        String(255),
        nullable=False
    )

    role = Column(
        String(20),
        default="FARMER",
        nullable=False
    )

    farmer = relationship(
        "Farmer",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )

    notifications = relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan"
    )


# ============================================================
# FARMER
# ============================================================

class Farmer(Base):
    __tablename__ = "farmers"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        unique=True,
        nullable=False
    )

    farmer_id = Column(
        String(50),
        unique=True,
        nullable=False
    )

    village = Column(
        String(100),
        nullable=True
    )

    district = Column(
        String(100),
        nullable=True
    )

    land_area = Column(
        Float,
        nullable=True
    )

    user = relationship(
        "User",
        back_populates="farmer"
    )

    bookings = relationship(
        "Booking",
        back_populates="farmer"
    )

    crops = relationship(
        "Crop",
        back_populates="farmer",
        cascade="all, delete-orphan"
    )


# ============================================================
# PROCUREMENT CENTER
# ============================================================

class ProcurementCenter(Base):
    __tablename__ = "procurement_centers"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(150),
        nullable=False
    )

    location = Column(
        String(255),
        nullable=True
    )

    district = Column(
        String(100),
        nullable=True
    )

    capacity = Column(
        Integer,
        default=100,
        nullable=False
    )

    slots = relationship(
        "Slot",
        back_populates="center",
        cascade="all, delete-orphan"
    )

    bookings = relationship(
        "Booking",
        back_populates="center"
    )


# ============================================================
# SLOT
# ============================================================

class Slot(Base):
    __tablename__ = "slots"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    center_id = Column(
        Integer,
        ForeignKey("procurement_centers.id"),
        nullable=False,
        index=True
    )

    date = Column(
        Date,
        nullable=False
    )

    start_time = Column(
        Time,
        nullable=False
    )

    end_time = Column(
        Time,
        nullable=False
    )

    capacity = Column(
        Integer,
        default=20,
        nullable=False
    )

    center = relationship(
        "ProcurementCenter",
        back_populates="slots"
    )

    bookings = relationship(
        "Booking",
        back_populates="slot"
    )


# ============================================================
# BOOKING
# ============================================================

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    farmer_id = Column(
        Integer,
        ForeignKey("farmers.id"),
        nullable=False,
        index=True
    )

    center_id = Column(
        Integer,
        ForeignKey("procurement_centers.id"),
        nullable=False,
        index=True
    )

    crop_id = Column(
        Integer,
        ForeignKey("crops.id"),
        nullable=True,
        index=True
    )

    token_number = Column(
        String(30),
        unique=True,
        nullable=False,
        index=True
    )

    quantity = Column(
        Float,
        nullable=False
    )

    booking_date = Column(
        Date,
        nullable=False
    )

    slot_id = Column(
        Integer,
        ForeignKey("slots.id"),
        nullable=True,
        index=True
    )

    status = Column(
        String(40),
        default="booked",
        nullable=False
    )

    price = Column(
        Float,
        nullable=True
    )

    payment_status = Column(
        String(40),
        default="pending",
        nullable=False
    )

    payment_method = Column(
        String(50),
        nullable=True
    )

    checked_in = Column(
        Boolean,
        default=False,
        nullable=False
    )

    arrival_time = Column(
        DateTime,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    farmer = relationship(
        "Farmer",
        back_populates="bookings"
    )

    center = relationship(
        "ProcurementCenter",
        back_populates="bookings"
    )

    crop = relationship(
        "Crop",
        back_populates="bookings"
    )

    slot = relationship(
        "Slot",
        back_populates="bookings"
    )

    weighment = relationship(
        "Weighment",
        back_populates="booking",
        uselist=False,
        cascade="all, delete-orphan"
    )

    quality_check = relationship(
        "QualityCheck",
        back_populates="booking",
        uselist=False,
        cascade="all, delete-orphan"
    )


# ============================================================
# PROCUREMENT
# ============================================================

class Procurement(Base):
    __tablename__ = "procurements"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    booking_id = Column(
        Integer,
        ForeignKey("bookings.id"),
        nullable=False,
        index=True
    )

    crop = Column(
        String(100),
        nullable=False
    )

    quantity = Column(
        Float,
        nullable=False
    )

    quality = Column(
        String(50),
        nullable=True
    )

    price_per_kg = Column(
        Float,
        nullable=True
    )

    total_amount = Column(
        Float,
        nullable=True
    )

    status = Column(
        String(50),
        default="RECORDED",
        nullable=False
    )

    accepted_quintals = Column(
        Float,
        nullable=True
    )

    quality_deduction = Column(
        Float,
        default=0,
        nullable=False
    )

    msp_rate_per_quintal = Column(
        Float,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    booking = relationship(
        "Booking"
    )

    payment = relationship(
        "Payment",
        back_populates="procurement",
        uselist=False,
        cascade="all, delete-orphan"
    )


# ============================================================
# PAYMENT
# ============================================================

class Payment(Base):
    __tablename__ = "payments"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    procurement_id = Column(
        Integer,
        ForeignKey("procurements.id"),
        unique=True,
        nullable=False,
        index=True
    )

    amount = Column(
        Float,
        nullable=False
    )

    transaction_id = Column(
        String(100),
        nullable=True
    )

    status = Column(
        String(30),
        default="PENDING",
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    procurement = relationship(
        "Procurement",
        back_populates="payment"
    )


# ============================================================
# NOTIFICATION
# ============================================================

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    title = Column(
        String(150),
        nullable=False
    )

    message = Column(
        String(500),
        nullable=False
    )

    is_read = Column(
        Boolean,
        default=False,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    user = relationship(
        "User",
        back_populates="notifications"
    )


# ============================================================
# CROP
# ============================================================

class Crop(Base):
    __tablename__ = "crops"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    farmer_id = Column(
        Integer,
        ForeignKey("farmers.id"),
        nullable=False,
        index=True
    )

    crop_name = Column(
        String(100),
        nullable=False
    )

    variety = Column(
        String(100),
        nullable=True
    )

    season = Column(
        String(50),
        nullable=True
    )

    quantity = Column(
        Float,
        nullable=False
    )

    remaining_quantity = Column(
        Float,
        nullable=False
    )

    status = Column(
        String(30),
        default="REGISTERED",
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    farmer = relationship(
        "Farmer",
        back_populates="crops"
    )

    bookings = relationship(
        "Booking",
        back_populates="crop"
    )


# ============================================================
# WEIGHMENT
# ============================================================

class Weighment(Base):
    __tablename__ = "weighments"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    booking_id = Column(
        Integer,
        ForeignKey("bookings.id"),
        nullable=False,
        unique=True,
        index=True
    )

    declared_bags = Column(
        Integer,
        nullable=True
    )

    bag_weight_kg = Column(
        Float,
        nullable=True
    )

    declared_weight_kg = Column(
        Float,
        nullable=True
    )

    weighed_bags = Column(
        Integer,
        nullable=False
    )

    gross_weight_kg = Column(
        Float,
        nullable=False
    )

    tare_weight_kg = Column(
        Float,
        nullable=False
    )

    net_weight_kg = Column(
        Float,
        nullable=False
    )

    accepted_weight_kg = Column(
        Float,
        nullable=False
    )

    accepted_quintals = Column(
        Float,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    booking = relationship(
        "Booking",
        back_populates="weighment"
    )


# ============================================================
# QUALITY CHECK
# ============================================================

class QualityCheck(Base):
    __tablename__ = "quality_checks"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    booking_id = Column(
        Integer,
        ForeignKey("bookings.id"),
        nullable=False,
        unique=True,
        index=True
    )

    moisture_percent = Column(
        Float,
        nullable=False
    )

    foreign_matter_percent = Column(
        Float,
        nullable=False
    )

    damaged_grains_percent = Column(
        Float,
        nullable=False
    )

    slightly_damaged_percent = Column(
        Float,
        nullable=False
    )

    shrivelled_broken_percent = Column(
        Float,
        nullable=False
    )

    other_grains_percent = Column(
        Float,
        nullable=False
    )

    weevilled_grains_percent = Column(
        Float,
        nullable=False
    )

    grade = Column(
        String(30),
        nullable=True
    )

    result = Column(
        String(30),
        nullable=False
    )

    rejection_reason = Column(
        String(255),
        nullable=True
    )

    recommendation = Column(
        String(255),
        nullable=True
    )

    quality_deduction = Column(
        Float,
        default=0,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    booking = relationship(
        "Booking",
        back_populates="quality_check"
    )