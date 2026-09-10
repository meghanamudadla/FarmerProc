from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth.dependencies import require_role
from models import User
from database import get_db
from models import (
    Booking,
    Procurement,
    Weighment,
    QualityCheck
)
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

    # Procurement should happen only after quality acceptance
    if booking.status not in ["ACCEPTED", "PAYMENT_PROCESSING"]:
        raise HTTPException(
        status_code=400,
        detail="Farmer must pass quality check before procurement"
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

    # Get weighing record
    weighment = db.query(Weighment).filter(
        Weighment.booking_id == booking.id
    ).first()

    if not weighment:
        raise HTTPException(
            status_code=400,
            detail="Weighment not found"
        )

    # Get quality record
    quality_check = db.query(QualityCheck).filter(
        QualityCheck.booking_id == booking.id
    ).first()

    if not quality_check:
        raise HTTPException(
            status_code=400,
            detail="Quality check not found"
        )

    if quality_check.result != "ACCEPTED":
        raise HTTPException(
            status_code=400,
            detail="Rejected produce cannot be procured"
        )

    accepted_quintals = weighment.accepted_quintals

    quality_deduction = quality_check.quality_deduction

    # Use the MSP amount already calculated in booking.price
    total_amount = booking.price

    if total_amount is None:
        raise HTTPException(
            status_code=400,
            detail="MSP calculation must be completed first"
        )

    # Convert MSP per quintal to price per kg
    msp_rate_per_quintal = (
        total_amount + quality_deduction
    ) / accepted_quintals

    price_per_kg = msp_rate_per_quintal / 100

    procurement = Procurement(
        booking_id=booking.id,
        crop=procurement_data.crop,
        quantity=weighment.net_weight_kg,
        quality=quality_check.grade,
        price_per_kg=price_per_kg,
        total_amount=total_amount,
        status="COMPLETED",
        accepted_quintals=accepted_quintals,
        quality_deduction=quality_deduction,
        msp_rate_per_quintal=msp_rate_per_quintal
    )

    db.add(procurement)

    booking.status = "PAYMENT_PROCESSING"

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


# ---------------------------------------------------------
# GET ALL PROCUREMENTS
# ---------------------------------------------------------

@router.get(
    "/all",
    response_model=list[ProcurementResponse]
)
def get_all_procurements(
    db: Session = Depends(get_db)
):
    return db.query(Procurement).order_by(Procurement.created_at.desc()).all()


# ---------------------------------------------------------
# STATEWIDE PROCUREMENT ANALYTICS (COMMAND CENTER)
# ---------------------------------------------------------

@router.get("/analytics")
def get_procurement_analytics(
    db: Session = Depends(get_db)
):
    from models import Farmer, ProcurementCenter, Grievance, Payment
    from sqlalchemy import func
    from datetime import date

    total_farmers = db.query(func.count(Farmer.id)).scalar() or 0
    total_centers = db.query(func.count(ProcurementCenter.id)).scalar() or 0
    total_bookings = db.query(func.count(Booking.id)).scalar() or 0

    today = date.today()
    today_arrivals = db.query(func.count(Booking.id)).filter(
        Booking.checked_in == True
    ).scalar() or 0

    today_completed = db.query(func.count(Booking.id)).filter(
        Booking.status == "PAYMENT_COMPLETED"
    ).scalar() or 0

    active_queues = db.query(func.count(Booking.id)).filter(
        Booking.status.in_(["WAITING", "ARRIVED", "WEIGHING", "QUALITY_CHECK", "PAYMENT_PROCESSING"])
    ).scalar() or 0

    total_procured_qty = db.query(func.sum(Procurement.quantity)).scalar() or 0.0
    total_payments = db.query(func.sum(Payment.amount)).scalar() or 0.0

    pending_grievances = db.query(func.count(Grievance.id)).filter(
        Grievance.status.in_(["SUBMITTED", "ASSIGNED", "UNDER_REVIEW"])
    ).scalar() or 0

    return {
        "total_farmers": total_farmers,
        "total_centers": total_centers,
        "total_bookings": total_bookings,
        "today_arrivals": today_arrivals,
        "today_completed": today_completed,
        "active_queues": active_queues,
        "total_procured_quintals": round(float(total_procured_qty), 2),
        "total_disbursed_inr": round(float(total_payments), 2),
        "pending_issues": pending_grievances,
    }


# ---------------------------------------------------------
# PROCUREMENT & PAYMENT SUMMARY PER CENTER
# ---------------------------------------------------------

@router.get("/summary")
def get_procurement_summary(
    db: Session = Depends(get_db)
):
    from models import ProcurementCenter, Payment
    centers = db.query(ProcurementCenter).all()
    results = []

    for c in centers:
        proc_records = (
            db.query(Procurement)
            .join(Booking, Procurement.booking_id == Booking.id)
            .filter(Booking.center_id == c.id)
            .all()
        )
        total_qtl = sum(p.quantity for p in proc_records if p.quantity) or 0.0
        total_amt = sum(p.total_amount for p in proc_records if p.total_amount) or 0.0

        proc_ids = [p.id for p in proc_records]
        payments = db.query(Payment).filter(Payment.procurement_id.in_(proc_ids)).all() if proc_ids else []
        completed = sum(1 for pay in payments if pay.status == "PAYMENT_COMPLETED")
        pending = sum(1 for pay in payments if pay.status in ["PAYMENT_INITIATED", "PENDING"])

        results.append({
            "centerId": f"c{c.id}",
            "centerName": c.name,
            "district": c.district or "East Godavari",
            "totalProcuredQtl": round(float(total_qtl), 1),
            "totalPaidQtl": round(float(total_qtl), 1),
            "totalAmount": round(float(total_amt), 2),
            "completedPayments": completed,
            "pendingPayments": pending,
            "delayedPayments": 0,
            "reconciled": True
        })

    return results