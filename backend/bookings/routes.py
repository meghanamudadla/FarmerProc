from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from task_queue.manager import manager
from database import get_db
from models import Booking, Slot, User, Farmer, Crop
from schemas import BookingCreate, BookingResponse
from auth.dependencies import get_current_user
from notifications.service import create_notification

import secrets


def generate_token():
    return "PDC-" + secrets.token_hex(3).upper()


router = APIRouter(
    prefix="/bookings",
    tags=["Bookings"]
)


# =========================
# CREATE BOOKING
# =========================

@router.post("/", response_model=BookingResponse)
async def create_booking(
    booking_data: BookingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    # 1. Find farmer
    farmer = db.query(Farmer).filter(
        Farmer.user_id == current_user.id
    ).first()

    if not farmer:
        raise HTTPException(
            status_code=404,
            detail="Farmer profile not found"
        )

    # 2. Find slot
    slot = db.query(Slot).filter(
        Slot.id == booking_data.slot_id
    ).first()

    if not slot:
        raise HTTPException(
            status_code=404,
            detail="Slot not found"
        )

    # 3. Make sure the slot belongs to the selected center
    if slot.center_id != booking_data.center_id:
        raise HTTPException(
            status_code=400,
            detail="Selected slot does not belong to the selected center"
        )

    # 4. Check if farmer already booked this slot
    existing_booking = db.query(Booking).filter(
        Booking.farmer_id == farmer.id,
        Booking.slot_id == slot.id,
        Booking.status != "CANCELLED"
    ).first()

    if existing_booking:
        raise HTTPException(
            status_code=400,
            detail="You have already booked this slot"
        )

    # 5. Count existing bookings
    booking_count = db.query(
        func.count(Booking.id)
    ).filter(
        Booking.slot_id == slot.id,
        Booking.status != "CANCELLED"
    ).scalar()

    # 6. Check slot capacity
    if booking_count >= slot.capacity:
        raise HTTPException(
            status_code=400,
            detail="This slot is full"
        )

    # 7. Create booking
    booking = Booking(
        farmer_id=farmer.id,
        center_id=booking_data.center_id,
        crop_id=booking_data.crop_id,
        quantity=booking_data.quantity,
        booking_date=booking_data.booking_date,
        slot_id=booking_data.slot_id,
        token_number=generate_token(),
        status="BOOKED",
        payment_status="PENDING",
        checked_in=False
    )

    # 8. Update crop quantity
    if booking.crop_id:
        crop = db.query(Crop).filter(
            Crop.id == booking.crop_id,
            Crop.farmer_id == farmer.id
        ).first()

        if not crop:
            raise HTTPException(
                status_code=404,
                detail="Crop not found for this farmer"
            )

        if crop.remaining_quantity < booking.quantity:
            raise HTTPException(
                status_code=400,
                detail="Booking quantity exceeds remaining crop quantity"
            )

        crop.remaining_quantity -= booking.quantity

        if crop.remaining_quantity <= 0:
            crop.remaining_quantity = 0
            crop.status = "COMPLETED"

    # 9. Save booking
    db.add(booking)
    db.commit()
    db.refresh(booking)

    # 10. Create notification for farmer
    create_notification(
        db=db,
        user_id=farmer.user_id,
        title="Booking Created",
        message=(
            f"Your booking is confirmed. "
            f"Your token number is {booking.token_number}."
        )
    )

    # 11. Notify connected center clients
    await manager.broadcast(
        slot.center_id,
        {
            "event": "NEW_BOOKING",
            "booking_id": booking.id,
            "token_number": booking.token_number,
            "farmer_id": farmer.id,
            "status": booking.status
        }
    )

    return booking


# =========================
# GET MY BOOKINGS
# =========================

@router.get("/my", response_model=list[BookingResponse])
def get_my_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    farmer = db.query(Farmer).filter(
        Farmer.user_id == current_user.id
    ).first()

    if not farmer:
        raise HTTPException(
            status_code=404,
            detail="Farmer profile not found"
        )

    bookings = db.query(Booking).filter(
        Booking.farmer_id == farmer.id
    ).order_by(
        Booking.created_at.desc()
    ).all()

    return bookings


# =========================
# GET SINGLE BOOKING
# =========================

@router.get("/{booking_id}", response_model=BookingResponse)
def get_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    farmer = db.query(Farmer).filter(
        Farmer.user_id == current_user.id
    ).first()

    if not farmer:
        raise HTTPException(
            status_code=404,
            detail="Farmer profile not found"
        )

    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.farmer_id == farmer.id
    ).first()

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    return booking