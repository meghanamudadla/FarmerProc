from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Booking, Weighment, QualityCheck
from auth.dependencies import get_current_user

router = APIRouter(
    prefix="/msp",
    tags=["MSP"]
)


# Example MSP rates.
# Update these with the official rates required by your project.
MSP_RATES = {
    "paddy": 2369.0,
    "cotton": 7710.0,
    "maize": 2400.0,
    "wheat": 2585.0,
    "groundnut": 7263.0,
}


@router.get("/{booking_id}")
def calculate_msp(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id)
        .first()
    )

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    weighment = (
        db.query(Weighment)
        .filter(Weighment.booking_id == booking_id)
        .first()
    )

    if not weighment:
        raise HTTPException(
            status_code=400,
            detail="Weighment not found"
        )

    quality = (
        db.query(QualityCheck)
        .filter(QualityCheck.booking_id == booking_id)
        .first()
    )

    if not quality:
        raise HTTPException(
            status_code=400,
            detail="Quality check not found"
        )

    if quality.result != "ACCEPTED":
        raise HTTPException(
            status_code=400,
            detail="Rejected produce cannot be paid"
        )

    crop = booking.crop

    if not crop:
        raise HTTPException(
            status_code=400,
            detail="Crop not found for booking"
        )

    crop_name = crop.crop_name.lower().strip()

    msp_rate = MSP_RATES.get(crop_name)

    if msp_rate is None:
        raise HTTPException(
            status_code=400,
            detail=f"MSP rate not configured for {crop.crop_name}"
        )

    accepted_quintals = weighment.accepted_quintals

    base_amount = accepted_quintals * msp_rate

    quality_deduction = quality.quality_deduction

    final_amount = max(
        0,
        base_amount - quality_deduction
    )

    booking.price = final_amount
    booking.status = "PAYMENT_PROCESSING"

    db.commit()

    return {
        "booking_id": booking.id,
        "crop": crop.crop_name,
        "accepted_quintals": accepted_quintals,
        "msp_rate_per_quintal": msp_rate,
        "base_amount": base_amount,
        "quality_deduction": quality_deduction,
        "final_amount": final_amount,
        "status": booking.status
    }