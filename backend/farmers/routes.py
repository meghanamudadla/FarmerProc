from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Farmer, User
from schemas import FarmerResponse
from auth.dependencies import get_current_user

router = APIRouter(
    prefix="/farmers",
    tags=["Farmers"]
)


@router.get("/me", response_model=FarmerResponse)
def get_my_profile(
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

    return farmer