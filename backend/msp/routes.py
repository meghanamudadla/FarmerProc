from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Booking, Weighment, QualityCheck
from auth.dependencies import get_current_user

router = APIRouter(
    prefix="/msp",
    tags=["MSP"]
)

# Official MSP rates (₹/quintal)
MSP_RATES = {
    "paddy": 2369.0,
    "cotton": 7710.0,
    "maize": 2400.0,
    "wheat": 2585.0,
    "groundnut": 7263.0,
    "soybean": 4892.0,
    "sunflower": 6760.0,
    "jowar": 3180.0,
    "bajra": 2500.0,
    "ragi": 4290.0,
    "chickpea": 5440.0,
    "mustard": 5650.0,
}


def lookup_msp_rate(crop_name: str) -> float:
    normalized = crop_name.lower().strip()
    # 1. Exact match
    if normalized in MSP_RATES:
        return MSP_RATES[normalized]
    # 2. Substring match (e.g. "paddy (grade a)" matches "paddy")
    for key, rate in MSP_RATES.items():
        if key in normalized:
            return rate
    # 3. Fallback standard MSP
    return 2300.0


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
            detail="Weighment not found for this booking"
        )

    quality = (
        db.query(QualityCheck)
        .filter(QualityCheck.booking_id == booking_id)
        .first()
    )

    if not quality:
        raise HTTPException(
            status_code=400,
            detail="Quality check not found for this booking"
        )

    if quality.result != "ACCEPTED":
        raise HTTPException(
            status_code=400,
            detail="Rejected produce cannot be processed for payout"
        )

    crop_name = booking.crop.crop_name if booking.crop else "Paddy (Grade A)"
    msp_rate = lookup_msp_rate(crop_name)

    accepted_quintals = weighment.accepted_quintals
    base_amount = round(accepted_quintals * msp_rate, 2)
    quality_deduction = round(quality.quality_deduction, 2)
    final_amount = max(0.0, round(base_amount - quality_deduction, 2))

    booking.price = final_amount
    booking.status = "PAYMENT_PROCESSING"

    db.commit()

    return {
        "booking_id": booking.id,
        "crop": crop_name,
        "accepted_quintals": accepted_quintals,
        "msp_rate_per_quintal": msp_rate,
        "base_amount": base_amount,
        "quality_deduction": quality_deduction,
        "final_amount": final_amount,
        "status": booking.status
    }