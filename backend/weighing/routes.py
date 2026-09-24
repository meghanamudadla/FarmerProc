from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Booking, Weighment, User
from schemas import WeighmentCreate, WeighmentResponse
from auth.dependencies import require_role
from procurement.workflow import validate_transition, BookingStatus
from audit import record_audit_event
from task_queue.manager import manager


router = APIRouter(
    prefix="/weighing",
    tags=["Weighing"]
)


@router.post(
    "/{booking_id}",
    response_model=WeighmentResponse
)
async def record_weighment(
    booking_id: int,
    data: WeighmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["CENTER_OPERATOR", "ADMIN"]))
):
    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id)
        .first()
    )

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_444_NOT_FOUND if hasattr(status, "HTTP_444_NOT_FOUND") else 404,
            detail="Booking record not found"
        )

    # 1. State machine validation
    # Allowed states before weighment: ARRIVED, WAITING, ASSIGNED, WEIGHING
    if booking.status in [BookingStatus.PAYMENT_COMPLETED, BookingStatus.PAYMENT_PROCESSING, BookingStatus.ACCEPTED]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot record weighment for booking in '{booking.status}' state."
        )

    validate_transition(booking.status, BookingStatus.QUALITY_CHECK)

    # 2. Strict Weight Validation
    if data.gross_weight_kg <= 0:
        raise HTTPException(
            status_code=400,
            detail="Gross weight must be greater than zero kg."
        )

    if data.tare_weight_kg < 0:
        raise HTTPException(
            status_code=400,
            detail="Tare weight cannot be negative."
        )

    if data.tare_weight_kg >= data.gross_weight_kg:
        raise HTTPException(
            status_code=400,
            detail=f"Tare weight ({data.tare_weight_kg} kg) must be strictly less than gross weight ({data.gross_weight_kg} kg)."
        )

    if data.weighed_bags <= 0:
        raise HTTPException(
            status_code=400,
            detail="Weighed bag count must be at least 1."
        )

    net_weight = data.gross_weight_kg - data.tare_weight_kg

    if net_weight <= 0:
        raise HTTPException(
            status_code=400,
            detail="Net weight calculation resulted in zero or negative value."
        )

    accepted_weight = net_weight
    accepted_quintals = round(accepted_weight / 100.0, 3)

    # 3. Variance check against declared quantity
    suspicious_variance = False
    variance_reason = None
    if data.declared_weight_kg and data.declared_weight_kg > 0:
        diff_pct = abs(net_weight - data.declared_weight_kg) / data.declared_weight_kg
        if diff_pct > 0.30:  # > 30% difference between declared and actual
            suspicious_variance = True
            variance_reason = f"Suspicious weight variance: Net weight ({net_weight} kg) differs from declared ({data.declared_weight_kg} kg) by {round(diff_pct * 100, 1)}%."

    # 4. Prevent duplicate weighments (idempotent if exactly matches, else error)
    existing = (
        db.query(Weighment)
        .filter(Weighment.booking_id == booking_id)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Weighment has already been recorded for this booking. Duplicate weighment is prohibited."
        )

    weighment = Weighment(
        booking_id=booking_id,
        declared_bags=data.declared_bags,
        bag_weight_kg=data.bag_weight_kg,
        declared_weight_kg=data.declared_weight_kg,
        weighed_bags=data.weighed_bags,
        gross_weight_kg=data.gross_weight_kg,
        tare_weight_kg=data.tare_weight_kg,
        net_weight_kg=net_weight,
        accepted_weight_kg=accepted_weight,
        accepted_quintals=accepted_quintals
    )

    prev_status = booking.status
    booking.status = BookingStatus.QUALITY_CHECK

    db.add(weighment)
    db.commit()
    db.refresh(weighment)
    db.refresh(booking)

    # 5. Audit Logging
    audit_reason = f"Gross: {data.gross_weight_kg}kg, Tare: {data.tare_weight_kg}kg, Net: {net_weight}kg ({accepted_quintals} Qtl)."
    if suspicious_variance:
        audit_reason += f" [WARNING: {variance_reason}]"

    record_audit_event(
        db,
        "WEIGHMENT_RECORDED",
        booking_id=booking.id,
        center_id=booking.center_id,
        actor=f"operator:{current_user.id}",
        previous_status=prev_status,
        new_status=BookingStatus.QUALITY_CHECK,
        reason=audit_reason
    )
    db.commit()

    # 6. Broadcast WebSocket event
    await manager.broadcast(
        booking.center_id,
        {
            "event": "WEIGHMENT_COMPLETED",
            "booking_id": booking.id,
            "token_number": booking.token_number,
            "status": booking.status,
            "net_weight_kg": net_weight,
            "accepted_quintals": accepted_quintals,
            "suspicious_variance": suspicious_variance
        }
    )

    return weighment
