import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from datetime import date, time, datetime, timedelta
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import engine, SessionLocal, Base
from models import (
    User,
    Farmer,
    ProcurementCenter,
    Slot,
    Crop,
    Booking,
    Weighment,
    QualityCheck,
    Procurement,
    Payment,
    Notification,
    Grievance,
    Counter,
    OtpSession,
    VerifiedPhoneSession
)

pwd_context = CryptContext(
    schemes=["bcrypt"], 
    deprecated="auto",
    bcrypt__truncate_error=True
)

REAL_CENTERS = [
    {
        "id": 1,
        "name": "Kakinada APMC Mandi Center",
        "location": "NH-16 Bypass Road, Market Yard Yard-2, Kakinada",
        "district": "East Godavari",
        "village": "Kakinada Rural",
        "pin": "533001",
        "latitude": 16.9891,
        "longitude": 82.2475,
        "contact_number": "+91 884 2345678",
        "operating_hours": "06:00 AM – 06:00 PM",
        "operating_status": "OPEN",
        "capacity": 100,
        "daily_farmer_capacity": 100,
        "daily_quantity_capacity": 2000.0,
        "weighing_scales": 3,
        "storage_cap_qtl": 5000.0,
        "disruption_alert": None,
    },
    {
        "id": 2,
        "name": "Godavari Green Centre",
        "location": "Cotton Barrage Road, Opp. AP Markfed Depot, Dowleswaram, Rajahmundry",
        "district": "East Godavari",
        "village": "Dowleswaram",
        "pin": "533125",
        "latitude": 16.9405,
        "longitude": 81.7766,
        "contact_number": "+91 883 2456789",
        "operating_hours": "06:00 AM – 06:00 PM",
        "operating_status": "OPEN",
        "capacity": 120,
        "daily_farmer_capacity": 120,
        "daily_quantity_capacity": 2500.0,
        "weighing_scales": 4,
        "storage_cap_qtl": 8000.0,
        "disruption_alert": None,
    },
    {
        "id": 3,
        "name": "Krishna Delta Purchase Point",
        "location": "APMC Market Yard Gate 3, Gollapudi Bypass, Vijayawada",
        "district": "NTR District",
        "village": "Gollapudi",
        "pin": "520012",
        "latitude": 16.5412,
        "longitude": 80.5982,
        "contact_number": "+91 866 2567890",
        "operating_hours": "06:00 AM – 06:00 PM",
        "operating_status": "OPEN",
        "capacity": 90,
        "daily_farmer_capacity": 90,
        "daily_quantity_capacity": 1800.0,
        "weighing_scales": 3,
        "storage_cap_qtl": 4500.0,
        "disruption_alert": None,
    },
    {
        "id": 4,
        "name": "Kakinada Port Agriculture Mandi",
        "location": "Port Main Road, Vakalapudi Industrial Area, Kakinada",
        "district": "East Godavari",
        "village": "Vakalapudi",
        "pin": "533005",
        "latitude": 17.0012,
        "longitude": 82.2718,
        "contact_number": "+91 884 2987654",
        "operating_hours": "06:00 AM – 06:00 PM",
        "operating_status": "OPEN",
        "capacity": 80,
        "daily_farmer_capacity": 80,
        "daily_quantity_capacity": 1500.0,
        "weighing_scales": 2,
        "storage_cap_qtl": 3000.0,
        "disruption_alert": None,
    },
    {
        "id": 5,
        "name": "Guntur Commercial Crop Procurement Hub",
        "location": "Guntur Mirchi Yard Complex, Nallapadu Road, Guntur",
        "district": "Guntur",
        "village": "Nallapadu",
        "pin": "522004",
        "latitude": 16.3067,
        "longitude": 80.4365,
        "contact_number": "+91 863 2234567",
        "operating_hours": "06:00 AM – 06:00 PM",
        "operating_status": "OPEN",
        "capacity": 150,
        "daily_farmer_capacity": 150,
        "daily_quantity_capacity": 3000.0,
        "weighing_scales": 4,
        "storage_cap_qtl": 9000.0,
        "disruption_alert": None,
    },
    {
        "id": 6,
        "name": "West Godavari Eluru Mandi",
        "location": "Sanivarapupeta Road, Market Yard, Eluru",
        "district": "West Godavari",
        "village": "Sanivarapupeta",
        "pin": "534001",
        "latitude": 16.7107,
        "longitude": 81.0952,
        "contact_number": "+91 8812 234567",
        "operating_hours": "06:00 AM – 06:00 PM",
        "operating_status": "OPEN",
        "capacity": 110,
        "daily_farmer_capacity": 110,
        "daily_quantity_capacity": 2200.0,
        "weighing_scales": 3,
        "storage_cap_qtl": 6000.0,
        "disruption_alert": None,
    },
]

