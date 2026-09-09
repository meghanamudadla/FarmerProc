from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from auth.dependencies import require_role
from models import User
from database import get_db
from models import Procurement, Payment
from schemas import PaymentCreate, PaymentResponse


router = APIRouter(
    prefix="/payments",
    tags=["Payments"]
)


# ---------------------------------------------------------
# CREATE PAYMENT
# ---------------------------------------------------------

@router.post("/", response_model=PaymentResponse)
def create_payment(
    payment_data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("CENTER_OPERATOR")
    )
):

    procurement = db.query(Procurement).filter(
        Procurement.id == payment_data.procurement_id
    ).first()

    if not procurement:
        raise HTTPException(
            status_code=404,
            detail="Procurement record not found"
        )

    # Check if payment already exists
    existing_payment = db.query(Payment).filter(
        Payment.procurement_id == payment_data.procurement_id
    ).first()

    if existing_payment:
        raise HTTPException(
            status_code=400,
            detail="Payment already exists"
        )

    # Make sure payment amount matches procurement amount
    if procurement.total_amount is not None:
        if payment_data.amount != procurement.total_amount:
            raise HTTPException(
                status_code=400,
                detail="Payment amount does not match procurement amount"
            )

    transaction_id = (
        "TXN-" +
        uuid.uuid4().hex[:10].upper()
    )

    payment = Payment(
        procurement_id=payment_data.procurement_id,
        amount=payment_data.amount,
        transaction_id=transaction_id,
        status="PAID"
    )

    db.add(payment)

    # Update procurement status
    procurement.status = "PAID"

    db.commit()
    db.refresh(payment)

    return payment


# ---------------------------------------------------------
# GET PAYMENT
# ---------------------------------------------------------

@router.get(
    "/procurement/{procurement_id}",
    response_model=PaymentResponse
)
def get_payment(
    procurement_id: int,
    db: Session = Depends(get_db)
):

    payment = db.query(Payment).filter(
        Payment.procurement_id == procurement_id
    ).first()

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found"
        )

    return payment