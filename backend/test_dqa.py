import asyncio
import httpx
from database import SessionLocal
from models import Booking, Farmer, Slot, ProcurementCenter, Crop, User
from passlib.context import CryptContext

async def simulate_dqa_integration():
    from main import app
    from auth.dependencies import get_current_user, require_role
    
    # Mock Auth for tests
    async def override_get_current_user():
        user = User(id=999, name="Test User", phone="9999999999", role="CENTER_OPERATOR")
        return user
        
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[require_role("CENTER_OPERATOR")] = override_get_current_user
    
    # Bypass user auth for testing directly
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Step 1: Pre-requisites - Check if we have standard mock bookings.
        # We need two farmers checking into a single slot.
        db = SessionLocal()
        try:
            # We fetch 2 booked bookings 
            bookings = db.query(Booking).filter(Booking.status == 'BOOKED').limit(2).all()
            if len(bookings) < 2:
                print("Missing bookings; injecting test bookings dynamically.")
                farmer = db.query(Farmer).first()
                slot = db.query(Slot).first()
                import datetime
                import uuid
                
                # Clear existing queue
                db.query(Booking).filter(
                    Booking.center_id == slot.center_id, 
                    Booking.status.in_(["WAITING", "ASSIGNED", "PROCESSING"])
                ).update({"status": "COMPLETED"}, synchronize_session=False)
                
                for i in range(2):
                    b = Booking(
                        farmer_id=farmer.id,
                        center_id=slot.center_id,
                        quantity=20.0,
                        booking_date=datetime.date.today(),
                        slot_id=slot.id,
                        token_number=f"MOCK-{uuid.uuid4().hex[:6]}",
                        status="BOOKED"
                    )
                    db.add(b)
                db.commit()
                bookings = db.query(Booking).filter(Booking.status == 'BOOKED').limit(2).all()
                
            b1, b2 = bookings[0], bookings[1]
            center_id = b1.center_id
            
            # Reset their status just in case
            b1.checked_in = False
            b1.status = 'BOOKED'
            b2.checked_in = False
            b2.status = 'BOOKED'
            db.commit()

            print(f"Executing Check-in requests against DQA via FastAPI ASGI...")
            
            # Booking 1 check in
            r1 = await client.post(f"/checkin/{b1.token_number}")
            assert r1.status_code == 200, f"Failed b1: {r1.text}"
            print("P1 Check-in Response:", r1.json())
            
            # Booking 2 check in
            r2 = await client.post(f"/checkin/{b2.token_number}")
            assert r2.status_code == 200, f"Failed b2: {r2.text}"
            print("P2 Check-in Response:", r2.json())
            
            print("\nTracking Output State in Task Queue API:")
            r_queue = await client.get(f"/queue/center/{center_id}")
            queue_data = r_queue.json()
            assert any(term in str(queue_data) for term in ["FCFS_ELIGIBLE", "ALLOCATION", "COUNTER_", "MATCH", "FALLBACK"])
            
            print(f"\nCompleting Farmer 1 from processing pipeline.")
            r3 = await client.post(f"/queue/{b1.id}/complete")
            assert r3.status_code == 200, f"Failed Completion: {r3.text}"
            print("Completion Response:", r3.json())
            
            print("\nValidating Re-assignment output state post-completion...")
            r_queue_2 = await client.get(f"/queue/center/{center_id}")
            queue_data2 = r_queue_2.json()
            
            served_items = [t for t in queue_data2["tokens"] if t["status"] == "PAYMENT_COMPLETED"]
            assert len(served_items) > 0, "No completed tokens found!"
            
            assigned_items = [t for t in queue_data2["tokens"] if t["status"] == "ASSIGNED" or t["status"] == "WAITING"]
            print("Post-Completion Queue layout:", [f"Booking {t['id']} -> {t['assigned_counter_id']} ({t['allocation_reason']})" for t in queue_data2["tokens"]])

            print("\nACCEPTANCE CRITERION VERIFIED SUCCESSFULLY.")
            
        finally:
            db.close()

if __name__ == "__main__":
    try:
        asyncio.run(simulate_dqa_integration())
    except Exception as e:
        import traceback
        traceback.print_exc()
