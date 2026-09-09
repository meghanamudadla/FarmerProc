from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth.dependencies import require_role
from models import User
from database import get_db
from models import Booking, Procurement
from schemas import ProcurementCreate, ProcurementResponse


router = APIRouter(
    prefix="/procurement",
    tags=["Procurement"]
)


# ---------------------------------------------------------
# CREATE PROCUREMENT
# ---------------------------------------------------------

@router.post("/", response_model=ProcurementResponse)
def create_procurement(
    procurement_data: ProcurementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("CENTER_OPERATOR")
    )
):

    booking = db.query(Booking).filter(
        Booking.id == procurement_data.booking_id
    ).first()

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    if booking.status != "PROCESSING":
        raise HTTPException(
            status_code=400,
            detail="Farmer must be in PROCESSING status"
        )

    # Check whether procurement already exists
    existing = db.query(Procurement).filter(
        Procurement.booking_id == procurement_data.booking_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Procurement already exists for this booking"
        )

    total_amount = None

    if procurement_data.price_per_kg is not None:
        total_amount = (
            procurement_data.quantity
            * procurement_data.price_per_kg
        )

    procurement = Procurement(
        booking_id=procurement_data.booking_id,
        crop=procurement_data.crop,
        quantity=procurement_data.quantity,
        quality=procurement_data.quality,
        price_per_kg=procurement_data.price_per_kg,
        total_amount=total_amount,
        status="COMPLETED"
    )

    db.add(procurement)
    db.commit()
    db.refresh(procurement)

    return procurement


# ---------------------------------------------------------
# GET PROCUREMENT BY BOOKING
# ---------------------------------------------------------

@router.get(
    "/booking/{booking_id}",
    response_model=ProcurementResponse
)
def get_procurement(
    booking_id: int,
    db: Session = Depends(get_db)
):

    procurement = db.query(Procurement).filter(
        Procurement.booking_id == booking_id
    ).first()

    if not procurement:
        raise HTTPException(
            status_code=404,
            detail="Procurement record not found"
        )

    return procurement