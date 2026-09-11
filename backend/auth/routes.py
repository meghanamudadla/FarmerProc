from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import jwt
import os
import time
import uuid
import httpx

from database import get_db
from models import User, Farmer
from schemas import (
    UserRegister,
    UserLogin,
    TokenResponse,
    CheckPhoneRequest,
    SendOtpRequest,
    VerifyOtpRequest,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


SECRET_KEY = os.getenv("SECRET_KEY", "development-secret")
ALGORITHM = "HS256"


@router.post("/check-phone")
def check_phone(
    data: CheckPhoneRequest,
    db: Session = Depends(get_db)
):
    """Whether a phone number already has an account. Used by the login
    screen to gate OTP entry to registered numbers on sign-in, and to
    stop duplicate sign-ups, without exposing any other user data."""
    exists = db.query(User).filter(
        User.phone == data.phone.strip()
    ).first() is not None

    return {"registered": exists}


# ============================================================
# SMS OTP (2Factor.in) - real SMS delivery, not voice calls
# ============================================================

TWO_FACTOR_API_KEY = os.getenv("TWO_FACTOR_API_KEY")
TWO_FACTOR_BASE_URL = "https://2factor.in/API/V1"
OTP_SESSION_TTL_SECONDS = 5 * 60

# phone -> {"session_id": str, "expires_at": float}
# In-memory is fine here: OTP sessions are short-lived and this is a single-process demo server.
_otp_sessions: dict[str, dict] = {}


@router.post("/send-otp")
def send_otp(data: SendOtpRequest):
    if not TWO_FACTOR_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="SMS OTP provider is not configured on the server."
        )

    phone = data.phone.strip()

    try:
        response = httpx.get(
            f"{TWO_FACTOR_BASE_URL}/{TWO_FACTOR_API_KEY}/SMS/{phone}/AUTOGEN",
            timeout=10.0
        )
        payload = response.json()
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Could not reach the SMS OTP provider. Please try again."
        )

    if payload.get("Status") != "Success":
        raise HTTPException(
            status_code=502,
            detail=payload.get("Details", "Failed to send OTP SMS.")
        )

    _otp_sessions[phone] = {
        "session_id": payload["Details"],
        "expires_at": time.time() + OTP_SESSION_TTL_SECONDS,
    }

    return {"message": "OTP sent via SMS"}


@router.post("/verify-otp")
def verify_otp(data: VerifyOtpRequest):
    if not TWO_FACTOR_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="SMS OTP provider is not configured on the server."
        )

    phone = data.phone.strip()
    session = _otp_sessions.get(phone)

    if not session or session["expires_at"] < time.time():
        _otp_sessions.pop(phone, None)
        raise HTTPException(
            status_code=400,
            detail="No active OTP for this number. Please request a new OTP."
        )

    try:
        response = httpx.get(
            f"{TWO_FACTOR_BASE_URL}/{TWO_FACTOR_API_KEY}/SMS/VERIFY/{session['session_id']}/{data.otp}",
            timeout=10.0
        )
        payload = response.json()
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Could not reach the SMS OTP provider. Please try again."
        )

    if payload.get("Status") != "Success":
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired OTP."
        )

    _otp_sessions.pop(phone, None)
    return {"message": "OTP verified"}




@router.post("/register")
def register(
    user_data: UserRegister,
    db: Session = Depends(get_db)
):

    # Check whether phone already exists
    existing_user = db.query(User).filter(
        User.phone == user_data.phone
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Phone number already registered"
        )

    
    hashed_password = pwd_context.hash(
        user_data.password
    )

    new_user = User(
        name=user_data.name,
        phone=user_data.phone,
        hashed_password=hashed_password,
        role="FARMER"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    
    new_farmer = Farmer(
        user_id=new_user.id,
        farmer_id=f"FARMER-{uuid.uuid4().hex[:8].upper()}",
        village=user_data.village,
        district=user_data.district,
        land_area=user_data.land_area
    )

    db.add(new_farmer)
    db.commit()

    return {
        "message": "Registration successful",
        "user_id": new_user.id,
        "farmer_id": new_farmer.farmer_id
    }




@router.post("/login", response_model=TokenResponse)
def login(
    user_data: UserLogin,
    db: Session = Depends(get_db)
):

    user = db.query(User).filter(
        User.phone == user_data.phone
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid phone number or password"
        )

    if not pwd_context.verify(
        user_data.password,
        user.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid phone number or password"
        )

    token_data = {
        "sub": str(user.id),
        "role": user.role
    }

    access_token = jwt.encode(
        token_data,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }