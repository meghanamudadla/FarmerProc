from datetime import datetime, date, time

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Date,
    Time,
    DateTime,
    ForeignKey,
    Boolean
)

from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(15), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="FARMER", nullable=False)

    farmer = relationship(
        "Farmer",
        back_populates="user",
        uselist=False
    )
    notifications = relationship(
    "Notification",
    back_populates="user",
    cascade="all, delete-orphan"
)



class Farmer(Base):
    __tablename__ = "farmers"

    id = Column(Integer, primary_key=True, index=True)

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

    village = Column(String(100))
    district = Column(String(100))
    land_area = Column(Float)

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



class ProcurementCenter(Base):
    __tablename__ = "procurement_centers"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(
        String(150),
        nullable=False
    )

    location = Column(String(255))
    district = Column(String(100))
    capacity = Column(Integer, default=100)

    slots = relationship(
        "Slot",
        back_populates="center"
    )




class Slot(Base):
    __tablename__ = "slots"

    id = Column(Integer, primary_key=True, index=True)

    center_id = Column(
        Integer,
        ForeignKey("procurement_centers.id"),
        nullable=False
    )

    date = Column(Date, nullable=False)

    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    capacity = Column(Integer, default=20)

    center = relationship(
        "ProcurementCenter",
        back_populates="slots"
    )

    bookings = relationship(
        "Booking",
        back_populates="slot"
    )




class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)

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

    token_number = Column(String(30), unique=True, nullable=False, index=True)

    quantity = Column(Float, nullable=False)

    booking_date = Column(Date, nullable=False)

    slot_id = Column(
        Integer,
        ForeignKey("slots.id"),
        nullable=True
    )

    status = Column(
        String(40),
        default="booked",
        nullable=False
    )

    price = Column(Float, nullable=True)

    payment_status = Column(
        String(40),
        default="pending",
        nullable=False
    )

    payment_method = Column(String(50), nullable=True)

    checked_in = Column(
        Boolean,
        default=False,
        nullable=False
    )

    arrival_time = Column(DateTime, nullable=True)

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    farmer = relationship("Farmer")
    center = relationship("ProcurementCenter")
    crop = relationship("Crop")
    slot = relationship("Slot")



class Procurement(Base):
    __tablename__ = "procurements"

    id = Column(Integer, primary_key=True, index=True)

    booking_id = Column(
        Integer,
        ForeignKey("bookings.id"),
        unique=True,
        nullable=False
    )

    crop = Column(
        String(100),
        nullable=False
    )

    quantity = Column(
        Float,
        nullable=False
    )

    quality = Column(String(50))

    price_per_kg = Column(Float)

    total_amount = Column(Float)

    status = Column(
        String(30),
        default="PENDING"
    )

    booking = relationship(
        "Booking",
        back_populates="procurement"
    )

    payment = relationship(
        "Payment",
        back_populates="procurement",
        uselist=False
    )



class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)

    procurement_id = Column(
        Integer,
        ForeignKey("procurements.id"),
        unique=True,
        nullable=False
    )

    amount = Column(
        Float,
        nullable=False
    )

    transaction_id = Column(
        String(100)
    )

    status = Column(
        String(30),
        default="PENDING"
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    procurement = relationship(
        "Procurement",
        back_populates="payment"
    )

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)

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


class Crop(Base):
    __tablename__ = "crops"

    id = Column(Integer, primary_key=True, index=True)

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

class Weighment(Base):
    __tablename__ = "weighments"

    id = Column(Integer, primary_key=True, index=True)

    booking_id = Column(
        Integer,
        ForeignKey("bookings.id"),
        nullable=False,
        unique=True,
        index=True
    )

    declared_bags = Column(Integer, nullable=True)
    bag_weight_kg = Column(Float, nullable=True)
    declared_weight_kg = Column(Float, nullable=True)

    weighed_bags = Column(Integer, nullable=False)
    gross_weight_kg = Column(Float, nullable=False)
    tare_weight_kg = Column(Float, nullable=False)
    net_weight_kg = Column(Float, nullable=False)

    accepted_weight_kg = Column(Float, nullable=False)
    accepted_quintals = Column(Float, nullable=False)

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    booking = relationship("Booking")