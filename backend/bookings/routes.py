from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from task_queue.manager import manager
from database import get_db
from models import Booking, Slot, User, Farmer
from schemas import BookingCreate, BookingResponse
from auth.dependencies import get_current_user
from notifications.service import create_notification

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

    # 3. Check if farmer already booked this slot
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

    # 4. Count existing bookings
    booking_count = db.query(
        func.count(Booking.id)
    ).filter(
        Booking.slot_id == slot.id,
        Booking.status != "CANCELLED"
    ).scalar()

    # 5. Check capacity
    if booking_count >= slot.capacity:
        raise HTTPException(
            status_code=400,
            detail="This slot is full"
        )

    # 6. Generate next token
    last_booking = db.query(Booking).filter(
        Booking.slot_id == slot.id
    ).order_by(
        Booking.token_number.desc()
    ).first()

    if last_booking:
        token_number = last_booking.token_number + 1
    else:
        token_number = 1

    # 7. Create booking
    booking = Booking(
        farmer_id=farmer.id,
        slot_id=slot.id,
        token_number=token_number,
        status="BOOKED"
    )

    db.add(booking)
    db.commit()
    db.refresh(booking)

    # Create a notification for the farmer
    create_notification(
        db=db,
        user_id=farmer.user_id,
        title="Booking Created",
        message=f"Your booking is confirmed. Your token number is {booking.token_number}."
    )

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