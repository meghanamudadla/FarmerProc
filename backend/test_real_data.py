from fastapi.testclient import TestClient
from main import app
from auth.routes import _otp_sessions


client = TestClient(app)


def test_real_data():
    print("\n--- 1. Testing GET /centers/ ---")
    resp = client.get("/centers/")
    assert resp.status_code == 200, f"Failed fetching centers: {resp.text}"
    centers = resp.json()
    print(f"Total Centers: {len(centers)}")
    for c in centers:
        print(f"[{c['id']}] {c['name']}")
        print(f"    Village: {c['village']} | District: {c['district']} | PIN: {c['pin']}")
        print(f"    Coords: ({c['latitude']}, {c['longitude']}) | Phone: {c['contact_number']}")
        print(f"    Counters: {c['active_counters']} | Live Queue: {c['current_queue']} | Est Wait: {c['est_wait_minutes']} mins")
        assert c['latitude'] is not None, f"Center {c['id']} latitude is missing"
        assert c['longitude'] is not None, f"Center {c['id']} longitude is missing"
        assert c['pin'] != "-", f"Center {c['id']} PIN is mock '-'"

    print("\n--- 2. Testing Farmer Login & Profile Persistence ---")
    test_phone = "6301609560"

    # Clear any previous OTP session cooldown from earlier tests
    from database import SessionLocal
    from models import OtpSession
    db = SessionLocal()
    db.query(OtpSession).filter(OtpSession.phone == test_phone).delete()
    db.commit()
    db.close()
    _otp_sessions.pop(test_phone, None)

    # Send OTP
    send_resp = client.post("/auth/send-otp", json={"phone": test_phone, "for_login": True})
    assert send_resp.status_code == 200, f"Send OTP failed: {send_resp.text}"
    send_data = send_resp.json()
    assert "otp" not in send_data, "Security rule: OTP must not be leaked in response"

    # Read OTP generated securely in backend
    otp = _otp_sessions[test_phone]["otp"]
    print(f"Dispatched OTP: {otp}")

    # Verify OTP
    verify_resp = client.post("/auth/verify-otp", json={"phone": test_phone, "otp": otp})
    assert verify_resp.status_code == 200, "OTP verification failed"

    # Login
    login_resp = client.post("/auth/login", json={"phone": test_phone, "password": f"KS-{test_phone}-OTP2026"})
    assert login_resp.status_code == 200, "Login failed"
    login_data = login_resp.json()
    token = login_data["access_token"]
    print("Logged in successfully! Token received.")

    # Get Farmer Profile
    auth_headers = {"Authorization": f"Bearer {token}"}
    profile_resp = client.get("/farmers/me", headers=auth_headers)
    assert profile_resp.status_code == 200, "Failed fetching farmer profile"
    profile = profile_resp.json()

    print("\n--- Farmer Profile from Database ---")
    print(f"Name: {profile['name']}")
    print(f"Farmer ID: {profile['farmer_id']}")
    print(f"Village: {profile['village']}, District: {profile['district']}, State: {profile['state']}")
    print(f"Land Area: {profile['land_area']} Acres")
    print(f"Aadhaar (Last 4): {profile['aadhaar_last4']}")
    print(f"Bank: {profile['bank_account_masked']} ({profile['bank_name']}) IFSC: {profile['bank_ifsc']}")
    assert profile['name'] == "Naresh Alladi", f"Expected Naresh Alladi, got {profile['name']}"
    assert profile['aadhaar_last4'] == "9560", f"Expected 9560, got {profile['aadhaar_last4']}"
    assert profile['bank_name'] == "State Bank of India (SBI)"

    # Get Farmer Crops
    crops_resp = client.get("/crops/my", headers=auth_headers)
    assert crops_resp.status_code == 200, "Failed fetching crops"
    crops = crops_resp.json()
    print(f"\n--- Farmer Crops from Database ({len(crops)}) ---")
    for crop in crops:
        print(f"- {crop['crop_name']} ({crop['variety']}): {crop['quantity']} Qtl (Remaining: {crop['remaining_quantity']} Qtl)")
    assert len(crops) >= 2, "Expected crops from database"

    print("\n[SUCCESS] ALL REAL DATABASE CHECKS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    test_real_data()
