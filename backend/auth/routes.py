from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import jwt
import os
import uuid

from database import get_db
from models import User, Farmer
from schemas import UserRegister, UserLogin, TokenResponse


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