import urllib.request
import json

BASE_URL = "http://localhost:8000"

def test_real_data():
    print("\n--- 1. Testing GET /centers/ ---")
    req = urllib.request.Request(f"{BASE_URL}/centers/")
    with urllib.request.urlopen(req) as resp:
        centers = json.loads(resp.read().decode("utf-8"))
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
    
    # Send OTP
    send_req = urllib.request.Request(
        f"{BASE_URL}/auth/send-otp",
        data=json.dumps({"phone": test_phone, "for_login": True}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(send_req) as resp:
        send_data = json.loads(resp.read().decode("utf-8"))
        otp = send_data.get("otp")
        print(f"Dispatched OTP: {otp}")

    # Verify OTP
    verify_req = urllib.request.Request(
        f"{BASE_URL}/auth/verify-otp",
        data=json.dumps({"phone": test_phone, "otp": otp}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(verify_req) as resp:
        assert resp.getcode() == 200, "OTP verification failed"

    # Login
    login_req = urllib.request.Request(
        f"{BASE_URL}/auth/login",
        data=json.dumps({"phone": test_phone, "password": f"KS-{test_phone}-OTP2026"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    token = None
    with urllib.request.urlopen(login_req) as resp:
        login_data = json.loads(resp.read().decode("utf-8"))
        token = login_data["access_token"]
        print("Logged in successfully! Token received.")

    # Get Farmer Profile
    auth_headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    profile_req = urllib.request.Request(f"{BASE_URL}/farmers/me", headers=auth_headers)
    with urllib.request.urlopen(profile_req) as resp:
        profile = json.loads(resp.read().decode("utf-8"))
        print("\n--- Farmer Profile from Aiven Database ---")
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
    crops_req = urllib.request.Request(f"{BASE_URL}/crops/my", headers=auth_headers)
    with urllib.request.urlopen(crops_req) as resp:
        crops = json.loads(resp.read().decode("utf-8"))
        print(f"\n--- Farmer Crops from Aiven Database ({len(crops)}) ---")
        for crop in crops:
            print(f"- {crop['crop_name']} ({crop['variety']}): {crop['quantity']} Qtl (Remaining: {crop['remaining_quantity']} Qtl)")
        assert len(crops) >= 2, "Expected crops from database"

    print("\n[SUCCESS] ALL REAL DATABASE CHECKS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_real_data()
