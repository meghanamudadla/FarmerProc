import asyncio
import httpx
from datetime import date
import sys

from auth.dependencies import get_current_user
from database import get_db, SessionLocal
from models import User, Farmer, Crop, Slot
from main import app

async def test_concurrency():
    print("Testing atomic booking fix...")
    
    # Mock user dependency
    def override_get_current_user():
        db = SessionLocal()
        try:
            # Get the demo farmer
            user = db.query(User).filter(User.phone == "9876543210").first()
            return user
        finally:
            db.close()
            
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    # Use ASGI transport instead of live server
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testServer") as client:
        
        print("Finding slot and crop from DB directly...")
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.phone == "9876543210").first()
            farmer = db.query(Farmer).filter(Farmer.user_id == user.id).first()
            crop = db.query(Crop).filter(Crop.farmer_id == farmer.id).first()
            
            # Clear existing bookings for this farmer to prevent "already booked" errors
            from models import Booking, Procurement, Payment, QualityCheck, Weighment
            
            # Cascading deletes
            for b in db.query(Booking).filter(Booking.farmer_id == farmer.id).all():
                db.query(Payment).filter(Payment.procurement.has(booking_id=b.id)).delete()
                db.query(Procurement).filter(Procurement.booking_id == b.id).delete()
                db.query(QualityCheck).filter(QualityCheck.booking_id == b.id).delete()
                db.query(Weighment).filter(Weighment.booking_id == b.id).delete()
                
            db.query(Booking).filter(Booking.farmer_id == farmer.id).delete()
            db.commit()
            
            # Find an available slot on center 1
            slot = db.query(Slot).filter(Slot.center_id == 1, Slot.booked_count < Slot.capacity).first()
            
            available_spots = slot.capacity - slot.booked_count
            print(f"Target slot: {slot.id} with {available_spots} spots")
            
            if available_spots > 1:
                print(f"Forcing available spots down to 1 manually for test...")
                slot.booked_count = slot.capacity - 1
                db.commit()
                
            slot_id = slot.id
            slot_date = slot.date.isoformat()
            crop_id = crop.id
        finally:
            db.close()

        print("Testing concurrency race condition...")
        target_payload = {
            "center_id": 1,
            "crop_id": crop_id,
            "quantity": 1.0,
            "booking_date": slot_date,
            "slot_id": slot_id
        }
        
        # Fire concurrent tasks
        print("Firing 2 concurrent booking requests for 1 slot spot...")
        tasks = [
            client.post("/bookings/", json=target_payload),
            client.post("/bookings/", json=target_payload),
        ]
        
        results = await asyncio.gather(*tasks)
        status_codes = [r.status_code for r in results]
        
        print("Resulting Status Codes:", status_codes)
        for r in results:
            print("Response:", r.json())
        
        assert status_codes.count(200) == 1, f"Expected exactly one 200 OK, got {status_codes.count(200)}"
        assert status_codes.count(400) == 1, f"Expected exactly one 400 Bad Request (full slot), got {status_codes.count(400)}"
        
        print("\n[SUCCESS] Race condition resolved! Only 1 booking went through.")

if __name__ == "__main__":
    asyncio.run(test_concurrency())
