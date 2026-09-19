import asyncio
import uuid
import os
from datetime import datetime, timedelta, timezone

# Ensure UTC context if possible
os.environ['TZ'] = 'UTC'

from httpx import AsyncClient, ASGITransport
from database import SessionLocal
from models import Booking, Slot, Farmer
from main import app
from auth.dependencies import get_current_user
from models import User

async def run_timezone_test():
    db = SessionLocal()
    
    # 1. We know IST now is
    ist_now = (datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)).replace(tzinfo=None)
    center_id = 1
    
    farmer = db.query(Farmer).first()
    
    # Create or update a slot that ended a few minutes ago in IST, plus grace window elapsed
    slot = db.query(Slot).filter(Slot.center_id == center_id).first()
    
    slot.date = ist_now.date()
    # Let's say it ended 15 minutes ago, and grace window is 10 minutes (so it's 5 minutes past grace limit)
    end_time = ist_now - timedelta(minutes=15)
    slot.end_time = end_time.time()
    slot.grace_window_minutes = 10
    
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

    async def override_get_current_user():
        return User(id=farmer.user_id, name="Test User", phone="9999999999", role="FARMER")
    
    app.dependency_overrides[get_current_user] = override_get_current_user

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        print("Calling sweep API...")
        r_sweep = await client.post(f"/queue/center/{center_id}/sweep-missed")
        assert r_sweep.status_code == 200, f"Sweep failed: {r_sweep.text}"
        
        db.refresh(b1)
        print(f"Booking status is: {b1.status}")
        assert b1.status == "MISSED_WINDOW", f"Expected MISSED_WINDOW, got {b1.status}"
        print("-> Missed window flag works correctly based on explicit IST delta!")
        
if __name__ == "__main__":
    asyncio.run(run_timezone_test())
