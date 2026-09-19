# DQA Engine — Dynamic Queue Allocation

**This is the standalone Dynamic Queue Allocation decision engine — procurement/processing capacity, FCFS, bounded-fairness priority, counter specialization, rolling service-time estimation, and event-driven re-allocation with ETA recomputation — built to be integrated into the FarmerProc backend without modification.**

---

## Overview

The DQA engine is a pure Python scheduling library with zero framework dependencies. It answers the question: _given the current farmers, their quantities, procurement capacity, queue state, available counters, and processing-time history — who should be served next, by which counter, and what is their expected waiting time?_

No FastAPI routes, no SQLAlchemy models, no database access, no network I/O, no notification dispatch. Input is function arguments; output is typed `@dataclass` objects ready for `json.dumps`.

---

## Package Layout

```
dqa/
├── __init__.py            # Public exports
├── models.py              # All @dataclass entities
├── exceptions.py          # Typed domain exceptions
├── capacity.py            # Dual-gate capacity verification
├── priority.py            # Priority eligibility predicate
├── fairness.py            # Bounded-interleaving priority scheduler
├── eta.py                 # Split-load ETA + rolling average
├── engine.py              # DQAEngine — single public entry point
├── simulation.py          # Standalone 10-step demo (python -m dqa.simulation)
├── tests/                 # pytest suite mirroring all modules
└── README.md              # This file
```

---

## Installation

No external dependencies required beyond a standard Python 3.11+ installation.

```bash
# From the repo root:
pip install pytest   # for running the test suite only
```

---

## Quick Start (FastAPI Integration — read this section first)

**To wire DQA into FastAPI in under an hour, you only need to know five calls:**

```python
from dqa import DQAEngine, Crop, Counter, ProcurementCapacity, FarmerRequest

# 1. Instantiate one engine per centre (at worker startup or from DB state):
engine = DQAEngine(
    crops={"paddy": Crop("paddy", avg_service_min_per_qtl=3.5), ...},
    counters=[Counter("counter-1", specialty=None), ...],
    capacities=[ProcurementCapacity("paddy", total_qtl=1000.0), ...],
    centre_id="centre-bhimavaram-01",
)

# 2. Farmer arrives at the gate → POST /bookings
decision = engine.add_booking(FarmerRequest(...))
# decision.accepted, .allocation_reason, .estimated_wait_minutes are ready to serialize.
# On rejection: decision.accepted=False, decision.allocation_reason="REJECTED_PROCUREMENT_CAPACITY_EXCEEDED"

# 3. Counter operator presses "Complete" → PATCH /bookings/{id}/complete
next_decisions = engine.complete_booking(booking_id, actual_service_minutes=42.0)
# Returns list of AllocationDecision for the next farmer assigned.

# 4. Farmer doesn't show up → PATCH /bookings/{id}/no-show
result = engine.mark_no_show(booking_id)   # {"event": "NO_SHOW", "new_status": ...}

# 5. Frontend polls for live queue → GET /queue/eta
entries = engine.recalculate_eta()
# Returns list of QueueEntry with estimated_wait_minutes, eta_timestamp, queue_position.
```

**All return values are flat dataclasses. Use `dataclasses.asdict(decision)` to get a dict for `jsonable_encoder` in FastAPI.**

---

## HTTP Status Mapping for Exceptions

| Exception | HTTP status |
|---|---|
| `CapacityExceededError` | 422 Unprocessable Entity |
| `UnknownBookingError` | 404 Not Found |
| `UnknownCounterError` | 404 Not Found |
| `InvalidStateTransitionError` | 409 Conflict |
| `UnknownCropError` | 422 Unprocessable Entity |

```python
# FastAPI exception handler example:
from dqa.exceptions import CapacityExceededError
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(CapacityExceededError)
async def capacity_handler(request: Request, exc: CapacityExceededError):
    return JSONResponse(status_code=422, content={"detail": str(exc), "remaining_qtl": exc.available_qtl})
```

---

## Key Design Decisions

### Rolling Average Scope
**Default: per-crop global** (`state.crops[crop].avg_service_min_per_qtl`). Specialty counters also maintain a per-(crop, counter) rate (`state.per_counter_rolling_rates[counter_id][crop]`) which is used when a counter_id is provided to `estimate_service_minutes`. The backend team can inspect both scopes; the global rate is the conservative estimate for ETA display.

### Split-Load ETA
ETA for a waiting farmer is computed as the **minimum remaining workload across all eligible counters**, not a naive single-queue serialisation. This correctly reflects the parallel nature of multi-counter centres and is the primary reason downstream ETAs are accurate. See `eta.py` for the detailed algorithm description.

### Bounded-Interleaving Fairness
At most `priority_ratio` (default: 1) priority farmers may be served within any `queue_window` (default: 5) consecutive allocation events. This is enforced via a sliding window over `allocation_history`. Normal farmers can never wait behind more than `priority_ratio` consecutive priority farmers — starvation is deterministically bounded. See `fairness.py` for complexity analysis.

### Allocation Reason Codes
All `allocation_reason` values are machine-checkable closed-set strings (never free text) defined in `models.AllocationReason`. Backend teams can safely localize or translate these.

| Code | Meaning |
|---|---|
| `FCFS_ELIGIBLE` | Normal FCFS serving |
| `PRIORITY_WITHIN_FAIRNESS_LIMIT` | Priority farmer served within window |
| `PRIORITY_DEFERRED_FAIRNESS_LIMIT` | Priority farmer deferred; window full |
| `COUNTER_SPECIALTY_MATCH` | Counter specialty matches farmer's crop |
| `COUNTER_GENERAL_FALLBACK` | Specialty counter serving non-specialty crop |
| `REJECTED_PROCUREMENT_CAPACITY_EXCEEDED` | Hard quota rejection |
| `NO_ELIGIBLE_COUNTER_AVAILABLE` | No counter can serve this crop |
| `QUEUED_PENDING_PROCESSING_CAPACITY` | Accepted but no time window available now |
| `REQUEUED_COUNTER_DISABLED` | Counter went offline; farmer requeued at front |

---

## Running Tests

```bash
pytest dqa/tests/ -v
```

## Running the Simulation

```bash
python -m dqa.simulation
```

The simulation models 10 scenarios (initial arrivals, rolling average shifts, no-show retry, cancellations, mid-simulation farmer, capacity exhaustion, hard rejection, cross-centre recommendation, counter disable/re-enable) with `assert_invariants()` called after each step.
