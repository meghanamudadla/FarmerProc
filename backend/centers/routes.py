from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import ProcurementCenter, User, Booking, Counter
from schemas import CenterCreate, CenterUpdate, CenterResponse
from auth.dependencies import require_role


router = APIRouter(
    prefix="/centers",
    tags=["Procurement Centers"]
)


def enrich_center_response(center: ProcurementCenter, db: Session) -> CenterResponse:
    today = date.today()
    
    # Real live queue from database
    live_queue = db.query(Booking).filter(
        Booking.center_id == center.id,
        Booking.booking_date == today,
        Booking.status.in_(["WAITING", "ARRIVED", "CHECKED_IN"])
    ).count()

    # Real active counters from database
    active_counters = db.query(Counter).filter(
        Counter.center_id == center.id,
        Counter.status == "ACTIVE"
    ).count()
    if active_counters == 0:
        active_counters = max(1, center.weighing_scales or 2)

    # Real arrivals today
    today_arrivals = db.query(Booking).filter(
        Booking.center_id == center.id,
        Booking.booking_date == today
    ).count()

    # Real wait time calculation (15 mins per vehicle / active counters)
    est_wait = round((live_queue * 15) / max(1, active_counters))

    return CenterResponse(
        id=center.id,
        name=center.name,
        location=center.location,
        district=center.district,
        village=center.village or (center.location.split(",")[-2].strip() if center.location and "," in center.location else center.district),
        pin=center.pin or "533001",
        latitude=center.latitude,
        longitude=center.longitude,
        contact_number=center.contact_number or "+91 884 2345678",
        operating_hours=center.operating_hours or "06:00 AM – 06:00 PM",
        operating_status=center.operating_status or "OPEN",
        capacity=center.capacity,
        daily_farmer_capacity=center.daily_farmer_capacity or center.capacity,
        daily_quantity_capacity=center.daily_quantity_capacity or (center.capacity * 20.0),
        weighing_scales=center.weighing_scales or 2,
        storage_cap_qtl=center.storage_cap_qtl or (center.capacity * 50.0),
        disruption_alert=center.disruption_alert,
        status=center.status or "normal",
        current_queue=live_queue,
        active_counters=active_counters,
        est_wait_minutes=est_wait,
        today_arrivals=today_arrivals,
    )


@router.get("/", response_model=list[CenterResponse])
def get_centers(
    db: Session = Depends(get_db)
):
    centers = db.query(ProcurementCenter).all()
    return [enrich_center_response(c, db) for c in centers]


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

    return enrich_center_response(center, db)


@router.post("/", response_model=CenterResponse)
def create_center(
    center_data: CenterCreate,
    db: Session = Depends(get_db)
):
    center = ProcurementCenter(
        name=center_data.name,
        location=center_data.location,
        district=center_data.district,
        village=center_data.village,
        pin=center_data.pin,
        latitude=center_data.latitude,
        longitude=center_data.longitude,
        contact_number=center_data.contact_number,
        operating_hours=center_data.operating_hours,
        operating_status=center_data.operating_status or "OPEN",
        capacity=center_data.capacity,
        daily_farmer_capacity=center_data.daily_farmer_capacity,
        daily_quantity_capacity=center_data.daily_quantity_capacity,
        weighing_scales=center_data.weighing_scales,
        storage_cap_qtl=center_data.storage_cap_qtl,
        disruption_alert=center_data.disruption_alert,
        status="normal"
    )

    db.add(center)
    db.commit()
    db.refresh(center)

    return enrich_center_response(center, db)


@router.patch("/{center_id}", response_model=CenterResponse)
def update_center(
    center_id: int,
    update_data: CenterUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    center = db.query(ProcurementCenter).filter(
        ProcurementCenter.id == center_id
    ).first()

    if not center:
        raise HTTPException(
            status_code=404,
            detail="Center not found"
        )

    update_fields = update_data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(center, field, value)

    db.commit()
    db.refresh(center)

    return enrich_center_response(center, db)