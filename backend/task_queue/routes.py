from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi import WebSocket, WebSocketDisconnect
from task_queue.manager import manager
from auth.dependencies import require_role
from database import get_db
from models import (
    Booking,
    Slot,
    Farmer,
    User,
    ProcurementCenter,
    Notification
)
from datetime import datetime, timedelta, timezone
from sqlalchemy import update
from schemas import QueueResponse, QueueBookingResponse
from audit import record_audit_event


router = APIRouter(
    prefix="/queue",
    tags=["Queue Management"]
)


def booking_to_queue_response(booking, farmer, user, slot=None):
    weight_details = None
    if booking.weighment:
        w = booking.weighment
        weight_details = {
            "weighed_bags": w.weighed_bags,
            "gross_weight_kg": w.gross_weight_kg,
            "tare_weight_kg": w.tare_weight_kg,
            "net_weight_kg": w.net_weight_kg,
            "accepted_weight_kg": w.accepted_weight_kg,
            "accepted_quintals": w.accepted_quintals,
        }

    quality_details = None
    if booking.quality_check:
        q = booking.quality_check
        quality_details = {
            "moisture_percent": q.moisture_percent,
            "foreign_matter_percent": q.foreign_matter_percent,
            "damaged_grains_percent": q.damaged_grains_percent,
            "grade": q.grade,
            "result": q.result,
            "rejection_reason": q.rejection_reason,
            "quality_deduction": q.quality_deduction,
        }

    payment_details = None
    if booking.price is not None:
        payment_details = {
            "amount": booking.price,
            "status": booking.payment_status,
            "method": booking.payment_method or "DBT_DIRECT_TRANSFER",
        }

    crop_name = booking.crop.crop_name if booking.crop else "Paddy (Grade A)"
    crop_variety = booking.crop.variety if booking.crop else "FAQ Standard"

    return QueueBookingResponse(
        id=booking.id,
        token_number=booking.token_number,
        farmer_id=farmer.id,
        farmer_name=user.name,
        farmer_phone=user.phone,
        slot_id=slot.id if slot else booking.slot_id,
        status=booking.status,
        stage=booking.status,
        slot_date=slot.date if slot else booking.booking_date,
        start_time=slot.start_time if slot else None,
        end_time=slot.end_time if slot else None,
        crop=crop_name,
        variety=crop_variety,
        quantity=booking.quantity,
        price=booking.price,
        payment_status=booking.payment_status,
        checked_in=booking.checked_in,
        arrival_time=booking.arrival_time,
        weight_details=weight_details,
        quality=quality_details,
        payment=payment_details,
        audit_trail=[
            {
                "event": "Token Generated",
                "role": "Booking System",
                "time": str(booking.created_at),
                "details": f"Token issued for {booking.quantity} Qtl {crop_name}"
            }
        ]
    )


# ---------------------------------------------------------
# GET QUEUE
# ---------------------------------------------------------

@router.get(
    "/center/{center_id}",
    response_model=QueueResponse
)
def get_center_queue(
    center_id: int,
    db: Session = Depends(get_db)
):

    center = db.query(ProcurementCenter).filter(
        ProcurementCenter.id == center_id
    ).first()

    if not center:
        raise HTTPException(
            status_code=404,
            detail="Procurement center not found"
        )
        
    from dqa_manager import get_engine
    engine = get_engine(center_id, db)
    
    # Force DQA internal state queue positions to recalculate to newest clock times
    engine.recalculate_eta()

    # We must join DQA states back together with Booking ORM to ship the correct UI response.
    bookings = (
        db.query(Booking)
        .filter(Booking.center_id == center_id)
        # Instead of sorting by created_at, fetch all relevant requests
        .filter(Booking.status.in_(["WAITING", "ASSIGNED", "PROCESSING", "COMPLETED", "PAYMENT_COMPLETED", "ARRIVED"]))
        .all()
    )

    currently_serving = None
    waiting = []
    all_tokens = []
    
    dqa_map = {e.booking_id: e for e in engine.state.entries.values()}

    for booking in bookings:
        farmer = booking.farmer
        user = farmer.user if farmer else None
        slot = booking.slot

        if not farmer or not user:
            continue

        item = booking_to_queue_response(
            booking,
            farmer,
            user,
            slot
        )
        
        # Override live tracking ETA stats from DQA memory engine dynamically
        bq = dqa_map.get(str(booking.id))
        
        if bq:
            item.queue_position = bq.queue_position
            item.estimated_wait_minutes = bq.estimated_wait_minutes
            item.assigned_counter_id = bq.assigned_counter_id
            item.allocation_reason = bq.allocation_reason
            
            # Save it back to cache if status changed by engine
            if bq.status.value != booking.status:
                booking.status = bq.status.value
            item.status = booking.status
            item.stage = booking.status
        else:
            item.queue_position = booking.queue_position
            item.estimated_wait_minutes = booking.estimated_wait_minutes
            item.assigned_counter_id = booking.assigned_counter_id
            item.allocation_reason = booking.allocation_reason

        all_tokens.append(item)

    db.commit()
    
    # Sort strictly by Engine queue_position natively!
    all_tokens.sort(key=lambda x: (x.queue_position if x.queue_position is not None else 999999))

    for item in all_tokens:
        if item.status in ["WEIGHING", "QUALITY_CHECK", "PAYMENT_PROCESSING", "PROCESSING"]:
            if not currently_serving:
                currently_serving = item
        elif item.status in ["BOOKED", "WAITING", "ARRIVED", "ASSIGNED"]:
            waiting.append(item)

    return QueueResponse(
        center_id=center_id,
        currently_serving=currently_serving,
        waiting=waiting,
        tokens=all_tokens
    )


