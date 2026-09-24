from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import User
from quality.schemas import QualityCheckCreate, QualityCheckResponse
from quality.service import process_quality_check
from auth.dependencies import get_current_user, require_role


router = APIRouter(
    prefix="/quality",
    tags=["Quality Check"]
)


@router.post(
    "/{booking_id}",
    response_model=QualityCheckResponse
)
async def record_quality(
    booking_id: int,
    data: QualityCheckCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["CENTER_OPERATOR", "ADMIN"]))
):
    """
    Submits crop quality check parameters.
    Evaluates produce against crop-specific FAQ thresholds, records QualityCheck,
    computes MSP deductions, and transitions booking status to ACCEPTED or REJECTED.
    """
    return await process_quality_check(booking_id, data, db, current_user)