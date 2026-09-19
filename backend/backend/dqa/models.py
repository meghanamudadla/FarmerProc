"""
DQA Data Models
================
All core entities used by the Dynamic Queue Allocation engine.
No ORM, no framework types — plain dataclasses or derived properties only.

Design choice: dataclasses (not Pydantic) are used here because:
- This package has zero runtime dependencies by design.
- Runtime validation is the backend team's responsibility at the API boundary.
- All engine code validates invariants via assert_invariants(), not schema validation.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Optional


# ---------------------------------------------------------------------------
# Closed set of allocation reason codes (Section 7 / Section 13)
# Backend teams should localize/translate these strings — never parse them as
# natural language.
# ---------------------------------------------------------------------------

class AllocationReason(str, Enum):
    """Closed-set machine-checkable reason codes for allocation decisions."""
    FCFS_ELIGIBLE = "FCFS_ELIGIBLE"
    PRIORITY_WITHIN_FAIRNESS_LIMIT = "PRIORITY_WITHIN_FAIRNESS_LIMIT"
    PRIORITY_DEFERRED_FAIRNESS_LIMIT = "PRIORITY_DEFERRED_FAIRNESS_LIMIT"
    COUNTER_SPECIALTY_MATCH = "COUNTER_SPECIALTY_MATCH"
    COUNTER_GENERAL_FALLBACK = "COUNTER_GENERAL_FALLBACK"
    REJECTED_PROCUREMENT_CAPACITY_EXCEEDED = "REJECTED_PROCUREMENT_CAPACITY_EXCEEDED"
    NO_ELIGIBLE_COUNTER_AVAILABLE = "NO_ELIGIBLE_COUNTER_AVAILABLE"
    QUEUED_PENDING_PROCESSING_CAPACITY = "QUEUED_PENDING_PROCESSING_CAPACITY"
    REQUEUED_COUNTER_DISABLED = "REQUEUED_COUNTER_DISABLED"
    CONGESTION_ALTERNATE_SUGGESTED = "CONGESTION_ALTERNATE_SUGGESTED"
    TRANSFERRED_OUT = "TRANSFERRED_OUT"
    TRANSFER_DECLINED_RETAINED = "TRANSFER_DECLINED_RETAINED"


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class CounterStatus(Enum):
    ACTIVE = auto()
    INACTIVE = auto()


class QueueStatus(str, Enum):
    """Lifecycle states of a queue entry."""
    WAITING = "WAITING"
    ASSIGNED = "ASSIGNED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    NO_SHOW = "NO_SHOW"
    CANCELLED = "CANCELLED"
    RETRY_PENDING = "RETRY_PENDING"
    CONGESTION_ALTERNATE_SUGGESTED = "CONGESTION_ALTERNATE_SUGGESTED"
    TRANSFERRED_OUT = "TRANSFERRED_OUT"
    TRANSFER_DECLINED_RETAINED = "TRANSFER_DECLINED_RETAINED"


@dataclass
class CongestionSignal:
    """
    Pure data object explaining why a centre is congested for a farmer's request.

    Fields:
        reason: Description of the trigger (WAIT_THRESHOLD_EXCEEDED, PROCUREMENT_SHORTFALL, PROCESSING_EXHAUSTED).
        wait_exceeded_by: Minutes by which estimated wait exceeds threshold (0.0 if not triggered).
        procurement_shortfall_qtl: Quantity shortfall in qtl (0.0 if not triggered).
        processing_feasible: True if compatible counter can serve within operating window.
    """
    reason: str
    wait_exceeded_by: float = 0.0
    procurement_shortfall_qtl: float = 0.0
    processing_feasible: bool = True



# ---------------------------------------------------------------------------
# Core entities
# ---------------------------------------------------------------------------

@dataclass
class Crop:
    """
    Represents a crop type with its service-time rate.

    Fields:
        name: Unique crop identifier (e.g. 'paddy', 'cotton').
        avg_service_min_per_qtl: Estimated minutes of counter time required
            per quintal of this crop. Mutable — updated by the rolling average
            on each booking completion.
    """

    name: str
    avg_service_min_per_qtl: float

    def __post_init__(self) -> None:
        if self.avg_service_min_per_qtl <= 0:
            raise ValueError(
                f"avg_service_min_per_qtl must be positive, got {self.avg_service_min_per_qtl}"
            )


@dataclass
class ProcurementCapacity:
    """
    Tracks procurement quota for one crop at one centre.

    Derived property:
        available_qtl = total_qtl - reserved_qtl - procured_qtl

    Pre-condition: all qtl fields >= 0; available_qtl >= 0.
    Post-condition: procured_qtl + reserved_qtl <= total_qtl always.
    """

    crop: str
    total_qtl: float
    reserved_qtl: float = 0.0
    procured_qtl: float = 0.0

    @property
    def available_qtl(self) -> float:
        """Remaining quantity available for new bookings."""
        return max(0.0, self.total_qtl - self.reserved_qtl - self.procured_qtl)

    def __post_init__(self) -> None:
        if self.total_qtl < 0:
            raise ValueError("total_qtl cannot be negative.")
        if self.reserved_qtl < 0 or self.procured_qtl < 0:
            raise ValueError("reserved_qtl and procured_qtl cannot be negative.")


@dataclass
class Counter:
    """
    Represents a physical processing counter at a procurement centre.

    Fields:
        counter_id: Unique opaque identifier.
        specialty: Optional crop name this counter is optimised for.
            When set, the counter preferentially serves that crop; it may
            serve others when idle if accepts_general_when_idle is True.
        status: ACTIVE or INACTIVE. An INACTIVE counter never receives assignments.
        accepts_general_when_idle: When True and no specialty-matching farmer is
            waiting, the counter accepts farmers of any compatible crop.
        current_booking_id: ID of the booking currently being processed (if any).
        operating_minutes_remaining: How much processing time is left in the
            current operating window (slot). Used for processing-capacity gate.
        service_time_state: Rolling average state keyed by crop name.
            Keys are crop names; values are current per-(crop, counter) average
            service minutes per quintal.
    """

    counter_id: str
    specialty: Optional[str] = None
    status: CounterStatus = CounterStatus.ACTIVE
    accepts_general_when_idle: bool = True
    current_booking_id: Optional[str] = None
    operating_minutes_remaining: float = 480.0   # 8-hour default window
    service_time_state: dict[str, float] = field(default_factory=dict)

    def is_idle(self) -> bool:
        """Return True when this counter has no active assignment."""
        return self.current_booking_id is None

    def can_serve_crop(self, crop: str) -> bool:
        """
        Return True if this counter may currently accept a booking for crop.

        Rules:
        - If counter is INACTIVE, always False.
        - If counter has a specialty and the crop matches, True.
        - If counter has a specialty but the crop does NOT match, only True
          when counter is idle AND accepts_general_when_idle is True.
        - If counter has no specialty, always True (general counter).
        """
        if self.status == CounterStatus.INACTIVE:
            return False
        if self.specialty is None:
            return True
        if self.specialty == crop:
            return True
        # specialty mismatch — allow only if idle and accepts_general_when_idle
        return self.is_idle() and self.accepts_general_when_idle


@dataclass
class FarmerRequest:
    """
    A farmer's request to enter the procurement queue.

    Fields:
        farmer_id: Opaque identifier for the farmer.
        crop: Crop name being brought for procurement.
        quantity_qtl: Quantity in quintals.
        arrival_time: ISO-8601 timestamp string (no datetime dependency imposed —
            the engine uses lexicographic comparison; backend converts if needed).
        age: Farmer's age in years (used for priority eligibility).
        land_area_acres: Land holding in acres (used for priority eligibility).
        token_number: Unique token assigned at check-in. Used as final tiebreaker
            in FCFS ordering and as the stable external identifier shown to farmers.
    """

    farmer_id: str
    crop: str
    quantity_qtl: float
    arrival_time: str          # ISO-8601 string; lexicographic sort is correct
    age: int
    land_area_acres: float
    token_number: str

    def __post_init__(self) -> None:
        if self.quantity_qtl <= 0:
            raise ValueError("quantity_qtl must be greater than zero.")
        if self.age < 0:
            raise ValueError("age cannot be negative.")
        if self.land_area_acres < 0:
            raise ValueError("land_area_acres cannot be negative.")


@dataclass
class QueueEntry:
    """
    A live entry in the shared queue for one booking.

    This is the mutable state object managed exclusively by the engine.
    Callers receive copies (or read-only views via AllocationDecision /
    recalculate_eta); the engine never exposes references to internal entries.

    Fields:
        booking_id: Engine-generated unique identifier for this queue slot.
        farmer_request: The original FarmerRequest (immutable after insertion).
        status: Current lifecycle status.
        priority_lane: True if the farmer is eligible for the priority lane.
        assigned_counter_id: Set when counter is chosen; None when WAITING.
        queue_position: 1-based position in effective serving order (recomputed
            on each ETA recalculation).
        estimated_wait_minutes: Minutes until service begins.
        estimated_service_minutes: Predicted time this booking will take.
        estimated_total_minutes: Wait + service.
        eta_timestamp: ISO-8601 string of predicted completion time (nullable if
            no clock is available).
        allocation_reason: Last allocation decision reason code.
        _allocation_history: Internal trace for explain().
    """

    booking_id: str
    farmer_request: FarmerRequest
    status: QueueStatus = QueueStatus.WAITING
    priority_lane: bool = False
    assigned_counter_id: Optional[str] = None
    queue_position: Optional[int] = None
    estimated_wait_minutes: Optional[float] = None
    estimated_service_minutes: Optional[float] = None
    estimated_total_minutes: Optional[float] = None
    eta_timestamp: Optional[str] = None
    allocation_reason: Optional[str] = None
    _allocation_history: list[str] = field(default_factory=list, repr=False)


@dataclass
class AllocationDecision:
    """
    The complete output of one allocation event — the contract object
    serialized by the FastAPI layer.

    This object is intentionally flat with no nested dataclasses so that
    json.dumps(dataclasses.asdict(decision)) works without a custom encoder.

    Fields:
        booking_id: The booking this decision concerns.
        accepted: Whether the booking was accepted into the queue.
        queue_position: 1-based position in serving order (None if rejected).
        assigned_counter_id: Counter assigned (None if waiting or rejected).
        estimated_wait_minutes: Minutes until service begins (None if rejected).
        estimated_service_minutes: Predicted service duration (None if rejected).
        eta_timestamp: ISO-8601 string of predicted completion (None if unavailable).
        priority_lane: Whether the farmer is in the priority lane.
        allocation_reason: Closed-set reason code (see AllocationReason). Always
            a machine-checkable string — never free text.
        procurement_capacity_remaining: Remaining available_qtl for this crop
            AFTER this booking's reservation (0.0 if rejected).
        status: Current QueueStatus string value.
    """

    booking_id: str
    accepted: bool
    queue_position: Optional[int]
    assigned_counter_id: Optional[str]
    estimated_wait_minutes: Optional[float]
    estimated_service_minutes: Optional[float]
    eta_timestamp: Optional[str]
    priority_lane: bool
    allocation_reason: str
    procurement_capacity_remaining: float
    status: str
    alternate_centres: list[dict] = field(default_factory=list)


@dataclass
class QueueState:
    """
    The single source of truth for all mutable engine state at one centre.

    The engine owns all mutations to this object. Callers interact only through
    DQAEngine public methods; they never mutate QueueState directly.

    Fields:
        centre_id: Opaque identifier for this centre instance.
        entries: Ordered dict of booking_id → QueueEntry.  Insertion order
            reflects arrival order; the engine maintains priority ordering
            separately during allocation.
        counters: Dict of counter_id → Counter.
        capacities: Dict of crop_name → ProcurementCapacity.
        crops: Dict of crop_name → Crop (includes rolling rate state).
        allocation_history: Ordered list of (booking_id, is_priority) tuples
            representing the sequence of completed allocations — used by the
            fairness sliding window. Length is bounded to 2 * queue_window.
        per_counter_rolling_rates: Nested dict of counter_id → crop_name → rate.
            When present, overrides the global crop rate for that counter.
            Defaults to empty (global crop rates used).
    """

    centre_id: str
    entries: dict[str, QueueEntry] = field(default_factory=dict)
    counters: dict[str, Counter] = field(default_factory=dict)
    capacities: dict[str, ProcurementCapacity] = field(default_factory=dict)
    crops: dict[str, Crop] = field(default_factory=dict)
    allocation_history: list[tuple[str, bool]] = field(default_factory=list)
    per_counter_rolling_rates: dict[str, dict[str, float]] = field(default_factory=dict)
