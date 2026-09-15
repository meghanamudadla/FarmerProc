from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Booking
from auth.dependencies import get_current_user
from task_queue.manager import manager
from audit import record_audit_event


router = APIRouter(
    prefix="/checkin",
    tags=["Check-in"]
)


@router.post("/{token}")
async def check_in_farmer(
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

    # 1. Flip checked_in flag and local basic state
    booking.checked_in = True
    booking.arrival_time = datetime.utcnow()
    booking.status = "ARRIVED"

    # 2. Integrate with DQA Engine
    from dqa_manager import get_engine
    from dqa import FarmerRequest
    
    engine = get_engine(booking.center_id, db)
    farmer_req = FarmerRequest(
        farmer_id=str(booking.farmer_id),
        crop=booking.crop.crop_name.lower() if booking.crop else "paddy",
        quantity_qtl=booking.quantity,
        arrival_time=booking.arrival_time.isoformat(),
        age=40, # mock default
        land_area_acres=booking.farmer.land_area if booking.farmer and booking.farmer.land_area else 2.0,
        token_number=booking.token_number
    )
    
    # 3. Request Queue Assignment from engine
    decision = engine.add_booking(farmer_req)
    
    # 4. Map DQA assignments back into the Booking database schema
    booking.queue_position = decision.queue_position
    booking.assigned_counter_id = decision.assigned_counter_id
    booking.estimated_wait_minutes = decision.estimated_wait_minutes
    booking.eta_timestamp = decision.eta_timestamp
    booking.allocation_reason = decision.allocation_reason
    if decision.status:
        booking.status = decision.status # Usually WAITING or ASSIGNED

    db.commit()
    db.refresh(booking)

    # Audit: CHECK_IN
    record_audit_event(
        db, "CHECK_IN",
        booking_id=booking.id,
        center_id=booking.center_id,
        actor=f"operator:{current_user.id}",
        new_status=booking.status,
    )
    # Audit: COUNTER_ASSIGNED (if a counter was assigned by DQA)
    if booking.assigned_counter_id:
        record_audit_event(
            db, "COUNTER_ASSIGNED",
            booking_id=booking.id,
            center_id=booking.center_id,
            actor="system",
            new_status=booking.status,
            reason=f"Counter {booking.assigned_counter_id} via {booking.allocation_reason or 'DQA'}",
        )
    db.commit()

    await manager.broadcast(booking.center_id, {
        "event": "QUEUE_UPDATE",
        "booking_id": booking.id,
        "token_number": booking.token_number,
        "status": booking.status,
        "queue_position": booking.queue_position,
        "assigned_counter_id": booking.assigned_counter_id,
        "estimated_wait_minutes": booking.estimated_wait_minutes,
        "allocation_reason": booking.allocation_reason
    })

    return {
        "message": "Farmer checked in successfully",
        "token_number": booking.token_number,
        "booking_id": booking.id,
        "checked_in": booking.checked_in,
        "arrival_time": booking.arrival_time,
        "status": booking.status,
        "queue_position": booking.queue_position,
        "assigned_counter_id": booking.assigned_counter_id,
        "estimated_wait_minutes": booking.estimated_wait_minutes,
        "allocation_reason": booking.allocation_reason
    }