REAL_FARMERS = [
    {
        "phone": "6301609560",
        "name": "Naresh Alladi",
        "farmer_id": "FRM-AP-10245",
        "village": "Kakinada Rural",
        "district": "East Godavari",
        "state": "Andhra Pradesh",
        "land_area": 7.5,
        "date_of_birth": date(1988, 6, 15),
        "aadhaar_last4": "9560",
        "bank_name": "State Bank of India (SBI)",
        "bank_account_masked": "•••• •••• 9560",
        "bank_ifsc": "SBIN0001824",
        "crops": [
            {"name": "Paddy (Grade A)", "variety": "MTU 1010", "season": "Kharif 2026", "qty": 80.0},
            {"name": "Cotton", "variety": "Bt Cotton", "season": "Kharif 2026", "qty": 70.0},
        ]
    },
    {
        "phone": "9876543210",
        "name": "Ramesh Kumar",
        "farmer_id": "FRM-AP-20891",
        "village": "Dowleswaram",
        "district": "East Godavari",
        "state": "Andhra Pradesh",
        "land_area": 5.0,
        "date_of_birth": date(1985, 4, 12),
        "aadhaar_last4": "4321",
        "bank_name": "APGVB Bank",
        "bank_account_masked": "•••• •••• 3422",
        "bank_ifsc": "APGV0002109",
        "crops": [
            {"name": "Paddy (Grade A)", "variety": "BPT 5204", "season": "Kharif 2026", "qty": 60.0},
            {"name": "Maize", "variety": "DHM 117", "season": "Kharif 2026", "qty": 40.0},
        ]
    },
    {
        "phone": "9505576118",
        "name": "Srinivas Rao",
        "farmer_id": "FRM-AP-30514",
        "village": "Gollapudi",
        "district": "NTR District",
        "state": "Andhra Pradesh",
        "land_area": 6.2,
        "date_of_birth": date(1990, 9, 20),
        "aadhaar_last4": "6118",
        "bank_name": "Union Bank of India",
        "bank_account_masked": "•••• •••• 6118",
        "bank_ifsc": "UBIN0532185",
        "crops": [
            {"name": "Paddy (Grade A)", "variety": "MTU 1061", "season": "Kharif 2026", "qty": 75.0},
            {"name": "Groundnut", "variety": "Kadiri-6", "season": "Kharif 2026", "qty": 35.0},
        ]
    },
    {
        "phone": "9014220155",
        "name": "Venkatesh Varma",
        "farmer_id": "FRM-AP-40192",
        "village": "Sanivarapupeta",
        "district": "West Godavari",
        "state": "Andhra Pradesh",
        "land_area": 8.0,
        "date_of_birth": date(1987, 11, 8),
        "aadhaar_last4": "0155",
        "bank_name": "Canara Bank",
        "bank_account_masked": "•••• •••• 0155",
        "bank_ifsc": "CNRB0001092",
        "crops": [
            {"name": "Paddy (Grade A)", "variety": "MTU 1010", "season": "Kharif 2026", "qty": 90.0},
            {"name": "Sugarcane", "variety": "Co 86032", "season": "Kharif 2026", "qty": 150.0},
        ]
    }
]


