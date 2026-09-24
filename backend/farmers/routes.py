from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Farmer, User
from schemas import FarmerResponse, FarmerUpdate
from auth.dependencies import get_current_user, require_role

router = APIRouter(
    prefix="/farmers",
    tags=["Farmers"]
)


def build_farmer_response(farmer: Farmer, user: User) -> FarmerResponse:
    crop_name = farmer.crops[0].crop_name if farmer.crops else "Paddy (Grade A)"
    return FarmerResponse(
        id=farmer.id,
        farmer_id=farmer.farmer_id or f"FRM-{farmer.id:04d}",
        name=user.name if user else "Farmer",
        mobile=user.phone if user else "",
        phone=user.phone if user else "",
        village=farmer.village or "",
        district=farmer.district or "",
        state=farmer.state or "Andhra Pradesh",
        land_area=farmer.land_area,
        date_of_birth=farmer.date_of_birth,
        crop=crop_name,
        aadhaar_last4=farmer.aadhaar_last4 or "",
        bank_name=farmer.bank_name or "State Bank of India",
        bank_account_masked=farmer.bank_account_masked or "•••• •••• 3422",
        bank_ifsc=farmer.bank_ifsc or "SBIN0001234",
        verification_status=farmer.verification_status or "VERIFIED",
        totalBookings=len(farmer.bookings) if farmer.bookings else 0,
        noShows=0,
        flagged=False
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

    return build_farmer_response(farmer, current_user)


@router.patch("/me", response_model=FarmerResponse)
def update_my_profile(
    updates: FarmerUpdate,
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

    if updates.name is not None:
        current_user.name = updates.name.strip()

    if updates.date_of_birth is not None:
        farmer.date_of_birth = updates.date_of_birth

    if updates.village is not None:
        farmer.village = updates.village.strip()

    if updates.district is not None:
        farmer.district = updates.district.strip()

    if updates.state is not None:
        farmer.state = updates.state.strip()

    if updates.land_area is not None:
        farmer.land_area = updates.land_area

    if updates.aadhaar_last4 is not None:
        farmer.aadhaar_last4 = updates.aadhaar_last4.strip()

    if updates.bank_name is not None:
        farmer.bank_name = updates.bank_name.strip()

    if updates.bank_account_masked is not None:
        farmer.bank_account_masked = updates.bank_account_masked.strip()

    if updates.bank_ifsc is not None:
        farmer.bank_ifsc = updates.bank_ifsc.strip()

    db.commit()
    db.refresh(farmer)
    db.refresh(current_user)

    return build_farmer_response(farmer, current_user)


@router.get("/all", response_model=list[FarmerResponse])
def get_all_farmers(
    db: Session = Depends(get_db),
    current_admin=Depends(require_role(["ADMIN", "GOVERNMENT", "SUPER_ADMIN"]))
):
    farmers = db.query(Farmer).all()
    return [build_farmer_response(f, f.user) for f in farmers]