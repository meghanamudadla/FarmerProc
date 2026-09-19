from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date

from database import get_db
from models import Booking, Procurement, User
from auth.dependencies import require_role

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"]
)

@router.get("/summary")
def get_analytics_summary(
    center_id: int = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role("ADMIN"))
):
    today = date.today()
    
    # 1. Total arrivals (checked_in bookings)
    arrivals_query = db.query(Booking).filter(Booking.checked_in == True, func.date(Booking.created_at) == today)
    if center_id:
        arrivals_query = arrivals_query.filter(Booking.center_id == center_id)
    today_arrivals = arrivals_query.count()

    # 2. Total procured quintals
    proc_query = db.query(func.sum(Procurement.quantity))
    if center_id:
        proc_query = proc_query.join(Booking).filter(Booking.center_id == center_id)
    total_procured = proc_query.scalar() or 0

    # 3. Total rejections
    rej_query = db.query(Booking).filter(Booking.status == 'REJECTED')
    if center_id:
        rej_query = rej_query.filter(Booking.center_id == center_id)
    total_rejected = rej_query.count()

    return {
        "today_arrivals": today_arrivals,
        "total_procured_quintals": total_procured,
        "total_rejected": total_rejected
    }
