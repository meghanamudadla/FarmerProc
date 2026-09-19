from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import json
from models import ProcurementCenter, Booking, Crop as DBCrop, Slot
from dqa import DQAEngine, Crop, Counter, ProcurementCapacity, FarmerRequest, QueueStatus

_engines: dict[int, DQAEngine] = {}

_DEFAULT_CROP_RATES = {
    "paddy": 3.5,
    "cotton": 6.0,
    "maize": 4.0,
    "wheat": 4.5,
}
_FALLBACK_RATE = 4.0  # used only for crop names not in the table above

def get_engine(center_id: int, db: Session) -> DQAEngine:
    """Returns the singleton DQA Engine for the given center ID, initializing it if necessary."""
    # Trade-off notes: The DQA Engine is instantiated in-memory as a singleton per ProcurementCenter.
    # It maintains internal states like running ETA timelines and working capacity limits.

    # While DB rows are the source of truth, reading them all out repetitively destroys scale.
    # We initialize lazily here on first use (assuming 1 Uvicorn worker for now, or sticky sessions).
    
    if center_id in _engines:
        return _engines[center_id]
        
    print(f"Initializing new DQAEngine for Center {center_id}")
    
    # 1. Look up ProcurementCenter
    center = db.query(ProcurementCenter).filter(ProcurementCenter.id == center_id).first()
    capacity_val = center.capacity if center else 100
    
    # 2. Build Generic Crops from all known crops in Database generically 
    # (using predefined starting points)
    db_crops = db.query(DBCrop).all()
    crop_info = {}
    for c in db_crops:
        name = c.crop_name.lower()
        if name not in crop_info:
            rate = _DEFAULT_CROP_RATES.get(name, _FALLBACK_RATE)
            crop_info[name] = Crop(name=name, avg_service_min_per_qtl=rate)
            
    # Default fallback
    if "paddy" not in crop_info:
        rate = _DEFAULT_CROP_RATES.get("paddy", _FALLBACK_RATE)
        crop_info["paddy"] = Crop(name="paddy", avg_service_min_per_qtl=rate)
        
    # 3. Build Counters
    from models import Counter as DBCounter
    db_counters = db.query(DBCounter).filter(
        DBCounter.center_id == center_id,
        DBCounter.status == "ACTIVE"
    ).all()

    counters = []
    if db_counters:
        for c in db_counters:
            counters.append(Counter(
                counter_id=str(c.id),
                specialty=c.specialty_crop,
                accepts_general_when_idle=c.accepts_general_when_idle
            ))
    else:
        print(f"WARNING: No active DB counters found for center {center_id}. Falling back to 2 generic placeholders.")
        counters = [
            Counter(counter_id=f"{center_id}-1"),
            Counter(counter_id=f"{center_id}-2")
        ]
    
    # 4. Build capacities
    capacities = []
    for c in crop_info.values():
        capacities.append(ProcurementCapacity(crop=c.name, total_qtl=float(capacity_val * 100)))

    engine = DQAEngine(
        centre_id=str(center_id),
        crops=crop_info,
        counters=counters,
        capacities=capacities
    )
    
    # 5. Hydrate Engine with currently pending bookings
    existing_bookings = db.query(Booking).filter(
        Booking.center_id == center_id,
        Booking.status.in_([QueueStatus.WAITING.value, QueueStatus.ASSIGNED.value, QueueStatus.PROCESSING.value])
    ).order_by(Booking.arrival_time.asc()).all()
    
    for b in existing_bookings:
        # Determine actual age based on DOB
        now = (datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)).replace(tzinfo=None)
        if b.farmer and b.farmer.date_of_birth:
            age = now.year - b.farmer.date_of_birth.year - ((now.month, now.day) < (b.farmer.date_of_birth.month, b.farmer.date_of_birth.day))
        else:
            age = 40  # Default fallback not-elderly

        farmer_req = FarmerRequest(
            farmer_id=str(b.farmer_id),
            crop=b.crop.crop_name.lower() if b.crop else "paddy",
            quantity_qtl=b.quantity,
            arrival_time=b.arrival_time.isoformat() if b.arrival_time else b.created_at.isoformat(),
            age=age,
            land_area_acres=b.farmer.land_area if b.farmer and b.farmer.land_area else 2.0,
            token_number=b.token_number
        )
        engine.add_booking(farmer_req)
        
    _engines[center_id] = engine
    return engine
