import asyncio
import uuid
from httpx import AsyncClient
from database import SessionLocal
from models import Booking, Slot, Farmer
from datetime import datetime, timedelta

async def run_integration_test():
    db = SessionLocal()
    
    # 1. Setup mock backdated slot and booking
    now = datetime.now()
    center_id = 1
    
    farmer = db.query(Farmer).first()
    
    # Find any slot and mutate it to be strictly expired to force sweep processing
    slot = db.query(Slot).filter(Slot.center_id == center_id).first()
    
    # Temporarily modify slot timeline properties to instantly trigger the boundary expiration logic
    original_slot_date = slot.date
    original_slot_end = slot.end_time
    original_slot_grace = slot.grace_window_minutes
    
    slot.date = (now - timedelta(days=1)).date()
    slot.end_time = now.time()
    slot.grace_window_minutes = 0 # Immediate expiration
    
    original_slot_capacity_before = slot.booked_count

    b1 = Booking(
        farmer_id=farmer.id,
        center_id=center_id,
        quantity=20.0,
        booking_date=slot.date,
        slot_id=slot.id,
        token_number=f"NOSHOW-{uuid.uuid4().hex[:4]}",
        status="BOOKED",
        checked_in=False
    )
    db.add(b1)
    slot.booked_count += 1
    db.commit()
    db.refresh(b1)
    db.refresh(slot)

    from main import app
    from auth.dependencies import get_current_user
    from models import User
    
    # Dependency injection bypassing strict OAuth
    async def override_get_current_user():
        return User(id=farmer.user_id, name="Test User", phone="9999999999", role="FARMER")
    
    app.dependency_overrides[get_current_user] = override_get_current_user

    from httpx import ASGITransport
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
    
        # A. Trigger Sweep API
        print("Calling sweep API...")
        r_sweep = await client.post(f"/queue/center/{center_id}/sweep-missed")
        assert r_sweep.status_code == 200, f"Sweep failed: {r_sweep.text}"
        
        db.refresh(b1)
        assert b1.status == "MISSED_WINDOW"
        print("-> First miss triggered properly: status=MISSED_WINDOW")
        print(f"-> Tracking {r_sweep.json()}")

        # B. Offer Reschedule
        print("\nRequesting reschedule offer...")
        r_offer = await client.post(f"/bookings/{b1.id}/reschedule-offer")
        assert r_offer.status_code == 200, f"Offer failed: {r_offer.text}"
        offer_data = r_offer.json()
        new_slot_id = offer_data["candidate_slot_id"]
        print(f"-> Selected Candidate Slot: ID {new_slot_id}")
        
        # Capture raw counter on next slot before accept
        new_slot = db.query(Slot).filter(Slot.id == new_slot_id).first()
        pre_accept_counter = new_slot.booked_count
        
        # C. Accept Reschedule
        print("\nAccepting reschedule offer...")
        r_accept = await client.post(f"/bookings/{b1.id}/reschedule-accept?slot_id={new_slot_id}")
        assert r_accept.status_code == 200, f"Accept failed: {r_accept.text}"
        
        db.refresh(b1)
        db.refresh(slot)
        db.refresh(new_slot)
        
        assert b1.status == "RESCHEDULED"
        assert b1.slot_id == new_slot_id
        assert b1.retry_used == True
        assert slot.booked_count == original_slot_capacity_before # Decremented / restored!
        assert new_slot.booked_count == pre_accept_counter + 1      # Incremented!
        print(f"-> Reschedule accepted!")
        print(f"-> Original slot capacity restored correctly.")

        # D. Trigger Second Miss Cancellation
        # Mutate the newly offered slot timeline forcing expiration identical to prior sequence
        original_new_slot_date = new_slot.date
        original_new_slot_end = new_slot.end_time
        original_new_slot_grace = new_slot.grace_window_minutes
        
        new_slot.date = (now - timedelta(days=1)).date()
        new_slot.end_time = now.time()
        new_slot.grace_window_minutes = 0
        db.commit()

        print("\nCalling sweep API again to trigger second miss algorithm limit...")
        r_sweep2 = await client.post(f"/queue/center/{center_id}/sweep-missed")
        assert r_sweep2.status_code == 200
        
        db.refresh(b1)
        db.refresh(new_slot)
        
        assert b1.status == "CANCELLED"
        # The sweep decrements the atomic limit upon strict cancellation effectively re-opening the pool
        assert new_slot.booked_count == pre_accept_counter 
        
        print("-> Second miss executed successfully! Double-cancellation logic preserved.")
        print("-> Final slot properties restored natively via atomic un-bind clause.")
        
    print("\nALL ACCEPTANCE CRITERIA VERIFIED LOGICALLY!")

if __name__ == "__main__":
    asyncio.run(run_integration_test())
