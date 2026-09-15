from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, update
from datetime import datetime

from task_queue.manager import manager
from database import get_db
from models import Booking, Slot, User, Farmer, Crop, ProcurementCenter
from schemas import BookingCreate, BookingResponse
from auth.dependencies import get_current_user
from notifications.service import create_notification
from audit import record_audit_event
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

    # 5. Check slot capacity (Atomic update)
    result = db.execute(
        update(Slot)
        .where(Slot.id == slot.id, Slot.booked_count < slot.capacity)
        .values(booked_count=Slot.booked_count + 1)
    )
    
    if result.rowcount == 0:
        raise HTTPException(
            status_code=400,
            detail="This slot is full"
        )

    # 6. Create booking
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

    # 7. Update crop quantity (Atomic update)
    if booking.crop_id:
        crop_result = db.execute(
            update(Crop)
            .where(Crop.id == booking.crop_id, Crop.farmer_id == farmer.id, Crop.remaining_quantity >= booking.quantity)
            .values(remaining_quantity=Crop.remaining_quantity - booking.quantity)
        )
        
        if crop_result.rowcount == 0:
            # Revert the slot update since the crop update failed
            db.execute(
                update(Slot)
                .where(Slot.id == slot.id)
                .values(booked_count=Slot.booked_count - 1)
            )
            # Find if the crop exists but just doesn't have enough quantity
            crop = db.query(Crop).filter(
                Crop.id == booking.crop_id,
                Crop.farmer_id == farmer.id
            ).first()
            if not crop:
                raise HTTPException(
                    status_code=404,
                    detail="Crop not found for this farmer"
                )
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Booking quantity exceeds remaining crop quantity"
                )
                
        # Fetch crop to update status if necessary (not atomic, but zero check is safe enough for status update)
        crop = db.query(Crop).filter(Crop.id == booking.crop_id).first()
        if crop and crop.remaining_quantity <= 0:
            crop.status = "COMPLETED"

    # 9. Save booking
    db.add(booking)
    db.commit()
    db.refresh(booking)

    # 9b. Audit log
    record_audit_event(
        db, "BOOKING_CREATED",
        booking_id=booking.id,
        center_id=booking.center_id,
        actor=f"farmer:{farmer.id}",
        new_status="BOOKED",
    )
    db.commit()

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

    prev = booking.status
    booking.status = "CANCELLED"

    # Return the reserved quantity back to the crop's remaining quota, and decrement slot count as well
    if booking.crop_id:
        db.execute(
            update(Crop)
            .where(Crop.id == booking.crop_id)
            .values(remaining_quantity=Crop.remaining_quantity + booking.quantity)
        )
        crop = db.query(Crop).filter(Crop.id == booking.crop_id).first()
        if crop and crop.status == "COMPLETED" and crop.remaining_quantity > 0:
            crop.status = "ACTIVE"
            
    if booking.slot_id:
        db.execute(
            update(Slot)
            .where(Slot.id == booking.slot_id)
            .values(booked_count=Slot.booked_count - 1)
        )

    record_audit_event(
        db, "BOOKING_CANCELLED",
        booking_id=booking.id,
        center_id=booking.center_id,
        actor=f"farmer:{farmer.id}",
        previous_status=prev,
        new_status="CANCELLED",
    )
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


# =========================
# RESCHEDULE APIs
# =========================

