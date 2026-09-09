from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Crop, Farmer, User
from schemas import CropCreate, CropResponse
from auth.dependencies import get_current_user


router = APIRouter(
    prefix="/crops",
    tags=["Crops"]
)


@router.post(
    "/",
    response_model=CropResponse
)
def create_crop(
    crop_data: CropCreate,
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

    crop = Crop(
        farmer_id=farmer.id,
        crop_name=crop_data.crop_name,
        variety=crop_data.variety,
        season=crop_data.season,
        quantity=crop_data.quantity,
        remaining_quantity=crop_data.quantity,
        status="REGISTERED"
    )

    db.add(crop)
    db.commit()
    db.refresh(crop)

    return crop


@router.get(
    "/my",
    response_model=list[CropResponse]
)
def get_my_crops(
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

    return db.query(Crop).filter(
        Crop.farmer_id == farmer.id
    ).order_by(
        Crop.created_at.desc()
    ).all()