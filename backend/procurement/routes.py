from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth.dependencies import require_role
from models import User
from database import get_db
from models import (
    Booking,
    Procurement,
    Weighment,
    QualityCheck
)
from schemas import ProcurementCreate, ProcurementResponse


router = APIRouter(
    prefix="/procurement",
    tags=["Procurement"]
)


# ---------------------------------------------------------
# CREATE PROCUREMENT
# ---------------------------------------------------------

@router.post("/", response_model=ProcurementResponse)
def create_procurement(
    procurement_data: ProcurementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("CENTER_OPERATOR")
    )
):

    booking = db.query(Booking).filter(
        Booking.id == procurement_data.booking_id
    ).first()

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    # Procurement should happen only after quality acceptance
    if booking.status not in ["ACCEPTED", "PAYMENT_PROCESSING"]:
        raise HTTPException(
        status_code=400,
        detail="Farmer must pass quality check before procurement"
        )

    # Check whether procurement already exists
    existing = db.query(Procurement).filter(
        Procurement.booking_id == procurement_data.booking_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Procurement already exists for this booking"
        )

    # Get weighing record
    weighment = db.query(Weighment).filter(
        Weighment.booking_id == booking.id
    ).first()

    if not weighment:
        raise HTTPException(
            status_code=400,
            detail="Weighment not found"
        )

    # Get quality record
    quality_check = db.query(QualityCheck).filter(
        QualityCheck.booking_id == booking.id
    ).first()

    if not quality_check:
        raise HTTPException(
            status_code=400,
            detail="Quality check not found"
        )

    if quality_check.result != "ACCEPTED":
        raise HTTPException(
            status_code=400,
            detail="Rejected produce cannot be procured"
        )

    accepted_quintals = weighment.accepted_quintals

    quality_deduction = quality_check.quality_deduction

    # Use the MSP amount already calculated in booking.price
    total_amount = booking.price

    if total_amount is None:
        raise HTTPException(
            status_code=400,
            detail="MSP calculation must be completed first"
        )

    # Convert MSP per quintal to price per kg
    msp_rate_per_quintal = (
        total_amount + quality_deduction
    ) / accepted_quintals

    price_per_kg = msp_rate_per_quintal / 100

    procurement = Procurement(
        booking_id=booking.id,
        crop=procurement_data.crop,
        quantity=weighment.net_weight_kg,
        quality=quality_check.grade,
        price_per_kg=price_per_kg,
        total_amount=total_amount,
        status="COMPLETED",
        accepted_quintals=accepted_quintals,
        quality_deduction=quality_deduction,
        msp_rate_per_quintal=msp_rate_per_quintal
    )

    db.add(procurement)

    booking.status = "PAYMENT_PROCESSING"

    db.commit()
    db.refresh(procurement)

    return procurement
# ---------------------------------------------------------
# GET PROCUREMENT BY BOOKING
# ---------------------------------------------------------

@router.get(
    "/booking/{booking_id}",
    response_model=ProcurementResponse
)
def get_procurement(
    booking_id: int,
    db: Session = Depends(get_db)
):

    procurement = db.query(Procurement).filter(
        Procurement.booking_id == booking_id
    ).first()

    if not procurement:
        raise HTTPException(
            status_code=404,
            detail="Procurement record not found"
        )

    return procurement