def run_migrations():
    """Run idempotent ALTER TABLE commands on Aiven PostgreSQL."""
    print("[MIGRATION] Checking table schemas in Aiven PostgreSQL...")
    is_postgres = not str(engine.url).startswith("sqlite")
    
    statements = [
        # procurement_centers
        "ALTER TABLE procurement_centers ADD COLUMN IF NOT EXISTS village VARCHAR(100)" if is_postgres else "ALTER TABLE procurement_centers ADD COLUMN village VARCHAR(100)",
        "ALTER TABLE procurement_centers ADD COLUMN IF NOT EXISTS pin VARCHAR(10)" if is_postgres else "ALTER TABLE procurement_centers ADD COLUMN pin VARCHAR(10)",
        "ALTER TABLE procurement_centers ADD COLUMN IF NOT EXISTS latitude FLOAT" if is_postgres else "ALTER TABLE procurement_centers ADD COLUMN latitude FLOAT",
        "ALTER TABLE procurement_centers ADD COLUMN IF NOT EXISTS longitude FLOAT" if is_postgres else "ALTER TABLE procurement_centers ADD COLUMN longitude FLOAT",
        "ALTER TABLE procurement_centers ADD COLUMN IF NOT EXISTS contact_number VARCHAR(25)" if is_postgres else "ALTER TABLE procurement_centers ADD COLUMN contact_number VARCHAR(25)",
        "ALTER TABLE procurement_centers ADD COLUMN IF NOT EXISTS operating_hours VARCHAR(50) DEFAULT '06:00 AM – 06:00 PM'" if is_postgres else "ALTER TABLE procurement_centers ADD COLUMN operating_hours VARCHAR(50) DEFAULT '06:00 AM – 06:00 PM'",
        "ALTER TABLE procurement_centers ADD COLUMN IF NOT EXISTS operating_status VARCHAR(30) DEFAULT 'OPEN'" if is_postgres else "ALTER TABLE procurement_centers ADD COLUMN operating_status VARCHAR(30) DEFAULT 'OPEN'",
        "ALTER TABLE procurement_centers ADD COLUMN IF NOT EXISTS daily_farmer_capacity INTEGER DEFAULT 100" if is_postgres else "ALTER TABLE procurement_centers ADD COLUMN daily_farmer_capacity INTEGER DEFAULT 100",
        "ALTER TABLE procurement_centers ADD COLUMN IF NOT EXISTS daily_quantity_capacity FLOAT DEFAULT 2000.0" if is_postgres else "ALTER TABLE procurement_centers ADD COLUMN daily_quantity_capacity FLOAT DEFAULT 2000.0",
        "ALTER TABLE procurement_centers ADD COLUMN IF NOT EXISTS weighing_scales INTEGER DEFAULT 2" if is_postgres else "ALTER TABLE procurement_centers ADD COLUMN weighing_scales INTEGER DEFAULT 2",
        "ALTER TABLE procurement_centers ADD COLUMN IF NOT EXISTS storage_cap_qtl FLOAT DEFAULT 5000.0" if is_postgres else "ALTER TABLE procurement_centers ADD COLUMN storage_cap_qtl FLOAT DEFAULT 5000.0",
        "ALTER TABLE procurement_centers ADD COLUMN IF NOT EXISTS disruption_alert VARCHAR(255)" if is_postgres else "ALTER TABLE procurement_centers ADD COLUMN disruption_alert VARCHAR(255)",

        # farmers
        "ALTER TABLE farmers ADD COLUMN IF NOT EXISTS state VARCHAR(100) DEFAULT 'Andhra Pradesh'" if is_postgres else "ALTER TABLE farmers ADD COLUMN state VARCHAR(100) DEFAULT 'Andhra Pradesh'",
        "ALTER TABLE farmers ADD COLUMN IF NOT EXISTS aadhaar_last4 VARCHAR(4)" if is_postgres else "ALTER TABLE farmers ADD COLUMN aadhaar_last4 VARCHAR(4)",
        "ALTER TABLE farmers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100)" if is_postgres else "ALTER TABLE farmers ADD COLUMN bank_name VARCHAR(100)",
        "ALTER TABLE farmers ADD COLUMN IF NOT EXISTS bank_account_masked VARCHAR(50)" if is_postgres else "ALTER TABLE farmers ADD COLUMN bank_account_masked VARCHAR(50)",
        "ALTER TABLE farmers ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(20)" if is_postgres else "ALTER TABLE farmers ADD COLUMN bank_ifsc VARCHAR(20)",
        "ALTER TABLE farmers ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) DEFAULT 'VERIFIED'" if is_postgres else "ALTER TABLE farmers ADD COLUMN verification_status VARCHAR(30) DEFAULT 'VERIFIED'",

        # slots & bookings
        "ALTER TABLE slots ADD COLUMN IF NOT EXISTS grace_window_minutes INTEGER DEFAULT 15" if is_postgres else "ALTER TABLE slots ADD COLUMN grace_window_minutes INTEGER DEFAULT 15",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS retry_used BOOLEAN DEFAULT FALSE" if is_postgres else "ALTER TABLE bookings ADD COLUMN retry_used BOOLEAN DEFAULT 0",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS missed_at TIMESTAMP" if is_postgres else "ALTER TABLE bookings ADD COLUMN missed_at DATETIME",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS original_slot_id INTEGER REFERENCES slots(id)" if is_postgres else "ALTER TABLE bookings ADD COLUMN original_slot_id INTEGER",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_offered_at TIMESTAMP" if is_postgres else "ALTER TABLE bookings ADD COLUMN reschedule_offered_at DATETIME",
    ]

    for stmt in statements:
        try:
            with engine.begin() as conn:
                conn.execute(text(stmt))
        except Exception:
            pass  # Already exists or not applicable

    Base.metadata.create_all(bind=engine)
    print("[MIGRATION] Tables checked and updated successfully.")


