from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Booking, Weighment
from schemas import WeighmentCreate, WeighmentResponse
from auth.dependencies import get_current_user


router = APIRouter(
    prefix="/weighing",
    tags=["Weighing"]
)


@router.post(
    "/{booking_id}",
    response_model=WeighmentResponse
)
def record_weighment(
    booking_id: int,
    data: WeighmentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id)
        .first()
    )

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    if data.tare_weight_kg >= data.gross_weight_kg:
        raise HTTPException(
            status_code=400,
            detail="Tare weight must be less than gross weight"
        )

    net_weight = (
        data.gross_weight_kg -
        data.tare_weight_kg
    )

    accepted_weight = net_weight

    accepted_quintals = accepted_weight / 100

    existing = (
        db.query(Weighment)
        .filter(Weighment.booking_id == booking_id)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Weighment already recorded"
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

    booking.status = "QUALITY_CHECK"

    db.add(weighment)
    db.commit()
    db.refresh(weighment)

    return weighment