# ---------------------------------------------------------
# CALL NEXT FARMER
# ---------------------------------------------------------

@router.post(
    "/center/{center_id}/next"
)
async def call_next_farmer(
    center_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("CENTER_OPERATOR")
    )
):

    center = db.query(ProcurementCenter).filter(
        ProcurementCenter.id == center_id
    ).first()

    if not center:
        raise HTTPException(
            status_code=404,
            detail="Procurement center not found"
        )

    # Check if a farmer is already being served
    current = (
        db.query(Booking)
        .join(
            Slot,
            Booking.slot_id == Slot.id
        )
        .filter(
            Slot.center_id == center_id,
            Booking.status == "WEIGHING"
        )
        .first()
    )

    if current:

        raise HTTPException(
            status_code=400,
            detail="A farmer is already being served"
        )

    # Find the next farmer
    next_booking = (
        db.query(Booking)
        .join(
            Slot,
            Booking.slot_id == Slot.id
        )
        .filter(
            Slot.center_id == center_id,
            Booking.status.in_(["BOOKED", "WAITING"])
        )
        .order_by(
            Slot.date,
            Slot.start_time,
            Booking.token_number
        )
        .first()
    )

    if not next_booking:

        raise HTTPException(
            status_code=404,
            detail="No farmers are waiting"
        )

    # Change status
    next_booking.status = "WEIGHING"

    db.commit()
    db.refresh(next_booking)

    await manager.broadcast(
    center_id,
    {
        "event": "NEXT_FARMER",
        "booking_id": next_booking.id,
        "token_number": next_booking.token_number,
        "status": next_booking.status
    }
    )

    return {
    "message": "Next farmer called",
    "booking_id": next_booking.id,
    "token_number": next_booking.token_number,
    "status": next_booking.status
    }

# ---------------------------------------------------------
# COMPLETE FARMER
# ---------------------------------------------------------
@router.post("/{booking_id}/complete")
async def complete_farmer(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("CENTER_OPERATOR")
    )
):

    booking = db.query(Booking).filter(
        Booking.id == booking_id
    ).first()

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    if booking.status not in ("WEIGHING", "PAYMENT_PROCESSING", "PROCESSING", "ASSIGNED"):
        raise HTTPException(
            status_code=400,
            detail="This farmer is not currently being served"
        )

    # Calculate simulated actual processing time directly. 
    # Can be swapped with exact start/end deltas if explicitly tracked.
    actual_service_minutes = 15.0 

    from dqa_manager import get_engine
    engine = get_engine(booking.center_id, db)
    
    try:
        decisions = engine.complete_booking(str(booking.id), actual_service_minutes=actual_service_minutes)
    except Exception as e:
        # Ignore gracefully if it wasn't tracked by the DQA engine strictly
        decisions = []

    # Mark as completed
    booking.status = "PAYMENT_COMPLETED" 

    record_audit_event(
        db, "SERVICE_COMPLETED",
        booking_id=booking.id,
        center_id=booking.center_id,
        actor=f"operator:{current_user.id}",
        new_status="PAYMENT_COMPLETED",
    )
    db.commit()
    db.refresh(booking)

    slot = db.query(Slot).filter(
        Slot.id == booking.slot_id
    ).first()
    
    center_id_val = slot.center_id if slot else booking.center_id

    await manager.broadcast(
        center_id_val,
        {
            "event": "FARMER_COMPLETED",
            "booking_id": booking.id,
            "token_number": booking.token_number,
            "status": booking.status
        }
    )
    
    # Broadcast any newly resulting Reassignments
    for dec in decisions:
        await manager.broadcast(
            center_id_val,
            {
                "event": "NEXT_FARMER_ASSIGNED",
                "booking_id": dec.booking_id,
                "assigned_counter_id": dec.assigned_counter_id,
                "allocation_reason": dec.allocation_reason,
                "status": dec.status
            }
        )

    return {
        "message": "Farmer processing completed",
        "booking_id": booking.id,
        "token_number": booking.token_number,
        "status": booking.status
    }


