from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Booking, QualityCheck
from schemas import QualityCheckCreate, QualityCheckResponse
from auth.dependencies import get_current_user


router = APIRouter(
    prefix="/quality",
    tags=["Quality Check"]
)


@router.post(
    "/{booking_id}",
    response_model=QualityCheckResponse
)
def record_quality(
    booking_id: int,
    data: QualityCheckCreate,
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

    existing = (
        db.query(QualityCheck)
        .filter(QualityCheck.booking_id == booking_id)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Quality check already recorded"
        )

    rejection_reason = None
    recommendation = None
    result = "ACCEPTED"
    grade = "GRADE_A"
    deduction = 0.0

    if data.moisture_percent > 14:
        result = "REJECTED"
        rejection_reason = "Moisture exceeds 14%"
        recommendation = "Dry the produce and bring it again"

    elif data.foreign_matter_percent > 2:
        result = "REJECTED"
        rejection_reason = "Foreign matter exceeds 2%"
        recommendation = "Clean the produce before procurement"

    elif data.damaged_grains_percent > 4:
        result = "REJECTED"
        rejection_reason = "Damaged grains exceed 4%"
        recommendation = "Improve grain quality"

    elif data.slightly_damaged_percent > 4:
        result = "REJECTED"
        rejection_reason = "Slightly damaged grains exceed 4%"

    elif data.shrivelled_broken_percent > 6:
        result = "REJECTED"
        rejection_reason = "Shrivelled/broken grains exceed 6%"

    elif data.other_grains_percent > 2:
        result = "REJECTED"
        rejection_reason = "Other grains exceed 2%"

    elif data.weevilled_grains_percent > 1:
        result = "REJECTED"
        rejection_reason = "Weevilled grains exceed 1%"

    else:
        if data.moisture_percent > 12:
            deduction += (data.moisture_percent - 12) * 20

        if data.foreign_matter_percent > 1:
            deduction += 15

        if data.damaged_grains_percent > 2:
            deduction += 25

        if deduction > 0:
            grade = "GRADE_B"

    quality = QualityCheck(
        booking_id=booking_id,
        moisture_percent=data.moisture_percent,
        foreign_matter_percent=data.foreign_matter_percent,
        damaged_grains_percent=data.damaged_grains_percent,
        slightly_damaged_percent=data.slightly_damaged_percent,
        shrivelled_broken_percent=data.shrivelled_broken_percent,
        other_grains_percent=data.other_grains_percent,
        weevilled_grains_percent=data.weevilled_grains_percent,
        grade=grade,
        result=result,
        rejection_reason=rejection_reason,
        recommendation=recommendation,
        quality_deduction=deduction
    )

    if result == "REJECTED":
        booking.status = "REJECTED"
    else:
        booking.status = "ACCEPTED"

    db.add(quality)
    db.commit()
    db.refresh(quality)

    return quality