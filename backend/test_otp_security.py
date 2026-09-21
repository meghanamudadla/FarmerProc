import time
from fastapi.testclient import TestClient
from main import app
from auth.routes import _otp_sessions, _verified_phones
from database import SessionLocal
from models import User

client = TestClient(app)

def test_otp_security_workflow():
    print("\n--- Starting Comprehensive OTP Security & Verification Test ---")
    
    # 1. Find or verify a registered farmer phone in DB
    db = SessionLocal()
    farmer_user = db.query(User).filter(User.role == "FARMER").first()
    db.close()
    
    if not farmer_user:
        print("No farmer found in database. Please seed database first.")
        return
    
    test_phone = farmer_user.phone[-10:]
    print(f"Testing with registered farmer: {farmer_user.name} (+91 {test_phone})")
    
    # STEP 1: Request OTP
    res_send = client.post("/auth/send-otp", json={"phone": test_phone, "for_login": True})
    assert res_send.status_code == 200, f"send-otp failed: {res_send.text}"
    send_data = res_send.json()
    print("STEP 1: /auth/send-otp response:", send_data)
    assert "otp" not in send_data, "SECURITY VIOLATION: 'otp' field leaked in send-otp response!"
    assert send_data.get("phone") == test_phone
    print("✓ Passed: OTP response does NOT leak OTP code to client.")
    
    # Verify session exists in backend memory
    assert test_phone in _otp_sessions, "OTP session not stored in backend memory."
    real_otp = _otp_sessions[test_phone]["otp"]
    print(f"✓ Backend generated OTP: {real_otp} (Stored securely in server memory)")
    
    # STEP 2: Attempt verification with incorrect OTP
    print("\nSTEP 2: Testing verification with INCORRECT OTP...")
    wrong_otp = "000000" if real_otp != "000000" else "999999"
    res_wrong = client.post("/auth/verify-otp", json={"phone": test_phone, "otp": wrong_otp})
    assert res_wrong.status_code == 401, f"Expected 401 for wrong OTP, got: {res_wrong.status_code}"
    print(f"✓ Correctly rejected with 401: {res_wrong.json()['detail']}")
    assert test_phone not in _verified_phones, "SECURITY VIOLATION: Unverified phone was marked as verified!"
    print("✓ Passed: Access strictly denied for invalid OTP.")
    
    # STEP 3: Attempt login directly without valid OTP verification
    print("\nSTEP 3: Testing login attempt WITHOUT verified OTP...")
    res_unverified_login = client.post("/auth/login", json={
        "phone": test_phone,
        "password": f"KS-{test_phone}-OTP2026"
    })
    assert res_unverified_login.status_code == 403, f"Expected 403 for unverified login, got {res_unverified_login.status_code}"
    print(f"✓ Correctly blocked unverified login with 403: {res_unverified_login.json()['detail']}")
    
    # STEP 4: Verify with CORRECT OTP
    print("\nSTEP 4: Testing verification with CORRECT OTP...")
    res_correct = client.post("/auth/verify-otp", json={"phone": test_phone, "otp": real_otp})
    assert res_correct.status_code == 200, f"Expected 200 for correct OTP, got: {res_correct.status_code}"
    assert res_correct.json().get("verified") is True
    print(f"✓ Correctly verified with 200: {res_correct.json()['message']}")
    assert test_phone in _verified_phones, "Phone was not recorded in _verified_phones!"
    
    # STEP 5: Farmer login after successful verification
    print("\nSTEP 5: Testing farmer login after successful OTP verification...")
    res_login = client.post("/auth/login", json={
        "phone": test_phone,
        "password": f"KS-{test_phone}-OTP2026"
    })
    assert res_login.status_code == 200, f"Expected 200 for authenticated login, got {res_login.status_code}"
    login_data = res_login.json()
    assert "access_token" in login_data
    print("✓ Login succeeded and issued access_token:", login_data["access_token"][:20] + "...")
    assert test_phone not in _verified_phones, "Verified phone session was not consumed after login!"
    
    # STEP 6: Verify cannot reuse OTP or login again without new OTP
    print("\nSTEP 6: Testing that verification session cannot be reused...")
    res_reuse = client.post("/auth/login", json={
        "phone": test_phone,
        "password": f"KS-{test_phone}-OTP2026"
    })
    assert res_reuse.status_code == 403, f"Expected 403 on reuse, got {res_reuse.status_code}"
    print("✓ Replay prevented: Login blocked without new OTP verification.")
    
    print("\n===========================================================")
    print("🎉 ALL OTP DISPATCH, ENTRY & VERIFICATION TESTS PASSED!")
    print("===========================================================\n")

if __name__ == "__main__":
    test_otp_security_workflow()