# ---------------------------------------------------------
# SWEEP MISSED WINDOWS
# ---------------------------------------------------------
@router.post("/center/{center_id}/sweep-missed")
async def sweep_missed_bookings(
    center_id: int,
    db: Session = Depends(get_db)
):
    # All slot times are IST wall-clock; comparisons use IST "now", not server-local or UTC
    now = (datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)).replace(tzinfo=None)
    
    # 1. Clear out timed-out reschedule offers (older than 10 minutes)
    timeout_threshold = now - timedelta(minutes=10)
    timed_out_offers = db.query(Booking).filter(
        Booking.center_id == center_id,
        Booking.reschedule_offered_at != None,
        Booking.reschedule_offered_at < timeout_threshold,
        Booking.status == "MISSED_WINDOW"
    ).all()
    
    for b in timed_out_offers:
        b.status = "RESCHEDULE_DECLINED"
        b.reschedule_offered_at = None
        # Release the original slot's capacity atomically (which was being HELD)
        if b.original_slot_id:
            db.execute(
                update(Slot)
                .where(Slot.id == b.original_slot_id)
                .values(booked_count=Slot.booked_count - 1)
            )
        
        await manager.broadcast(center_id, {
            "event": "RESCHEDULE_DECLINED",
            "booking_id": b.id,
            "status": b.status
        })

    # 2. Discover newly missed live slots actively over their grace boundary
    active_bookings = db.query(Booking).join(Slot, Booking.slot_id == Slot.id).filter(
        Booking.center_id == center_id,
        Booking.checked_in == False,
        Booking.status.in_(["BOOKED", "WAITING", "ASSIGNED", "RESCHEDULED"])
    ).all()
    
    from dqa_manager import get_engine
    engine = get_engine(center_id, db)
    
    sweeped = []
    cancelled = []
    
    for b in active_bookings:
        # Reconstruct the combined scheduled threshold
        slot_end_dt = datetime.combine(b.slot.date, b.slot.end_time)
        grace_limit = slot_end_dt + timedelta(minutes=b.slot.grace_window_minutes)
        
        if now > grace_limit:
            # Safely release engine state trace
            try:
                engine.mark_no_show(str(b.id))
            except Exception:
                pass
            
            if b.retry_used:
                # Trigger Second-Miss hard cancellation
                b.status = "CANCELLED"
                
                # Release slot capacity atomically per Prompt 1 constraint design rules
                db.execute(
                    update(Slot)
                    .where(Slot.id == b.slot_id)
                    .values(booked_count=Slot.booked_count - 1)
                )
                
                cancelled.append(b.id)

                record_audit_event(
                    db, "BOOKING_CANCELLED",
                    booking_id=b.id,
                    center_id=center_id,
                    actor="system",
                    previous_status="MISSED_WINDOW",
                    new_status="CANCELLED",
                    reason="second miss",
                )
                db.add(Notification(
                    user_id=b.farmer.user_id, 
                    title="Procurement Cancelled", 
                    message=f"Token {b.token_number} cancelled due to a second consecutive missed arrival window."
                ))
                
                await manager.broadcast(center_id, {
                    "event": "CANCELLED",
                    "booking_id": b.id,
                    "status": b.status
                })
            else:
                # Standard first-time no-show
                b.status = "MISSED_WINDOW"
                b.missed_at = now
                b.original_slot_id = b.slot_id
                
                sweeped.append(b.id)

                record_audit_event(
                    db, "MISSED_WINDOW",
                    booking_id=b.id,
                    center_id=center_id,
                    actor="system",
                    new_status="MISSED_WINDOW",
                    reason="grace window expired",
                )
                db.add(Notification(
                    user_id=b.farmer.user_id, 
                    title="Missed Slot Window", 
                    message=f"You missed your scheduled window for token {b.token_number}. Please request a reschedule."
                ))
                
                await manager.broadcast(center_id, {
                    "event": "MISSED_WINDOW",
                    "booking_id": b.id,
                    "status": b.status
                })
                
    db.commit()
    return {
        "message": "Queue sweep completed", 
        "newly_missed_count": len(sweeped), 
        "cancelled_count": len(cancelled)
    }


@router.websocket("/center/{center_id}/ws")
async def queue_websocket(
    websocket: WebSocket,
    center_id: int
):

    await manager.connect(
        websocket,
        center_id
    )

    try:

        while True:

            # Keep connection alive
            await websocket.receive_text()

    except WebSocketDisconnect:

        manager.disconnect(
            websocket,
            center_id
        )
