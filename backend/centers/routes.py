from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import ProcurementCenter
from schemas import CenterCreate, CenterResponse


router = APIRouter(
    prefix="/centers",
    tags=["Procurement Centers"]
)


@router.get("/", response_model=list[CenterResponse])
def get_centers(
    db: Session = Depends(get_db)
):
    return db.query(ProcurementCenter).all()


@router.get("/{center_id}", response_model=CenterResponse)
def get_center(
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

    return center


@router.post("/", response_model=CenterResponse)
def create_center(
    center_data: CenterCreate,
    db: Session = Depends(get_db)
):

    center = ProcurementCenter(
        name=center_data.name,
        location=center_data.location,
        district=center_data.district,
        capacity=center_data.capacity
    )

    db.add(center)
    db.commit()
    db.refresh(center)

    return center