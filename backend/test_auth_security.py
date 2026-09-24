"""
Comprehensive Authentication & Authorization Security Test Suite
Tests:
1. Unauthorized request without token returns 401 Unauthorized (NO kiosk fallback).
2. Malformed / invalid signature JWT returns 401 Unauthorized.
3. Expired JWT returns 401 Unauthorized.
4. Wrong role request returns 403 Forbidden (e.g. Farmer accessing Center Operator endpoint).
5. Valid role authentication returns expected protected response.
"""
from datetime import datetime, timedelta
from jose import jwt
from fastapi.testclient import TestClient

from main import app
from config import SECRET_KEY, JWT_ALGORITHM
from database import SessionLocal
from models import User


client = TestClient(app)


def test_missing_token_returns_401():
    """Verify that protected endpoints do NOT fall back to a default user and strictly return 401."""
    # /bookings/my requires authentication (get_current_user)
    response = client.get("/bookings/my")
    assert response.status_code == 401, f"Expected 401 Unauthorized, got {response.status_code}"
    assert "detail" in response.json()
    print("PASS: Missing token returns 401 Unauthorized.")


def test_invalid_token_returns_401():
    """Verify that an invalid JWT token is rejected with 401."""
    headers = {"Authorization": "Bearer invalid.token.payload"}
    response = client.get("/bookings/my", headers=headers)
    assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    print("PASS: Invalid token signature returns 401.")


def test_expired_token_returns_401():
    """Verify that an expired JWT token is rejected with 401."""
    expired_payload = {
        "sub": "1",
        "role": "FARMER",
        "exp": datetime.utcnow() - timedelta(minutes=10)
    }
    expired_token = jwt.encode(expired_payload, SECRET_KEY, algorithm=JWT_ALGORITHM)
    headers = {"Authorization": f"Bearer {expired_token}"}
    response = client.get("/bookings/my", headers=headers)
    assert response.status_code == 401, f"Expected 401 for expired token, got {response.status_code}"
    assert "expired" in response.json()["detail"].lower()
    print("PASS: Expired token returns 401.")


def test_wrong_role_returns_403():
    """Verify that a user with FARMER role cannot access CENTER_OPERATOR role-gated endpoints."""
    db = SessionLocal()
    farmer_user = db.query(User).filter(User.role == "FARMER").first()
    db.close()
    assert farmer_user is not None, "A seeded farmer user is required."

    token_data = {
        "sub": str(farmer_user.id),
        "role": "FARMER",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    farmer_token = jwt.encode(token_data, SECRET_KEY, algorithm=JWT_ALGORITHM)
    headers = {"Authorization": f"Bearer {farmer_token}"}

    # /payments/ POST requires CENTER_OPERATOR role
    response = client.post("/payments/", json={"procurement_id": 9999, "amount": 100.0}, headers=headers)
    assert response.status_code == 403, f"Expected 403 Forbidden for wrong role, got {response.status_code}"
    assert "permission denied" in response.json()["detail"].lower()
    print("PASS: Wrong role strictly returns 403 Forbidden.")


def test_valid_authenticated_access():
    """Verify that a valid token grants access to the user's data."""
    db = SessionLocal()
    farmer_user = db.query(User).filter(User.role == "FARMER").first()
    db.close()

    token_data = {
        "sub": str(farmer_user.id),
        "role": "FARMER",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    token = jwt.encode(token_data, SECRET_KEY, algorithm=JWT_ALGORITHM)
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/bookings/my", headers=headers)
    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}"
    assert isinstance(response.json(), list)
    print("PASS: Valid authentication succeeds with 200 OK.")


if __name__ == "__main__":
    print("Running Authentication & Authorization Security Tests...")
    test_missing_token_returns_401()
    test_invalid_token_returns_401()
    test_expired_token_returns_401()
    test_wrong_role_returns_403()
    test_valid_authenticated_access()
    print("\nALL AUTHENTICATION SECURITY TESTS PASSED SUCCESSFULLY!")
