"""
Quality Evaluation Service (Phase 8)
Applies crop-specific grading standards, calculates deductions, and executes workflow transitions.
"""
from datetime import datetime
from typing import Dict, Any
from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import Booking, QualityCheck, Weighment, User
from quality.rules import get_standard_for_crop
from quality.schemas import QualityCheckCreate
from procurement.workflow import validate_transition, BookingStatus
from audit import record_audit_event
from task_queue.manager import manager


def evaluate_quality(crop_name: str, data: QualityCheckCreate) -> Dict[str, Any]:
    """
    Evaluates commodity quality against official crop-specific standards.
    Determines ACCEPTED vs REJECTED, grade, rejection reasons, recommendations, and deductions.
    """
    standard = get_standard_for_crop(crop_name)

    # 1. Check hard rejection criteria against the crop standard
    if data.moisture_percent > standard.max_moisture_percent:
        return {
            "result": "REJECTED",
            "grade": "REJECTED",
            "rejection_reason": f"Moisture ({data.moisture_percent}%) exceeds maximum limit of {standard.max_moisture_percent}% for {standard.crop_name}.",
            "recommendation": "Dry the produce in open sun/mechanical dryer and reschedule inspection.",
            "deduction": 0.0,
        }

    if data.foreign_matter_percent > standard.max_foreign_matter_percent:
        return {
            "result": "REJECTED",
            "grade": "REJECTED",
            "rejection_reason": f"Foreign matter ({data.foreign_matter_percent}%) exceeds limit of {standard.max_foreign_matter_percent}% for {standard.crop_name}.",
            "recommendation": "Sieve and clean foreign matter/dust before procurement.",
            "deduction": 0.0,
        }

    if data.damaged_grains_percent > standard.max_damaged_grains_percent:
        return {
            "result": "REJECTED",
            "grade": "REJECTED",
            "rejection_reason": f"Damaged grains ({data.damaged_grains_percent}%) exceed limit of {standard.max_damaged_grains_percent}%.",
            "recommendation": "Sort and remove damaged grains.",
            "deduction": 0.0,
        }

    if data.slightly_damaged_percent > standard.max_slightly_damaged_percent:
        return {
            "result": "REJECTED",
            "grade": "REJECTED",
            "rejection_reason": f"Slightly damaged grains ({data.slightly_damaged_percent}%) exceed limit of {standard.max_slightly_damaged_percent}%.",
            "recommendation": "Sort produce to improve overall grain quality.",
            "deduction": 0.0,
        }

    if data.shrivelled_broken_percent > standard.max_shrivelled_broken_percent:
        return {
            "result": "REJECTED",
            "grade": "REJECTED",
            "rejection_reason": f"Shrivelled/broken grains ({data.shrivelled_broken_percent}%) exceed limit of {standard.max_shrivelled_broken_percent}%.",
            "recommendation": "Grade out broken grains.",
            "deduction": 0.0,
        }

    if data.other_grains_percent > standard.max_other_grains_percent:
        return {
            "result": "REJECTED",
            "grade": "REJECTED",
            "rejection_reason": f"Other grains mixture ({data.other_grains_percent}%) exceeds limit of {standard.max_other_grains_percent}%.",
            "recommendation": "Remove mixture of other crop grains.",
            "deduction": 0.0,
        }

    if data.weevilled_grains_percent > standard.max_weevilled_grains_percent:
        return {
            "result": "REJECTED",
            "grade": "REJECTED",
            "rejection_reason": f"Weevilled grains ({data.weevilled_grains_percent}%) exceed limit of {standard.max_weevilled_grains_percent}%.",
            "recommendation": "Fumigate and treat infested produce.",
            "deduction": 0.0,
        }

    # 2. Compute quality grade and deductions within FAQ tolerances
    deduction = 0.0
    grade = "GRADE_A"

    if data.moisture_percent > standard.moisture_deduction_threshold:
        excess = data.moisture_percent - standard.moisture_deduction_threshold
        deduction += excess * standard.moisture_deduction_rate_per_percent

    if data.foreign_matter_percent > standard.foreign_matter_deduction_threshold:
        deduction += standard.foreign_matter_deduction_rate

    if data.damaged_grains_percent > (standard.max_damaged_grains_percent / 2.0):
        deduction += 25.0

    if deduction > 0.0:
        grade = "GRADE_B"

    return {
        "result": "ACCEPTED",
        "grade": grade,
        "rejection_reason": None,
        "recommendation": "Produce meets FAQ procurement standards. Approved for procurement.",
        "deduction": round(deduction, 2),
    }


async def process_quality_check(
    booking_id: int,
    data: QualityCheckCreate,
    db: Session,
    current_user: User
) -> QualityCheck:
    """
    Validates booking state, executes quality evaluation, records QualityCheck in DB,
    and updates booking workflow state.
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")

    # 1. Guard: Weighment must have occurred first
    weighment = db.query(Weighment).filter(Weighment.booking_id == booking_id).first()
    if not weighment:
        raise HTTPException(
            status_code=400,
            detail="Gross and tare weighment must be completed before quality inspection."
        )

    # 2. Guard: Prevent duplicate quality checks
    existing_qc = db.query(QualityCheck).filter(QualityCheck.booking_id == booking_id).first()
    if existing_qc:
        raise HTTPException(
            status_code=400,
            detail="Quality check has already been recorded for this booking."
        )

    # 3. Determine crop name
    crop_name = booking.crop.crop_name if booking.crop else "paddy"

    # 4. Evaluate quality
    evaluation = evaluate_quality(crop_name, data)
    target_status = BookingStatus.ACCEPTED if evaluation["result"] == "ACCEPTED" else BookingStatus.REJECTED

    # 5. Validate workflow transition
    validate_transition(booking.status, target_status)

    quality_check = QualityCheck(
        booking_id=booking_id,
        moisture_percent=data.moisture_percent,
        foreign_matter_percent=data.foreign_matter_percent,
        damaged_grains_percent=data.damaged_grains_percent,
        slightly_damaged_percent=data.slightly_damaged_percent,
        shrivelled_broken_percent=data.shrivelled_broken_percent,
        other_grains_percent=data.other_grains_percent,
        weevilled_grains_percent=data.weevilled_grains_percent,
        grade=evaluation["grade"],
        result=evaluation["result"],
        rejection_reason=evaluation["rejection_reason"],
        recommendation=evaluation["recommendation"],
        quality_deduction=evaluation["deduction"]
    )

    prev_status = booking.status
    booking.status = target_status

    db.add(quality_check)
    db.commit()
    db.refresh(quality_check)
    db.refresh(booking)

    # 6. Audit logging
    record_audit_event(
        db,
        "QUALITY_CHECK_COMPLETED",
        booking_id=booking.id,
        center_id=booking.center_id,
        actor=f"inspector:{current_user.id}",
        previous_status=prev_status,
        new_status=target_status,
        reason=f"Grade: {evaluation['grade']}, Result: {evaluation['result']}, Deduction: Rs.{evaluation['deduction']}/qtl"
    )
    db.commit()

    # 7. Broadcast WebSocket event to Mandi console
    await manager.broadcast(
        booking.center_id,
        {
            "event": "QUALITY_CHECK_UPDATED",
            "booking_id": booking.id,
            "token_number": booking.token_number,
            "status": target_status,
            "result": evaluation["result"],
            "grade": evaluation["grade"],
            "deduction": evaluation["deduction"]
        }
    )

    return quality_check
