from typing import Optional, Union, Sequence
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, ExpiredSignatureError
from sqlalchemy.orm import Session

from database import get_db
from models import User
from config import SECRET_KEY, JWT_ALGORITHM


security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Enforces strict JWT authentication.
    Never falls back to arbitrary kiosk users when credentials are missing.
    Returns 401 Unauthorized immediately if missing, expired, or invalid.
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication credentials required: No Bearer token provided.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = credentials.credentials.strip()

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[JWT_ALGORITHM]
        )

        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid token: missing subject claim.",
                headers={"WWW-Authenticate": "Bearer"}
            )

    except ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token signature.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user = None
    try:
        uid = int(user_id)
        user = db.query(User).filter(User.id == uid).first()
    except (ValueError, TypeError):
        pass

    if user is None:
        user = db.query(User).filter(User.phone == str(user_id)).first()

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User account associated with this token no longer exists.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return user


def require_role(required_role: Union[str, Sequence[str]]):
    """
    Enforces role-based access control (RBAC).
    'ADMIN' has access across all privileged endpoints.
    """
    allowed = {required_role} if isinstance(required_role, str) else set(required_role)
    allowed.add("ADMIN")

    def role_checker(
        current_user: User = Depends(get_current_user)
    ):
        if current_user.role not in allowed:
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied: role in {list(allowed)} required. Current user role: '{current_user.role}'."
            )
        return current_user

    return role_checker