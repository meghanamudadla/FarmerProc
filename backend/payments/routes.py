import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Procurement, Payment, User, Booking
from schemas import (
    PaymentCreate,
    PaymentResponse,
    PaymentProcessRequest,
)
from auth.dependencies import require_role
from audit import record_audit_event
from notifications.service import create_notification
from task_queue.manager import manager
from procurement.workflow import validate_transition, BookingStatus


router = APIRouter(
    prefix="/payments",
    tags=["Payments"]
)


@router.get("/", response_model=list[PaymentResponse])
def get_all_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "CENTER_OPERATOR"]))
):
    """List all disbursements across centers."""
    return db.query(Payment).order_by(Payment.created_at.desc()).all()


@router.post("/", response_model=PaymentResponse)
async def create_payment(
    payment_data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["CENTER_OPERATOR", "ADMIN"]))
):
    """
    Idempotent payment initiation.
    If a payment already exists for this procurement, returns the existing record
    instead of failing or duplicating financial transactions.
    """
    procurement = db.query(Procurement).filter(
        Procurement.id == payment_data.procurement_id
    ).first()

    if not procurement:
        raise HTTPException(
            status_code=404,
            detail="Procurement record not found."
        )

    # 1. Idempotency Check: Return existing payment if already created
    existing_payment = db.query(Payment).filter(
        Payment.procurement_id == payment_data.procurement_id
    ).first()

    if existing_payment:
        return existing_payment

    # 2. Validate amount matches procurement
    if procurement.total_amount is not None:
        # Allow small floating point tolerance (0.01 INR)
        if abs(payment_data.amount - procurement.total_amount) > 0.5:
            raise HTTPException(
                status_code=400,
                detail=f"Disbursement amount (Rs.{payment_data.amount}) does not match procurement value (Rs.{procurement.total_amount})."
            )

    transaction_id = "TXN-" + uuid.uuid4().hex[:10].upper()
    now = datetime.utcnow()

    payment = Payment(
        procurement_id=payment_data.procurement_id,
        amount=payment_data.amount,
        transaction_id=transaction_id,
        provider_reference=payment_data.provider_reference or f"DBT-REF-{uuid.uuid4().hex[:8].upper()}",
        attempt_count=1,
        status="PAYMENT_INITIATED",
        created_at=now,
        updated_at=now
    )

    procurement.status = "PAYMENT_INITIATED"
    if procurement.booking:
        procurement.booking.payment_status = "INITIATED"

    db.add(payment)
    db.commit()
    db.refresh(payment)

    record_audit_event(
        db,
        "PAYMENT_INITIATED",
        booking_id=procurement.booking_id,
        center_id=procurement.booking.center_id if procurement.booking else None,
        actor=f"officer:{current_user.id}",
        new_status="PAYMENT_INITIATED",
        reason=f"Payment initialized: Rs.{payment.amount}, Txn: {transaction_id}"
    )
    db.commit()

    return payment


@router.post("/{payment_id}/process", response_model=PaymentResponse)
async def process_payment_lifecycle(
    payment_id: int,
    data: PaymentProcessRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["CENTER_OPERATOR", "ADMIN"]))
):
    """
    Executes payment lifecycle transitions:
    - COMPLETE: Clears DBT disbursement, transitions booking to PAYMENT_COMPLETED.
    - FAIL: Records gateway failure reason and marks payment FAILED.
    - RETRY: Increments attempt counter and sets state to PAYMENT_PROCESSING.
    """
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found.")

    procurement = payment.procurement
    booking = procurement.booking if procurement else None
    action = data.action.strip().upper()
    now = datetime.utcnow()
    prev_status = payment.status

    if action == "COMPLETE":
        payment.status = "PAYMENT_COMPLETED"
        payment.completed_at = now
        payment.updated_at = now
        if data.transaction_id:
            payment.transaction_id = data.transaction_id
        if data.provider_reference:
            payment.provider_reference = data.provider_reference

        if procurement:
            procurement.status = "PAYMENT_COMPLETED"
        if booking:
            booking.payment_status = "COMPLETED"
            booking.status = BookingStatus.PAYMENT_COMPLETED

        db.commit()
        db.refresh(payment)

        # Notify Farmer
        if booking and booking.farmer and booking.farmer.user_id:
            create_notification(
                db=db,
                user_id=booking.farmer.user_id,
                title="Procurement Payment Credited",
                message=f"Disbursement of Rs.{payment.amount:.2f} for Token #{booking.token_number} has been completed via DBT. Txn Ref: {payment.transaction_id}."
            )

        # Broadcast via WebSocket
        if booking:
            await manager.broadcast(
                booking.center_id,
                {
                    "event": "PAYMENT_COMPLETED",
                    "booking_id": booking.id,
                    "token_number": booking.token_number,
                    "amount": payment.amount,
                    "status": "PAYMENT_COMPLETED"
                }
            )

        record_audit_event(
            db,
            "PAYMENT_SUCCESS",
            booking_id=booking.id if booking else None,
            center_id=booking.center_id if booking else None,
            actor=f"cashier:{current_user.id}",
            previous_status=prev_status,
            new_status="PAYMENT_COMPLETED",
            reason=f"DBT credited Rs.{payment.amount} (Ref: {payment.transaction_id})"
        )
        db.commit()

    elif action == "FAIL":
        payment.status = "PAYMENT_FAILED"
        payment.failure_reason = data.failure_reason or "Bank gateway rejected transaction."
        payment.updated_at = now
        if procurement:
            procurement.status = "PAYMENT_FAILED"
        if booking:
            booking.payment_status = "FAILED"

        db.commit()
        db.refresh(payment)

        record_audit_event(
            db,
            "PAYMENT_FAILED",
            booking_id=booking.id if booking else None,
            center_id=booking.center_id if booking else None,
            actor=f"gateway:{current_user.id}",
            previous_status=prev_status,
            new_status="PAYMENT_FAILED",
            reason=payment.failure_reason
        )
        db.commit()

    elif action == "RETRY":
        payment.attempt_count += 1
        payment.status = "PAYMENT_PROCESSING"
        payment.failure_reason = None
        payment.updated_at = now
        if procurement:
            procurement.status = "PAYMENT_PROCESSING"
        if booking:
            booking.payment_status = "PROCESSING"

        db.commit()
        db.refresh(payment)

        record_audit_event(
            db,
            "PAYMENT_RETRY",
            booking_id=booking.id if booking else None,
            center_id=booking.center_id if booking else None,
            actor=f"cashier:{current_user.id}",
            previous_status=prev_status,
            new_status="PAYMENT_PROCESSING",
            reason=f"Disbursement attempt #{payment.attempt_count} dispatched."
        )
        db.commit()

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid payment lifecycle action '{action}'. Permitted: 'COMPLETE', 'FAIL', 'RETRY'."
        )

    return payment


@router.get("/procurement/{procurement_id}", response_model=PaymentResponse)
def get_payment_by_procurement(
    procurement_id: int,
    db: Session = Depends(get_db)
):
    payment = db.query(Payment).filter(
        Payment.procurement_id == procurement_id
    ).first()

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found for this procurement record."
        )

    return payment


@router.get("/booking/{booking_id}", response_model=PaymentResponse)
def get_payment_by_booking(
    booking_id: int,
    db: Session = Depends(get_db)
):
    procurement = db.query(Procurement).filter(
        Procurement.booking_id == booking_id
    ).first()

    if not procurement or not procurement.payment:
        raise HTTPException(
            status_code=404,
            detail="Payment record not found for this booking."
        )

    return procurement.payment