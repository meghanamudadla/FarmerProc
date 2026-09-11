"""
DQA (Dynamic Queue Allocation) — lightweight engine for FarmerProc.

Adapted from the standalone DQA design at
https://github.com/meghanamudadla/FarmerProc/tree/main/dqa — a pure-Python
scheduling library (capacity gates, bounded-fairness priority, split-load
ETA). This package ports the core ideas (priority eligibility, sliding-window
fairness, multi-counter split-load ETA) into a stateless, DB-driven form that
runs per-request against FarmerProc's existing Booking/Crop/Slot tables,
rather than maintaining a long-lived in-memory QueueState.

No database access happens in this package — callers (the FastAPI routes)
build FarmerRequest/ExistingBooking objects from real rows and pass them in.
"""

from .models import FarmerRequest, ExistingEntry, DynamicEtaResult
from .priority import is_priority
from .engine import compute_dynamic_eta, estimate_service_minutes, crop_rate_per_qtl

__all__ = [
    "FarmerRequest",
    "ExistingEntry",
    "DynamicEtaResult",
    "is_priority",
    "compute_dynamic_eta",
    "estimate_service_minutes",
    "crop_rate_per_qtl",
]
