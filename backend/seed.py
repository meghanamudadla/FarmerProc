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
    Grievance
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def seed_database():
    """
    Idempotent database seeder for FarmerProc.
    Creates tables if not present, and populates initial centers,
    slots, default accounts, crops, and demo queue tokens.
    """
    # 1. Ensure all tables exist in PostgreSQL
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        # 2. Check if centers already exist
        existing_center = db.query(ProcurementCenter).first()
        if not existing_center:
            print("[INFO] Seeding Procurement Centers...")
            centers = [
                ProcurementCenter(
                    id=1,
                    name="Kakinada APMC Mandi Center",
                    location="NH-16 Bypass Road, Market Yard Yard-2, Kakinada",
                    district="East Godavari",
                    capacity=100
                ),
                ProcurementCenter(
                    id=2,
                    name="Godavari Green Centre",
                    location="Cotton Barrage Road, Opp. AP Markfed Depot, Dowleswaram, Rajahmundry",
                    district="East Godavari",
                    capacity=120
                ),
                ProcurementCenter(
                    id=3,
                    name="Krishna Delta Purchase Point",
                    location="APMC Market Yard Gate 3, Gollapudi Bypass, Vijayawada",
                    district="NTR District",
                    capacity=90
                ),
            ]
            db.add_all(centers)
            db.commit()
            print("[SUCCESS] Procurement Centers seeded.")

        # 3. Ensure Slots exist for Centers (Today through next 7 days)
        existing_slot = db.query(Slot).first()
        if not existing_slot:
            print("[INFO] Seeding Operational Slots...")
            today = date.today()
            slots_to_add = []
            slot_schedules = [
                (time(8, 0), time(10, 30)),
                (time(10, 30), time(13, 0)),
                (time(14, 0), time(16, 30)),
            ]

            all_centers = db.query(ProcurementCenter).all()
            for center in all_centers:
                for day_offset in range(8):
                    slot_date = today + timedelta(days=day_offset)
                    for start_t, end_t in slot_schedules:
                        slots_to_add.append(
                            Slot(
                                center_id=center.id,
                                date=slot_date,
                                start_time=start_t,
                                end_time=end_t,
                                capacity=25
                            )
                        )
            db.add_all(slots_to_add)
            db.commit()
            print("[SUCCESS] Operational Slots seeded.")

        # 4. Seed Default Users
        demo_farmer_user = db.query(User).filter(User.phone == "9876543210").first()
        if not demo_farmer_user:
            print("[INFO] Seeding Default Users & Farmer Profile...")
            # Farmer login password matches the farmer app's OTP-derived scheme
            # (see App.jsx derivedBackendPassword) so this demo account works
            # through the real OTP sign-in flow, not just direct API calls.
            hashed_pw = pwd_context.hash("KS-9876543210-OTP2026")

            # Demo Farmer
            farmer_user = User(
                name="Ramesh Kumar",
                phone="9876543210",
                hashed_password=hashed_pw,
                role="FARMER"
            )
            db.add(farmer_user)
            db.commit()
            db.refresh(farmer_user)

            farmer_profile = Farmer(
                user_id=farmer_user.id,
                farmer_id="FRM-10245",
                village="Kakinada Rural",
                district="East Godavari",
                land_area=7.5
            )
            db.add(farmer_profile)
            db.commit()
            db.refresh(farmer_profile)

            # Register Crops for Demo Farmer
            paddy_crop = Crop(
                farmer_id=farmer_profile.id,
                crop_name="Paddy (Grade A)",
                variety="MTU 1010",
                season="Kharif 2026",
                quantity=80.0,
                remaining_quantity=80.0,
                status="ACTIVE"
            )
            cotton_crop = Crop(
                farmer_id=farmer_profile.id,
                crop_name="Cotton",
                variety="Bt Cotton",
                season="Kharif 2026",
                quantity=70.0,
                remaining_quantity=70.0,
                status="ACTIVE"
            )
            db.add_all([paddy_crop, cotton_crop])
            db.commit()

            # Center Operator User (Kiosk / Staff)
            operator_user = User(
                name="Mandi Console Operator",
                phone="9000000001",
                hashed_password=hashed_pw,
                role="CENTER_OPERATOR"
            )
            # Government Admin User
            admin_user = User(
                name="State Procurement Director",
                phone="9000000002",
                hashed_password=hashed_pw,
                role="ADMIN"
            )
            db.add_all([operator_user, admin_user])
            db.commit()
            print("[SUCCESS] Default Users, Farmer profile, and Crops seeded.")

        # 5. Seed sample queue tokens for Center 1 if none exist
        existing_booking = db.query(Booking).first()
        if not existing_booking:
            print("[INFO] Seeding Demo Queue Tokens for Center 1...")
            farmer = db.query(Farmer).first()
            paddy = db.query(Crop).filter(Crop.farmer_id == farmer.id).first()
            slot = db.query(Slot).filter(Slot.center_id == 1).first()

            if farmer and slot:
                demo_bookings = [
                    Booking(
                        farmer_id=farmer.id,
                        center_id=1,
                        crop_id=paddy.id if paddy else None,
                        token_number="PDC-7C18A9",
                        quantity=25.0,
                        booking_date=slot.date,
                        slot_id=slot.id,
                        status="WAITING",
                        price=59225.0,
                        payment_status="PENDING",
                        checked_in=False,
                        created_at=datetime.utcnow()
                    ),
                    Booking(
                        farmer_id=farmer.id,
                        center_id=1,
                        crop_id=paddy.id if paddy else None,
                        token_number="PDC-D38E4F",
                        quantity=30.0,
                        booking_date=slot.date,
                        slot_id=slot.id,
                        status="ARRIVED",
                        price=71070.0,
                        payment_status="PENDING",
                        checked_in=True,
                        arrival_time=datetime.utcnow(),
                        created_at=datetime.utcnow()
                    ),
                ]
                db.add_all(demo_bookings)
                db.commit()
                print("[SUCCESS] Demo Queue Tokens seeded.")

        # 6. Seed Demo Grievances if none exist
        existing_grievance = db.query(Grievance).first()
        if not existing_grievance:
            farmer = db.query(Farmer).first()
            if farmer:
                print("[INFO] Seeding Demo Grievances...")
                demo_grievances = [
                    Grievance(
                        complaint_id="CMP-2026-91823",
                        farmer_id=farmer.id,
                        transaction_id="TXN-A7E9381F02",
                        category="PAYMENT_DISPUTE",
                        description="MSP payment for Paddy Grade A batch delayed past 48hr DBT window.",
                        urgency="HIGH",
                        status="ASSIGNED",
                        assigned_department="Finance & Accounts",
                        assigned_officer="D. Anjaneyulu (Accounts Officer)",
                        created_at=datetime.utcnow() - timedelta(hours=8),
                        updated_at=datetime.utcnow()
                    ),
                    Grievance(
                        complaint_id="CMP-2026-44109",
                        farmer_id=farmer.id,
                        transaction_id="TXN-C3D2910B88",
                        category="UNFAIR_REJECTION",
                        description="Moisture meter recalibration requested for Mandi Bay #2.",
                        urgency="MEDIUM",
                        status="UNDER_REVIEW",
                        assigned_department="Quality Assurance",
                        assigned_officer="K. Venkateswarlu (QA Lead)",
                        created_at=datetime.utcnow() - timedelta(hours=14),
                        updated_at=datetime.utcnow()
                    )
                ]
                db.add_all(demo_grievances)
                db.commit()
                print("[SUCCESS] Demo Grievances seeded.")

        # 7. Seed completed demo procurement & payment if none exist
        existing_payment = db.query(Payment).first()
        if not existing_payment:
            first_farmer = db.query(Farmer).first()
            slot = db.query(Slot).filter(Slot.center_id == 1).first()
            paddy_crop = db.query(Crop).filter(Crop.farmer_id == first_farmer.id).first() if first_farmer else None
            if first_farmer and slot:
                print("[INFO] Seeding Completed Demo Procurement & Payment...")
                # Create completed booking record
                completed_booking = Booking(
                    farmer_id=first_farmer.id,
                    center_id=1,
                    crop_id=paddy_crop.id if paddy_crop else None,
                    token_number="PDC-PAID01",
                    quantity=35.0,
                    slot_id=slot.id,
                    booking_date=slot.date,
                    status="PAYMENT_COMPLETED",
                    price=82915.0,
                    payment_status="COMPLETED",
                    payment_method="DBT_DIRECT_TRANSFER",
                    checked_in=True,
                    arrival_time=datetime.utcnow() - timedelta(hours=3),
                    created_at=datetime.utcnow() - timedelta(hours=4)
                )
                db.add(completed_booking)
                db.commit()
                db.refresh(completed_booking)

                weigh_rec = Weighment(
                    booking_id=completed_booking.id,
                    weighed_bags=70,
                    gross_weight_kg=3550.0,
                    tare_weight_kg=50.0,
                    net_weight_kg=3500.0,
                    accepted_weight_kg=3500.0,
                    accepted_quintals=35.0
                )
                db.add(weigh_rec)

                qc_rec = QualityCheck(
                    booking_id=completed_booking.id,
                    moisture_percent=13.5,
                    foreign_matter_percent=0.8,
                    damaged_grains_percent=1.0,
                    slightly_damaged_percent=0.5,
                    shrivelled_broken_percent=0.5,
                    other_grains_percent=0.2,
                    weevilled_grains_percent=0.0,
                    grade="Grade A",
                    result="ACCEPTED",
                    quality_deduction=0.0
                )
                db.add(qc_rec)

                proc_rec = Procurement(
                    booking_id=completed_booking.id,
                    crop="Paddy (Grade A)",
                    quantity=35.0,
                    quality="Grade A",
                    price_per_kg=23.69,
                    total_amount=82915.0,
                    status="COMPLETED"
                )
                db.add(proc_rec)
                db.commit()
                db.refresh(proc_rec)

                pay_rec = Payment(
                    procurement_id=proc_rec.id,
                    amount=82915.0,
                    transaction_id="TXN-DBT-88912301",
                    status="PAYMENT_COMPLETED"
                )
                db.add(pay_rec)
                db.commit()
                print("[SUCCESS] Completed Demo Procurement & Payment seeded.")

        print("[COMPLETE] Database seeding completed successfully!")
    except Exception as e:
        db.rollback()
        print("[ERROR] Error during database seeding:", e)
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
