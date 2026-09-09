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


def booking_to_queue_response(booking, farmer, user, slot):
    return QueueBookingResponse(
        id=booking.id,
        token_number=booking.token_number,
        farmer_id=farmer.id,
        farmer_name=user.name,
        slot_id=slot.id,
        status=booking.status,
        slot_date=slot.date,
        start_time=slot.start_time,
        end_time=slot.end_time
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

    rows = (
        db.query(Booking, Farmer, User, Slot)
        .join(
            Farmer,
            Booking.farmer_id == Farmer.id
        )
        .join(
            User,
            Farmer.user_id == User.id
        )
        .join(
            Slot,
            Booking.slot_id == Slot.id
        )
        .filter(
            Slot.center_id == center_id
        )
        .all()
    )

    currently_serving = None
    waiting = []

    for booking, farmer, user, slot in rows:

        item = booking_to_queue_response(
            booking,
            farmer,
            user,
            slot
        )

        if booking.status == "WEIGHING":

            currently_serving = item

        elif booking.status in ["BOOKED", "WAITING"]:

            waiting.append(item)

    # Sort waiting farmers
    waiting.sort(
        key=lambda x: (
            x.slot_date,
            x.start_time,
            x.token_number
        )
    )

    return QueueResponse(
        center_id=center_id,
        currently_serving=currently_serving,
        waiting=waiting
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

    if booking.status != "WEIGHING":

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
