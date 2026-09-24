from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date

from auth.dependencies import require_role
from models import (
    User,
    Booking,
    Procurement,
    Weighment,
    QualityCheck,
    ProcurementCenter,
    Farmer,
    Grievance,
    Payment
)
from schemas import ProcurementCreate, ProcurementResponse
from database import get_db
from audit import record_audit_event
from task_queue.manager import manager
from procurement.workflow import validate_transition, BookingStatus
from msp.routes import lookup_msp_rate


router = APIRouter(
    prefix="/procurement",
    tags=["Procurement"]
)


# ---------------------------------------------------------
# CREATE PROCUREMENT (Idempotent)
# ---------------------------------------------------------

@router.post("/", response_model=ProcurementResponse)
async def create_procurement(
    procurement_data: ProcurementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["CENTER_OPERATOR", "ADMIN"]))
):
    booking = db.query(Booking).filter(
        Booking.id == procurement_data.booking_id
    ).first()

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking record not found"
        )

    # 1. Idempotent check: Return existing procurement if already created
    existing = db.query(Procurement).filter(
        Procurement.booking_id == procurement_data.booking_id
    ).first()

    if existing:
        return existing

    # 2. State machine: Produce must be accepted by quality inspection
    if booking.status not in [BookingStatus.ACCEPTED, BookingStatus.PAYMENT_PROCESSING, BookingStatus.PROCUREMENT_CREATED]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot procure produce in state '{booking.status}'. Farmer produce must pass quality check first."
        )

    # 3. Get weighing record
    weighment = db.query(Weighment).filter(
        Weighment.booking_id == booking.id
    ).first()

    if not weighment:
        raise HTTPException(
            status_code=400,
            detail="Weighment record not found for this booking"
        )

    # 4. Get quality record
    quality_check = db.query(QualityCheck).filter(
        QualityCheck.booking_id == booking.id
    ).first()

    if not quality_check:
        raise HTTPException(
            status_code=400,
            detail="Quality check record not found for this booking"
        )

    if quality_check.result != "ACCEPTED":
        raise HTTPException(
            status_code=400,
            detail="Rejected produce cannot be procured."
        )

    accepted_quintals = weighment.accepted_quintals
    quality_deduction = quality_check.quality_deduction

    # 5. Compute MSP if not already on booking
    crop_name = procurement_data.crop or (booking.crop.crop_name if booking.crop else "Paddy (Grade A)")
    msp_rate = lookup_msp_rate(crop_name)
    base_amount = round(accepted_quintals * msp_rate, 2)
    total_amount = max(0.0, round(base_amount - quality_deduction, 2))

    booking.price = total_amount
    msp_rate_per_quintal = msp_rate
    price_per_kg = round(msp_rate / 100.0, 2)

    procurement = Procurement(
        booking_id=booking.id,
        crop=crop_name,
        quantity=weighment.net_weight_kg,
        quality=quality_check.grade or "FAQ Grade A",
        price_per_kg=price_per_kg,
        total_amount=total_amount,
        status="RECORDED",
        accepted_quintals=accepted_quintals,
        quality_deduction=quality_deduction,
        msp_rate_per_quintal=msp_rate_per_quintal
    )

    prev_status = booking.status
    booking.status = BookingStatus.PAYMENT_PROCESSING

    db.add(procurement)
    db.commit()
    db.refresh(procurement)
    db.refresh(booking)

    # 6. Audit & Broadcast
    record_audit_event(
        db,
        "PROCUREMENT_RECORDED",
        booking_id=booking.id,
        center_id=booking.center_id,
        actor=f"operator:{current_user.id}",
        previous_status=prev_status,
        new_status=BookingStatus.PAYMENT_PROCESSING,
        reason=f"Procured {accepted_quintals} Qtl {crop_name} @ Rs.{msp_rate}/Qtl. Value: Rs.{total_amount}"
    )
    db.commit()

    await manager.broadcast(
        booking.center_id,
        {
            "event": "PROCUREMENT_RECORDED",
            "booking_id": booking.id,
            "procurement_id": procurement.id,
            "token_number": booking.token_number,
            "status": booking.status,
            "total_amount": total_amount,
            "accepted_quintals": accepted_quintals
        }
    )

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
        Booking.status.in_(["WAITING", "ARRIVED", "WEIGHING", "QUALITY_CHECK", "PAYMENT_PROCESSING", "ASSIGNED"])
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
        "total_procured_quintals": round(float(total_procured_qty) / 100.0 if float(total_procured_qty) > 5000 else float(total_procured_qty), 2),
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
    centers = db.query(ProcurementCenter).all()
    results = []

    for c in centers:
        proc_records = (
            db.query(Procurement)
            .join(Booking, Procurement.booking_id == Booking.id)
            .filter(Booking.center_id == c.id)
            .all()
        )
        total_qtl = sum(p.accepted_quintals or (p.quantity / 100.0) for p in proc_records if p.quantity) or 0.0
        total_amt = sum(p.total_amount for p in proc_records if p.total_amount) or 0.0

        proc_ids = [p.id for p in proc_records]
        payments = db.query(Payment).filter(Payment.procurement_id.in_(proc_ids)).all() if proc_ids else []
        completed = sum(1 for pay in payments if pay.status == "PAYMENT_COMPLETED")
        pending = sum(1 for pay in payments if pay.status in ["PAYMENT_INITIATED", "PENDING", "PAYMENT_PROCESSING"])

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


@router.get("/all")
def get_all_procurements(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "GOVERNMENT", "CENTER_OPERATOR"]))
):
    """
    Returns all detailed procurement records for government reporting and dashboards.
    """
    procurements = db.query(Procurement).all()
    results = []
    for p in procurements:
        b = p.booking
        c_name = b.center.name if b and b.center else "Procurement Center"
        crop_name = b.crop.crop_name if b and b.crop else "Paddy (Grade A)"
        f_name = b.farmer.user.name if b and b.farmer and b.farmer.user else "Farmer"
        results.append({
            "id": p.id,
            "procurement_id": f"PROC-{p.id:04d}",
            "booking_id": p.booking_id,
            "center": c_name,
            "farmer": f_name,
            "crop": crop_name,
            "quantity": p.quantity,
            "accepted_quintals": p.accepted_quintals or (p.quantity / 100.0 if p.quantity else 0.0),
            "rate_per_quintal": p.rate_per_quintal,
            "total_amount": p.total_amount,
            "status": "COMPLETED",
            "date": p.created_at.strftime("%Y-%m-%d") if p.created_at else date.today().isoformat(),
            "created_at": p.created_at.isoformat() if p.created_at else None
        })
    return results