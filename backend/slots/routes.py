from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Slot, ProcurementCenter, Booking
from schemas import SlotCreate, SlotResponse


router = APIRouter(
    prefix="/slots",
    tags=["Slots"]
)


def _with_live_occupancy(slots: list[Slot], db: Session) -> list[dict]:
    """Attach real booked_count/available_capacity to each slot (dynamic,
    not the static capacity number alone)."""
    if not slots:
        return []

    results = []
    for s in slots:
        results.append({
            "id": s.id,
            "center_id": s.center_id,
            "date": s.date,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "capacity": s.capacity,
            "booked_count": s.booked_count,
            "available_capacity": max(0, s.capacity - s.booked_count),
        })
    return results


# =========================
# GET ALL SLOTS
# =========================

@router.get("/", response_model=list[SlotResponse])
def get_slots(
    db: Session = Depends(get_db)
):
    return db.query(Slot).all()


# =========================
# GET SLOTS FOR A CENTER
# =========================

@router.get("/center/{center_id}")
def get_center_slots(
    center_id: int,
    db: Session = Depends(get_db)
):

    center = db.query(ProcurementCenter).filter(
        ProcurementCenter.id == center_id
    ).first()

    if not center:
        raise HTTPException(
            status_code=404,
            detail="Center not found"
        )

    slots = db.query(Slot).filter(
        Slot.center_id == center_id
    ).all()

    return _with_live_occupancy(slots, db)


# =========================
# CREATE SLOT
# =========================

@router.post("/", response_model=SlotResponse)
def create_slot(
    slot_data: SlotCreate,
    db: Session = Depends(get_db)
):

    center = db.query(ProcurementCenter).filter(
        ProcurementCenter.id == slot_data.center_id
    ).first()

    if not center:
        raise HTTPException(
            status_code=404,
            detail="Center not found"
        )

    slot = Slot(
        center_id=slot_data.center_id,
        date=slot_data.date,
        start_time=slot_data.start_time,
        end_time=slot_data.end_time,
        capacity=slot_data.capacity
    )

    db.add(slot)
    db.commit()
    db.refresh(slot)

    return slot