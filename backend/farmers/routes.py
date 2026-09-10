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

    crop_name = farmer.crops[0].crop_name if farmer.crops else "Paddy (Grade A)"
    return FarmerResponse(
        id=farmer.id,
        farmer_id=farmer.farmer_id or f"FRM-{farmer.id:04d}",
        name=current_user.name or "Farmer",
        mobile=current_user.phone or "",
        phone=current_user.phone or "",
        village=farmer.village or "Kakinada Rural",
        district=farmer.district or "East Godavari",
        land_area=farmer.land_area or 5.0,
        crop=crop_name,
        totalBookings=len(farmer.bookings) if farmer.bookings else 0,
        noShows=0,
        flagged=False
    )


@router.get("/all", response_model=list[FarmerResponse])
def get_all_farmers(
    db: Session = Depends(get_db)
):
    farmers = db.query(Farmer).all()
    results = []
    for f in farmers:
        crop_name = f.crops[0].crop_name if f.crops else "Paddy (Grade A)"
        user_name = f.user.name if f.user else "Farmer"
        user_phone = f.user.phone if f.user else ""
        results.append(
            FarmerResponse(
                id=f.id,
                farmer_id=f.farmer_id or f"FRM-{f.id:04d}",
                name=user_name,
                mobile=user_phone,
                phone=user_phone,
                village=f.village or "Kakinada Rural",
                district=f.district or "East Godavari",
                land_area=f.land_area or 5.0,
                crop=crop_name,
                totalBookings=len(f.bookings) if f.bookings else 1,
                noShows=0,
                flagged=False
            )
        )
    return results