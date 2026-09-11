from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime

from task_queue.manager import manager
from database import get_db
from models import Booking, Slot, User, Farmer, Crop, ProcurementCenter
from schemas import BookingCreate, BookingResponse
from auth.dependencies import get_current_user
from notifications.service import create_notification
from dqa import compute_dynamic_eta, FarmerRequest as DqaFarmerRequest, ExistingEntry as DqaExistingEntry

import secrets


def generate_token():
    return "PDC-" + secrets.token_hex(3).upper()


router = APIRouter(
    prefix="/bookings",
    tags=["Bookings"]
)


# =========================
# CREATE BOOKING
# =========================

@router.post("/", response_model=BookingResponse)
async def create_booking(
    booking_data: BookingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    # 1. Find farmer
    farmer = db.query(Farmer).filter(
        Farmer.user_id == current_user.id
    ).first()

    if not farmer:
        raise HTTPException(
            status_code=404,
            detail="Farmer profile not found"
        )

    # 2. Find slot
    slot = db.query(Slot).filter(
        Slot.id == booking_data.slot_id
    ).first()

    if not slot:
        raise HTTPException(
            status_code=404,
            detail="Slot not found"
        )

    # 3. Make sure the slot belongs to the selected center
    if slot.center_id != booking_data.center_id:
        raise HTTPException(
            status_code=400,
            detail="Selected slot does not belong to the selected center"
        )

    # 4. Check if farmer already booked this slot
    existing_booking = db.query(Booking).filter(
        Booking.farmer_id == farmer.id,
        Booking.slot_id == slot.id,
        Booking.status != "CANCELLED"
    ).first()

    if existing_booking:
        raise HTTPException(
            status_code=400,
            detail="You have already booked this slot"
        )

    # 5. Count existing bookings
    booking_count = db.query(
        func.count(Booking.id)
    ).filter(
        Booking.slot_id == slot.id,
        Booking.status != "CANCELLED"
    ).scalar()

    # 6. Check slot capacity
    if booking_count >= slot.capacity:
        raise HTTPException(
            status_code=400,
            detail="This slot is full"
        )

    # 7. Create booking
    booking = Booking(
        farmer_id=farmer.id,
        center_id=booking_data.center_id,
        crop_id=booking_data.crop_id,
        quantity=booking_data.quantity,
        booking_date=booking_data.booking_date,
        slot_id=booking_data.slot_id,
        token_number=generate_token(),
        status="BOOKED",
        payment_status="PENDING",
        checked_in=False
    )

    # 8. Update crop quantity
    if booking.crop_id:
        crop = db.query(Crop).filter(
            Crop.id == booking.crop_id,
            Crop.farmer_id == farmer.id
        ).first()

        if not crop:
            raise HTTPException(
                status_code=404,
                detail="Crop not found for this farmer"
            )

        if crop.remaining_quantity < booking.quantity:
            raise HTTPException(
                status_code=400,
                detail="Booking quantity exceeds remaining crop quantity"
            )

        crop.remaining_quantity -= booking.quantity

        if crop.remaining_quantity <= 0:
            crop.remaining_quantity = 0
            crop.status = "COMPLETED"

    # 9. Save booking
    db.add(booking)
    db.commit()
    db.refresh(booking)

    # 10. Create notification for farmer
    create_notification(
        db=db,
        user_id=farmer.user_id,
        title="Booking Created",
        message=(
            f"Your booking is confirmed. "
            f"Your token number is {booking.token_number}."
        )
    )

    # 11. Notify connected center clients
    await manager.broadcast(
        slot.center_id,
        {
            "event": "NEW_BOOKING",
            "booking_id": booking.id,
            "token_number": booking.token_number,
            "farmer_id": farmer.id,
            "status": booking.status
        }
    )

    return booking


# =========================
# DYNAMIC QUEUE / ETA PREVIEW
# =========================
# Inspired by https://github.com/meghanamudadla/FarmerProc/tree/main/dqa —
# computes a live queue position + split-load ETA for a booking BEFORE it is
# created, using real existing bookings for the slot rather than the slot's
# static capacity number alone. Small/marginal farmers (<1 acre) get the
# bounded-fairness priority lane; everyone else is served FCFS.

@router.get("/dynamic-eta")
def get_dynamic_eta(
    slot_id: int,
    crop_id: int,
    quantity: float,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    farmer = db.query(Farmer).filter(
        Farmer.user_id == current_user.id
    ).first()

    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer profile not found")

    slot = db.query(Slot).filter(Slot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    center = db.query(ProcurementCenter).filter(
        ProcurementCenter.id == slot.center_id
    ).first()
    if not center:
        raise HTTPException(status_code=404, detail="Center not found")

    crop = db.query(Crop).filter(
        Crop.id == crop_id,
        Crop.farmer_id == farmer.id
    ).first()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found for this farmer")

    existing_bookings = db.query(Booking).filter(
        Booking.slot_id == slot_id,
        Booking.status != "CANCELLED"
    ).order_by(Booking.created_at.asc()).all()

    existing_entries = []
    for b in existing_bookings:
        b_farmer = db.query(Farmer).filter(Farmer.id == b.farmer_id).first()
        b_crop = db.query(Crop).filter(Crop.id == b.crop_id).first() if b.crop_id else None
        existing_entries.append(DqaExistingEntry(
            booking_id=b.id,
            crop_name=b_crop.crop_name if b_crop else "produce",
            quantity_qtl=b.quantity,
            land_area_acres=b_farmer.land_area if (b_farmer and b_farmer.land_area is not None) else 2.0,
            arrival_time=b.created_at.isoformat(),
            token_number=b.token_number,
        ))

    new_request = DqaFarmerRequest(
        farmer_id=farmer.id,
        crop_name=crop.crop_name,
        quantity_qtl=quantity,
        land_area_acres=farmer.land_area if farmer.land_area is not None else 2.0,
        arrival_time=datetime.utcnow().isoformat(),
        token_number="PREVIEW",
    )

    result = compute_dynamic_eta(
        new_request=new_request,
        existing_entries=existing_entries,
        center_capacity=center.capacity,
        now=datetime.utcnow(),
    )

    return {
        "queue_position": result.queue_position,
        "ahead_in_queue": result.ahead_in_queue,
        "estimated_wait_minutes": result.estimated_wait_minutes,
        "estimated_service_minutes": result.estimated_service_minutes,
        "estimated_total_minutes": result.estimated_total_minutes,
        "eta_timestamp": result.eta_timestamp,
        "priority_lane": result.priority_lane,
        "counters_considered": result.counters_considered,
        "allocation_reason": result.allocation_reason,
        "slot_capacity": slot.capacity,
        "slot_booked_count": len(existing_bookings),
    }


# =========================
# CANCEL / DELETE BOOKING
# =========================

@router.delete("/{booking_id}")
def cancel_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    farmer = db.query(Farmer).filter(
        Farmer.user_id == current_user.id
    ).first()

    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer profile not found")

    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.farmer_id == farmer.id
    ).first()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status == "CANCELLED":
        raise HTTPException(status_code=400, detail="Booking is already cancelled")

    if booking.checked_in or booking.status not in ("BOOKED", "booked"):
        raise HTTPException(
            status_code=400,
            detail="This booking has already been checked in and can no longer be cancelled here. Please raise a grievance instead."
        )

    booking.status = "CANCELLED"

    # Return the reserved quantity back to the crop's remaining quota.
    if booking.crop_id:
        crop = db.query(Crop).filter(Crop.id == booking.crop_id).first()
        if crop:
            crop.remaining_quantity += booking.quantity
            if crop.status == "COMPLETED" and crop.remaining_quantity > 0:
                crop.status = "ACTIVE"

    db.commit()

    create_notification(
        db=db,
        user_id=farmer.user_id,
        title="Booking Cancelled",
        message=f"Your booking {booking.token_number} has been cancelled and the quantity returned to your crop quota."
    )

    return {"message": "Booking cancelled", "booking_id": booking.id, "status": booking.status}


# =========================
# GET MY BOOKINGS
# =========================

@router.get("/my", response_model=list[BookingResponse])
def get_my_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    farmer = db.query(Farmer).filter(
        Farmer.user_id == current_user.id
    ).first()

    if not farmer:
        raise HTTPException(
            status_code=404,
            detail="Farmer profile not found"
        )

    bookings = db.query(Booking).filter(
        Booking.farmer_id == farmer.id
    ).order_by(
        Booking.created_at.desc()
    ).all()

    return bookings


# =========================
# GET SINGLE BOOKING
# =========================

@router.get("/{booking_id}", response_model=BookingResponse)
def get_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    farmer = db.query(Farmer).filter(
        Farmer.user_id == current_user.id
    ).first()

    if not farmer:
        raise HTTPException(
            status_code=404,
            detail="Farmer profile not found"
        )

    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.farmer_id == farmer.id
    ).first()

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    return booking