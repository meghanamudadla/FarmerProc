"""
DQA Engine — dynamic queue position + split-load ETA preview.

Ported from the reference engine's engine.py + eta.py, collapsed into a
single stateless entry point suited to a preview API call: given the new
FarmerRequest and the real existing bookings already queued at this
centre/slot, compute where the new request would land and how long it
would likely wait — using the same ideas as the reference (bounded-fairness
priority lane, split-load ETA across multiple counters) rather than a naive
"position * average time" estimate.
"""

from __future__ import annotations

from datetime import datetime, timedelta

from .fairness import simulate_serving_order, DEFAULT_PRIORITY_RATIO, DEFAULT_QUEUE_WINDOW
from .models import DynamicEtaResult, ExistingEntry, FarmerRequest
from .priority import is_priority

# Default minutes of counter time required per quintal, by crop keyword.
# These are starting estimates (matching the reference engine's example
# rates); a real rolling average from completed weighments is a natural
# next step once enough history exists.
_CROP_RATE_KEYWORDS: list[tuple[str, float]] = [
    ("paddy", 3.5),
    ("rice", 3.5),
    ("wheat", 3.0),
    ("cotton", 5.0),
    ("maize", 2.5),
    ("groundnut", 4.0),
]
_DEFAULT_RATE_PER_QTL = 4.0


def crop_rate_per_qtl(crop_name: str) -> float:
    """Minutes of processing time per quintal for this crop (keyword match)."""
    name = (crop_name or "").lower()
    for keyword, rate in _CROP_RATE_KEYWORDS:
        if keyword in name:
            return rate
    return _DEFAULT_RATE_PER_QTL


def estimate_service_minutes(crop_name: str, quantity_qtl: float) -> float:
    return quantity_qtl * crop_rate_per_qtl(crop_name)


def _num_virtual_counters(center_capacity: int) -> int:
    """Heuristic counter count: one processing line per ~25 daily-capacity units."""
    return max(1, center_capacity // 25)


def compute_dynamic_eta(
    new_request: FarmerRequest,
    existing_entries: list[ExistingEntry],
    center_capacity: int,
    priority_ratio: int = DEFAULT_PRIORITY_RATIO,
    queue_window: int = DEFAULT_QUEUE_WINDOW,
    now: datetime | None = None,
) -> DynamicEtaResult:
    """
    Compute the new request's fair queue position and split-load ETA.

    Algorithm:
    1. Build a flat entry list (existing bookings + the new request), each
       tagged with priority_lane via the small/marginal-farmer rule.
    2. Run the bounded-fairness serving-order simulation (fairness.py) to get
       the order farmers would actually be called in — not raw arrival order.
    3. Greedily assign entries to `num_counters` virtual counters in that
       order, each entry going to whichever counter currently has the least
       accumulated workload (split-load, same idea as the reference eta.py).
    4. The new request's wait = that counter's workload *before* it was
       added; service = quantity x crop rate; total = wait + service.
    """
    num_counters = _num_virtual_counters(center_capacity)

    entries: list[dict] = []
    for e in existing_entries:
        entries.append({
            "booking_id": e.booking_id,
            "crop_name": e.crop_name,
            "quantity_qtl": e.quantity_qtl,
            "priority_lane": is_priority(e.land_area_acres),
            "arrival_time": e.arrival_time,
            "token_number": e.token_number,
            "is_new": False,
        })

    new_priority = is_priority(new_request.land_area_acres)
    entries.append({
        "booking_id": None,
        "crop_name": new_request.crop_name,
        "quantity_qtl": new_request.quantity_qtl,
        "priority_lane": new_priority,
        "arrival_time": new_request.arrival_time,
        "token_number": new_request.token_number,
        "is_new": True,
    })

    serving_order = simulate_serving_order(entries, priority_ratio, queue_window)

    counter_workload = [0.0] * num_counters
    ahead_in_queue = 0
    new_wait_minutes = 0.0
    new_service_minutes = estimate_service_minutes(new_request.crop_name, new_request.quantity_qtl)
    queue_position = 1
    found = False

    for position, entry in enumerate(serving_order, start=1):
        service_minutes = estimate_service_minutes(entry["crop_name"], entry["quantity_qtl"])
        best_idx = min(range(num_counters), key=lambda i: counter_workload[i])

        if entry["is_new"]:
            new_wait_minutes = counter_workload[best_idx]
            queue_position = position
            found = True
            counter_workload[best_idx] += service_minutes
            break

        counter_workload[best_idx] += service_minutes
        ahead_in_queue += 1

    if not found:
        # Only the new request existed (empty queue) — no wait ahead of it.
        new_wait_minutes = 0.0
        queue_position = 1

    total_minutes = new_wait_minutes + new_service_minutes

    eta_timestamp = None
    if now is not None:
        eta_timestamp = (now + timedelta(minutes=total_minutes)).isoformat(timespec="seconds")

    if new_priority:
        reason = "PRIORITY_WITHIN_FAIRNESS_LIMIT" if new_wait_minutes < 1e-9 or queue_position <= priority_ratio else "PRIORITY_LANE_QUEUED"
    else:
        reason = "FCFS_ELIGIBLE"

    return DynamicEtaResult(
        queue_position=queue_position,
        estimated_wait_minutes=round(new_wait_minutes, 1),
        estimated_service_minutes=round(new_service_minutes, 1),
        estimated_total_minutes=round(total_minutes, 1),
        eta_timestamp=eta_timestamp,
        priority_lane=new_priority,
        counters_considered=num_counters,
        ahead_in_queue=ahead_in_queue,
        allocation_reason=reason,
    )
