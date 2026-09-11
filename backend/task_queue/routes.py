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
    ProcurementCenter
)
from schemas import QueueResponse, QueueBookingResponse


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

    bookings = (
        db.query(Booking)
        .filter(Booking.center_id == center_id)
        .order_by(Booking.created_at.asc())
        .all()
    )

    currently_serving = None
    waiting = []
    all_tokens = []

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

        all_tokens.append(item)

        if booking.status in ["WEIGHING", "QUALITY_CHECK", "PAYMENT_PROCESSING"]:
            if not currently_serving:
                currently_serving = item
        elif booking.status in ["BOOKED", "WAITING", "ARRIVED"]:
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

    if booking.status not in ("WEIGHING", "PAYMENT_PROCESSING"):

        raise HTTPException(
            status_code=400,
            detail="This farmer is not currently being served"
        )

        # Mark as completed
    booking.status = "PAYMENT_COMPLETED"

    db.commit()
    db.refresh(booking)

    slot = db.query(Slot).filter(
        Slot.id == booking.slot_id
    ).first()

    await manager.broadcast(
        slot.center_id,
        {
            "event": "FARMER_COMPLETED",
            "booking_id": booking.id,
            "token_number": booking.token_number,
            "status": booking.status
        }
    )

    return {
        "message": "Farmer processing completed",
        "booking_id": booking.id,
        "token_number": booking.token_number,
        "status": booking.status
    }



@router.websocket("/ws/{center_id}")
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
