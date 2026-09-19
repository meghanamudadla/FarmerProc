from sqlalchemy.orm import Session
from datetime import datetime
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
    # Since we do not strictly model Counter entities yet in models.py, we will default
    # to 2 generic active counters as per acceptance criteria tests.
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
        farmer_req = FarmerRequest(
            farmer_id=str(b.farmer_id),
            crop=b.crop.crop_name.lower() if b.crop else "paddy",
            quantity_qtl=b.quantity,
            arrival_time=b.arrival_time.isoformat() if b.arrival_time else b.created_at.isoformat(),
            age=40, # default age mock
            land_area_acres=b.farmer.land_area if b.farmer and b.farmer.land_area else 2.0,
            token_number=b.token_number
        )
        engine.add_booking(farmer_req)
        
    _engines[center_id] = engine
    return engine
