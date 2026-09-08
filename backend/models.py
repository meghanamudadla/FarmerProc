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
    Text
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
        nullable=False
    )

    slot_id = Column(
        Integer,
        ForeignKey("slots.id"),
        nullable=False
    )

    token_number = Column(
        Integer,
        nullable=False
    )

    status = Column(
        String(30),
        default="BOOKED",
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    farmer = relationship(
        "Farmer",
        back_populates="bookings"
    )

    slot = relationship(
        "Slot",
        back_populates="bookings"
    )

    procurement = relationship(
        "Procurement",
        back_populates="booking",
        uselist=False
    )



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