@router.post("/{booking_id}/reschedule-offer")
async def reschedule_offer(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    farmer = db.query(Farmer).filter(Farmer.user_id == current_user.id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer profile not found")

    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.farmer_id == farmer.id
    ).first()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status != "MISSED_WINDOW":
        raise HTTPException(status_code=400, detail="Booking is not in a missed window state")

    # Find the next available slot chronologically
    # Must have capacity and be in the future logically
    today = datetime.utcnow().date()
    
    candidate_slot = db.query(Slot).filter(
        Slot.center_id == booking.center_id,
        Slot.date >= today,
        Slot.booked_count < Slot.capacity
    ).order_by(Slot.date, Slot.start_time).first()
    
    if not candidate_slot:
        raise HTTPException(status_code=404, detail="No available upcoming slots to offer")
        
    booking.reschedule_offered_at = datetime.utcnow()
    record_audit_event(
        db, "SWAP_OFFERED",
        booking_id=booking.id,
        center_id=booking.center_id,
        actor=f"farmer:{farmer.id}",
        previous_status="MISSED_WINDOW",
        new_status="MISSED_WINDOW",
        reason=f"Offered slot {candidate_slot.id}",
    )
    db.commit()
    
    await manager.broadcast(booking.center_id, {
        "event": "RESCHEDULE_OFFERED",
        "booking_id": booking.id,
        "status": booking.status
    })
    
    return {
        "candidate_slot_id": candidate_slot.id,
        "date": candidate_slot.date,
        "start_time": candidate_slot.start_time,
        "end_time": candidate_slot.end_time
    }


@router.post("/{booking_id}/reschedule-accept")
async def reschedule_accept(
    booking_id: int,
    slot_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    farmer = db.query(Farmer).filter(Farmer.user_id == current_user.id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer profile not found")

    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.farmer_id == farmer.id
    ).first()

    if not booking or booking.status != "MISSED_WINDOW":
        raise HTTPException(status_code=400, detail="Invalid booking state")
        
    if not booking.reschedule_offered_at:
        raise HTTPException(status_code=400, detail="No reschedule offer active")

    new_slot = db.query(Slot).filter(Slot.id == slot_id).first()
    if not new_slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    # Atomic reserve of the NEW slot
    result = db.execute(
        update(Slot)
        .where(Slot.id == slot_id, Slot.booked_count < Slot.capacity)
        .values(booked_count=Slot.booked_count + 1)
    )
    
    if result.rowcount == 0:
        raise HTTPException(status_code=409, detail="Slot fill capacity reached since offering")
        
    # Atomic release of the OLD slot that was held
    if booking.original_slot_id:
        db.execute(
            update(Slot)
            .where(Slot.id == booking.original_slot_id)
            .values(booked_count=Slot.booked_count - 1)
        )
        
    booking.slot_id = slot_id
    booking.original_slot_id = None
    booking.checked_in = False
    
    # We only clear retry_used if this is their first miss—wait, "set retry_used=True if not already set. clear retry_used only if this is their first miss".
    # Wait, the prompt says "clear retry_used only if this is their first miss — set retry_used=True if not already set." Actually meaning: if this is their first miss, THEY ARE RESCHEDULING NOW, so it becomes their 2nd chance (retry_used=True). The prompt said: "and clear retry_used only if this is their first miss — set retry_used=True if not already set". Wait, you can't clear it AND set it.
    # Ah, the phrasing says "and clear retry_used only if this is their first miss - set retry_used=True if not already set." -> It means you flag it `True`.
    booking.retry_used = True
    
    booking.status = "RESCHEDULED"
    booking.reschedule_offered_at = None

    record_audit_event(
        db, "SWAP_ACCEPTED",
        booking_id=booking.id,
        center_id=booking.center_id,
        actor=f"farmer:{farmer.id}",
        previous_status="MISSED_WINDOW",
        new_status="RESCHEDULED",
        reason=f"Accepted slot {slot_id}",
    )
    record_audit_event(
        db, "RESCHEDULED",
        booking_id=booking.id,
        center_id=booking.center_id,
        actor=f"farmer:{farmer.id}",
        previous_status="MISSED_WINDOW",
        new_status="RESCHEDULED",
    )
    db.commit()
    
    await manager.broadcast(booking.center_id, {
        "event": "RESCHEDULE_ACCEPTED",
        "booking_id": booking.id,
        "status": booking.status,
        "new_slot_id": slot_id
    })
    
    return {"message": "Rescheduled successfully", "slot_id": slot_id}


@router.post("/{booking_id}/reschedule-decline")
async def reschedule_decline(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    farmer = db.query(Farmer).filter(Farmer.user_id == current_user.id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer profile not found")

    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.farmer_id == farmer.id
    ).first()

    if not booking or booking.status != "MISSED_WINDOW":
        raise HTTPException(status_code=400, detail="Invalid booking state")

    booking.status = "RESCHEDULE_DECLINED"
    booking.reschedule_offered_at = None
    
    # Atomic release of the OLD slot that was held
    if booking.original_slot_id:
        db.execute(
            update(Slot)
            .where(Slot.id == booking.original_slot_id)
            .values(booked_count=Slot.booked_count - 1)
        )

    record_audit_event(
        db, "SWAP_DECLINED",
        booking_id=booking.id,
        center_id=booking.center_id,
        actor=f"farmer:{farmer.id}",
        previous_status="MISSED_WINDOW",
        new_status="RESCHEDULE_DECLINED",
    )
    db.commit()
    
    await manager.broadcast(booking.center_id, {
        "event": "RESCHEDULE_DECLINED",
        "booking_id": booking.id,
        "status": booking.status
    })
    
    return {"message": "Reschedule declined successfully"}