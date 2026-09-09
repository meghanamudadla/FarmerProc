from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Slot, ProcurementCenter
from schemas import SlotCreate, SlotResponse


router = APIRouter(
    prefix="/slots",
    tags=["Slots"]
)


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

@router.get("/center/{center_id}", response_model=list[SlotResponse])
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

    return db.query(Slot).filter(
        Slot.center_id == center_id
    ).all()


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