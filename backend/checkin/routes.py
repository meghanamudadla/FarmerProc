from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Booking
from auth.dependencies import get_current_user


router = APIRouter(
    prefix="/checkin",
    tags=["Check-in"]
)


@router.post("/{token}")
def check_in_farmer(
    token: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    booking = (
        db.query(Booking)
        .filter(Booking.token_number == token)
        .first()
    )

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking token not found"
        )

    if booking.checked_in:
        raise HTTPException(
            status_code=400,
            detail="Farmer already checked in"
        )

    booking.checked_in = True
    booking.arrival_time = datetime.utcnow()
    booking.status = "ARRIVED"

    db.commit()
    db.refresh(booking)

    return {
        "message": "Farmer checked in successfully",
        "token_number": booking.token_number,
        "booking_id": booking.id,
        "checked_in": booking.checked_in,
        "arrival_time": booking.arrival_time,
        "status": booking.status
    }