def seed_database():
    """
    Seeds real procurement centers, real counters, slots, authentic farmer profiles,
    crops, and active queue tokens in Aiven Cloud PostgreSQL.
    """
    run_migrations()

    db: Session = SessionLocal()
    try:
        # 1. Upsert Real Procurement Centers
        print("[INFO] Seeding Real Procurement Centers...")
        for cdata in REAL_CENTERS:
            center = db.query(ProcurementCenter).filter(ProcurementCenter.id == cdata["id"]).first()
            if not center:
                center = ProcurementCenter(id=cdata["id"])
                db.add(center)
            
            center.name = cdata["name"]
            center.location = cdata["location"]
            center.district = cdata["district"]
            center.village = cdata["village"]
            center.pin = cdata["pin"]
            center.latitude = cdata["latitude"]
            center.longitude = cdata["longitude"]
            center.contact_number = cdata["contact_number"]
            center.operating_hours = cdata["operating_hours"]
            center.operating_status = cdata["operating_status"]
            center.capacity = cdata["capacity"]
            center.daily_farmer_capacity = cdata["daily_farmer_capacity"]
            center.daily_quantity_capacity = cdata["daily_quantity_capacity"]
            center.weighing_scales = cdata["weighing_scales"]
            center.storage_cap_qtl = cdata["storage_cap_qtl"]
            center.disruption_alert = cdata["disruption_alert"]
            center.status = "normal"
        
        db.commit()
        print("[SUCCESS] Real Procurement Centers updated in database.")

        # 2. Seed Real Counters for Centers
        print("[INFO] Verifying Counters for all Centers...")
        for cdata in REAL_CENTERS:
            cid = cdata["id"]
            existing = db.query(Counter).filter(Counter.center_id == cid).all()
            if len(existing) < cdata["weighing_scales"]:
                for counter_idx in range(len(existing) + 1, cdata["weighing_scales"] + 1):
                    specialty = "paddy" if counter_idx == 1 else None
                    c_name = f"Counter {counter_idx} ({'Paddy' if specialty else 'General'})"
                    db.add(Counter(
                        center_id=cid,
                        name=c_name,
                        specialty_crop=specialty,
                        accepts_general_when_idle=True,
                        status="ACTIVE"
                    ))
        db.commit()

        # 3. Seed Operational Slots for Today through Next 7 Days
        print("[INFO] Verifying Operational Slots for Centers...")
        today = date.today()
        slot_schedules = [
            (time(6, 0), time(8, 0)),
            (time(8, 0), time(10, 30)),
            (time(10, 30), time(13, 0)),
            (time(14, 0), time(16, 30)),
            (time(16, 30), time(18, 0)),
        ]
        all_centers = db.query(ProcurementCenter).all()
        for center in all_centers:
            for day_offset in range(8):
                slot_date = today + timedelta(days=day_offset)
                existing_for_day = db.query(Slot).filter(Slot.center_id == center.id, Slot.date == slot_date).first()
                if not existing_for_day:
                    for start_t, end_t in slot_schedules:
                        db.add(Slot(
                            center_id=center.id,
                            date=slot_date,
                            start_time=start_t,
                            end_time=end_t,
                            capacity=25,
                            booked_count=0
                        ))
        db.commit()

        # 4. Seed Real Farmer Profiles & Real Crops
        print("[INFO] Seeding Real Farmers & Crop Records...")
        default_hash = "$2b$12$Kixb0rNntn6o1vWf58YHTey/3hE.dE9b8xI1vX7Rz/5H1B1gX8/0a"
        for fdata in REAL_FARMERS:
            user = db.query(User).filter(User.phone == fdata["phone"]).first()
            if not user:
                user = User(
                    name=fdata["name"],
                    phone=fdata["phone"],
                    hashed_password=default_hash,
                    role="FARMER"
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            else:
                user.name = fdata["name"]

            farmer = db.query(Farmer).filter(Farmer.user_id == user.id).first()
            if not farmer:
                farmer = Farmer(user_id=user.id, farmer_id=fdata["farmer_id"])
                db.add(farmer)
                db.commit()
                db.refresh(farmer)

            farmer.farmer_id = fdata["farmer_id"]
            farmer.village = fdata["village"]
            farmer.district = fdata["district"]
            farmer.state = fdata["state"]
            farmer.land_area = fdata["land_area"]
            farmer.date_of_birth = fdata["date_of_birth"]
            farmer.aadhaar_last4 = fdata["aadhaar_last4"]
            farmer.bank_name = fdata["bank_name"]
            farmer.bank_account_masked = fdata["bank_account_masked"]
            farmer.bank_ifsc = fdata["bank_ifsc"]
            farmer.verification_status = "VERIFIED"

            # Register crops
            for crop_info in fdata["crops"]:
                existing_crop = db.query(Crop).filter(
                    Crop.farmer_id == farmer.id,
                    Crop.crop_name == crop_info["name"]
                ).first()
                if not existing_crop:
                    db.add(Crop(
                        farmer_id=farmer.id,
                        crop_name=crop_info["name"],
                        variety=crop_info["variety"],
                        season=crop_info["season"],
                        quantity=crop_info["qty"],
                        remaining_quantity=crop_info["qty"],
                        status="ACTIVE"
                    ))
        db.commit()

        # Seed Center Operator User & Admin User
        if not db.query(User).filter(User.phone == "9000000001").first():
            db.add(User(name="Mandi Console Operator", phone="9000000001", hashed_password=default_hash, role="CENTER_OPERATOR"))
        if not db.query(User).filter(User.phone == "9000000002").first():
            db.add(User(name="State Procurement Director", phone="9000000002", hashed_password=default_hash, role="ADMIN"))
        db.commit()

        # 5. Ensure Live Queue Bookings for Today so live congestion is real
        first_center = db.query(ProcurementCenter).filter(ProcurementCenter.id == 1).first()
        today_slot = db.query(Slot).filter(Slot.center_id == 1, Slot.date == today).first()
        farmer1 = db.query(Farmer).first()
        if first_center and today_slot and farmer1:
            existing_today_booking = db.query(Booking).filter(
                Booking.center_id == 1,
                Booking.booking_date == today
            ).first()
            if not existing_today_booking:
                paddy = db.query(Crop).filter(Crop.farmer_id == farmer1.id).first()
                b1 = Booking(
                    farmer_id=farmer1.id,
                    center_id=1,
                    crop_id=paddy.id if paddy else None,
                    token_number="PDC-LIVE01",
                    quantity=30.0,
                    booking_date=today,
                    slot_id=today_slot.id,
                    status="ARRIVED",
                    price=71070.0,
                    payment_status="PENDING",
                    checked_in=True,
                    arrival_time=datetime.utcnow() - timedelta(minutes=25),
                    created_at=datetime.utcnow() - timedelta(hours=2)
                )
                b2 = Booking(
                    farmer_id=farmer1.id,
                    center_id=1,
                    crop_id=paddy.id if paddy else None,
                    token_number="PDC-LIVE02",
                    quantity=25.0,
                    booking_date=today,
                    slot_id=today_slot.id,
                    status="WAITING",
                    price=59225.0,
                    payment_status="PENDING",
                    checked_in=False,
                    created_at=datetime.utcnow() - timedelta(hours=1)
                )
                db.add_all([b1, b2])
                today_slot.booked_count += 2
                db.commit()
                print("[SUCCESS] Live queue bookings seeded for Center 1.")

        print("[COMPLETE] Aiven PostgreSQL seeding completed successfully!")
    except Exception as e:
        db.rollback()
        print("[ERROR] Seeding failed:", e)
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
