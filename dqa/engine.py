"""
DQA Engine — Core Orchestrator
================================
Implements DQAEngine, the single public entry point for all allocation
decisions. This class wraps QueueState and delegates to the specialised
modules (capacity, fairness, eta) for each concern.

Design principles:
- No global mutable state. Each DQAEngine instance owns exactly one QueueState,
  allowing multiple centres to run concurrently in the same process.
- Every mutating method returns its decision(s); callers never need to poll.
- All state transitions go through _transition() to enforce valid lifecycle.
- The internal decision pipeline matches Section 2 of the Build Spec exactly:
    FARMER REQUEST
      → QUANTITY + CROP VALIDATION
      → PROCUREMENT CAPACITY CHECK
      → PROCESSING CAPACITY CHECK
      → SERVICE-TIME ESTIMATION
      → QUEUE INSERTION (deterministic ordering)
      → PRIORITY + FAIRNESS RESOLUTION
      → COUNTER-COMPATIBILITY FILTER
      → COUNTER SELECTION
      → ETA CALCULATION
      → ALLOCATION DECISION (with human-readable reason)
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Callable, Optional

from .models import (
    AllocationDecision,
    AllocationReason,
    Counter,
    CounterStatus,
    Crop,
    FarmerRequest,
    ProcurementCapacity,
    QueueEntry,
    QueueState,
    QueueStatus,
)
from .capacity import (
    check_procurement_capacity,
    check_processing_capacity,
    estimate_service_minutes,
    mark_procured,
    release_procurement_reservation,
    reserve_procurement_capacity,
)
from .priority import default_is_priority, make_priority_predicate
from .fairness import select_next_candidate, sort_key, trim_history
from .eta import recalculate_eta_for_all, update_rolling_average
from .exceptions import (
    CapacityExceededError,
    InvalidStateTransitionError,
    InvalidTransferRequestError,
    TransferTargetRejectedError,
    UnknownBookingError,
    UnknownCounterError,
    UnknownCropError,
)
from .congestion import detect_congestion

# Valid status transitions (DFA)
# Notes on added transitions:
#   ASSIGNED → COMPLETED:  operators may mark complete without explicit PROCESSING signal.
#   ASSIGNED → NO_SHOW:    farmer no-show while counter is assigned (counter not yet active).
#   PROCESSING → WAITING:  counter disabled mid-processing; farmer re-queued at front.
#   CONGESTION_ALTERNATE_SUGGESTED → CANCELLED / WAITING / TRANSFERRED_OUT / TRANSFER_DECLINED_RETAINED
_VALID_TRANSITIONS: dict[QueueStatus, set[QueueStatus]] = {
    QueueStatus.WAITING:       {QueueStatus.ASSIGNED, QueueStatus.CANCELLED, QueueStatus.NO_SHOW, QueueStatus.CONGESTION_ALTERNATE_SUGGESTED},
    QueueStatus.ASSIGNED:      {QueueStatus.PROCESSING, QueueStatus.COMPLETED,
                                QueueStatus.NO_SHOW, QueueStatus.CANCELLED, QueueStatus.WAITING},
    QueueStatus.PROCESSING:    {QueueStatus.COMPLETED, QueueStatus.NO_SHOW,
                                QueueStatus.CANCELLED, QueueStatus.WAITING},
    QueueStatus.COMPLETED:     set(),
    QueueStatus.NO_SHOW:       {QueueStatus.RETRY_PENDING, QueueStatus.CANCELLED},
    QueueStatus.CANCELLED:     set(),
    QueueStatus.RETRY_PENDING: {QueueStatus.WAITING, QueueStatus.CANCELLED},
    QueueStatus.CONGESTION_ALTERNATE_SUGGESTED: {
        QueueStatus.CANCELLED, QueueStatus.WAITING,
        QueueStatus.TRANSFERRED_OUT, QueueStatus.TRANSFER_DECLINED_RETAINED
    },
    QueueStatus.TRANSFERRED_OUT: set(),
    QueueStatus.TRANSFER_DECLINED_RETAINED: {
        QueueStatus.ASSIGNED, QueueStatus.CANCELLED, QueueStatus.NO_SHOW, QueueStatus.WAITING
    },
}



class DQAEngine:
    """
    Dynamic Queue Allocation Engine for one procurement centre.

    Pre-condition: crops, counters, and capacities are provided at construction
        time and form a consistent initial state (no capacity > total, etc.).
    Post-condition: the engine maintains all safety invariants throughout its
        lifetime. Call assert_invariants() at any time to verify.

    Args:
        centre_id: Opaque string identifier for this centre.
        crops: Dict mapping crop name → Crop.
        counters: List of Counter objects for this centre.
        capacities: List of ProcurementCapacity objects for this centre.
        priority_ratio: Max priority farmers per queue_window (default 1).
        queue_window: Fairness sliding window size in allocation events (default 5).
        rolling_alpha: Smoothing factor for rolling service-time average (default 0.3).
        is_priority: Configurable priority predicate. Defaults to
            make_priority_predicate() (age >= 60 or land_area < 1.0).
    """

    def __init__(
        self,
        crops: dict[str, Crop],
        counters: list[Counter],
        capacities: list[ProcurementCapacity],
        centre_id: str = "centre-1",
        priority_ratio: int = 1,
        queue_window: int = 5,
        rolling_alpha: float = 0.3,
        is_priority: Optional[Callable[[FarmerRequest], bool]] = None,
    ) -> None:
        self._priority_ratio = priority_ratio
        self._queue_window = queue_window
        self._rolling_alpha = rolling_alpha
        self._is_priority: Callable[[FarmerRequest], bool] = (
            is_priority if is_priority is not None else default_is_priority
        )

        self._state = QueueState(
            centre_id=centre_id,
            entries={},
            counters={c.counter_id: c for c in counters},
            capacities={cap.crop: cap for cap in capacities},
            crops=dict(crops),
            allocation_history=[],
            per_counter_rolling_rates={},
        )

    # ------------------------------------------------------------------
    # Public properties
    # ------------------------------------------------------------------

    @property
    def centre_id(self) -> str:
        """Return the centre identifier."""
        return self._state.centre_id

    @property
    def state(self) -> QueueState:
        """Read-only access to the engine's snapshot (for cross-centre queries)."""
        return self._state

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def add_booking(
        self,
        farmer: FarmerRequest,
        other_centres: Optional[list["DQAEngine"]] = None,
        congestion_wait_threshold_minutes: float = 90.0,
    ) -> AllocationDecision:
        """
        Process a new farmer request through the full decision pipeline.

        Pipeline:
            Crop validation → Procurement capacity check → Service-time estimation
            → Queue insertion → Congestion check & Alternate Suggestion → Counter selection → ETA

        Pre-condition: farmer.token_number is unique across all live entries.
        Post-condition: either returns an accepted AllocationDecision, a congestion
            transfer recommendation decision, or a capacity rejection decision.

        Returns:
            AllocationDecision describing the outcome.
        """
        # 1. Validate crop exists
        if farmer.crop not in self._state.crops:
            cap = self._state.capacities.get(farmer.crop)
            remaining = cap.available_qtl if cap else 0.0
            return self._rejection_decision(
                farmer,
                AllocationReason.REJECTED_PROCUREMENT_CAPACITY_EXCEEDED,
                remaining,
            )

        # 2. Gate 1: Procurement capacity
        try:
            remaining_after = check_procurement_capacity(farmer, self._state)
        except (CapacityExceededError, UnknownCropError) as exc:
            available = 0.0
            if isinstance(exc, CapacityExceededError):
                available = exc.available_qtl

            # Check if congestion transfer proposal can be made for procurement shortfall
            if other_centres:
                signal = detect_congestion(self._state, farmer, congestion_wait_threshold_minutes)
                if signal and signal.reason == "PROCUREMENT_SHORTFALL":
                    alternates = self.recommend_centre(farmer, other_centres)
                    better = [
                        alt for alt in alternates
                        if alt["centre_id"] != self._state.centre_id
                        and alt["remaining_capacity"] >= farmer.quantity_qtl
                        and alt["processing_feasible"]
                    ]

                    if better:
                        booking_id = str(uuid.uuid4())
                        entry = QueueEntry(
                            booking_id=booking_id,
                            farmer_request=farmer,
                            status=QueueStatus.CONGESTION_ALTERNATE_SUGGESTED,
                            priority_lane=self._is_priority(farmer),
                            allocation_reason=AllocationReason.CONGESTION_ALTERNATE_SUGGESTED,
                        )
                        self._state.entries[booking_id] = entry
                        return AllocationDecision(
                            booking_id=booking_id,
                            accepted=False,
                            queue_position=None,
                            assigned_counter_id=None,
                            estimated_wait_minutes=None,
                            estimated_service_minutes=None,
                            eta_timestamp=None,
                            priority_lane=entry.priority_lane,
                            allocation_reason=AllocationReason.CONGESTION_ALTERNATE_SUGGESTED,
                            procurement_capacity_remaining=available,
                            status=QueueStatus.CONGESTION_ALTERNATE_SUGGESTED.value,
                            alternate_centres=better,
                        )

            return self._rejection_decision(
                farmer,
                AllocationReason.REJECTED_PROCUREMENT_CAPACITY_EXCEEDED,
                available,
            )

        # 3. Estimate service time
        est_service = estimate_service_minutes(farmer, self._state)

        # 4. Gate 2: Processing capacity check
        active_eligible = self._eligible_counters_for_crop(farmer.crop)
        processing_ok = check_processing_capacity(est_service, active_eligible)

        # 5. Reserve procurement capacity
        reserve_procurement_capacity(farmer.crop, farmer.quantity_qtl, self._state)

        # 6. Create queue entry
        booking_id = str(uuid.uuid4())
        entry = QueueEntry(
            booking_id=booking_id,
            farmer_request=farmer,
            status=QueueStatus.WAITING,
            priority_lane=self._is_priority(farmer),
            estimated_service_minutes=est_service,
        )
        self._state.entries[booking_id] = entry
        entry._allocation_history.append(
            f"Inserted into queue at arrival_time={farmer.arrival_time}"
        )

        # 7. Pre-compute ETA to evaluate wait time trigger
        recalculate_eta_for_all(self._state, now=datetime.now())
        est_wait = entry.estimated_wait_minutes or 0.0

        # 8. Check for congestion triggers if other_centres provided
        if other_centres:
            signal = detect_congestion(
                self._state, farmer, congestion_wait_threshold_minutes, est_wait
            )
            if signal:
                alternates = self.recommend_centre(farmer, other_centres)
                better = [
                    alt for alt in alternates
                    if alt["centre_id"] != self._state.centre_id
                    and alt["remaining_capacity"] >= farmer.quantity_qtl
                    and alt["processing_feasible"]
                    and (alt["projected_eta_minutes"] < est_wait or not processing_ok)
                ]
                if better:

                    entry.status = QueueStatus.CONGESTION_ALTERNATE_SUGGESTED
                    entry.allocation_reason = AllocationReason.CONGESTION_ALTERNATE_SUGGESTED
                    return AllocationDecision(
                        booking_id=booking_id,
                        accepted=False,
                        queue_position=entry.queue_position,
                        assigned_counter_id=None,
                        estimated_wait_minutes=est_wait,
                        estimated_service_minutes=est_service,
                        eta_timestamp=entry.eta_timestamp,
                        priority_lane=entry.priority_lane,
                        allocation_reason=AllocationReason.CONGESTION_ALTERNATE_SUGGESTED,
                        procurement_capacity_remaining=remaining_after,
                        status=QueueStatus.CONGESTION_ALTERNATE_SUGGESTED.value,
                        alternate_centres=better,
                    )

        # 9. Attempt immediate allocation to a free counter
        decision = self._try_allocate_entry(entry, remaining_after)

        if decision.assigned_counter_id is None and not active_eligible:
            decision.allocation_reason = AllocationReason.NO_ELIGIBLE_COUNTER_AVAILABLE
        elif decision.assigned_counter_id is None and not processing_ok:
            decision.allocation_reason = AllocationReason.QUEUED_PENDING_PROCESSING_CAPACITY

        # 10. Recalculate ETAs for all waiting entries
        recalculate_eta_for_all(self._state, now=datetime.now())

        return decision

    def accept_centre_transfer(
        self,
        booking_id: str,
        target_centre: "DQAEngine",
    ) -> AllocationDecision:
        """
        Farmer accepted proposed transfer to target_centre.

        Actions:
        - Mark the booking CANCELLED at this centre with reason TRANSFERRED_OUT.
        - Release procurement capacity reservation at local centre.
        - Call target_centre.add_booking(...) with the same FarmerRequest.
        - Return target_centre's resulting AllocationDecision unchanged.
        - Atomic: if target_centre allocation fails or is rejected, restore local
          booking to its previous state and raise TransferTargetRejectedError.
        """
        entry = self._require_entry(booking_id)
        if (
            entry.status != QueueStatus.CONGESTION_ALTERNATE_SUGGESTED
            and entry.allocation_reason != AllocationReason.CONGESTION_ALTERNATE_SUGGESTED
        ):
            raise InvalidTransferRequestError(booking_id, str(entry.status))

        farmer = entry.farmer_request
        old_status = entry.status
        old_reason = entry.allocation_reason
        had_reservation = entry.status in (
            QueueStatus.WAITING,
            QueueStatus.CONGESTION_ALTERNATE_SUGGESTED,
        )

        # Cancel locally with TRANSFERRED_OUT
        self._transition(entry, QueueStatus.CANCELLED)
        entry.allocation_reason = AllocationReason.TRANSFERRED_OUT
        entry._allocation_history.append(
            f"Transferred out to centre '{target_centre.centre_id}'"
        )

        cap = self._state.capacities.get(farmer.crop)
        if cap and cap.reserved_qtl >= farmer.quantity_qtl:
            release_procurement_reservation(farmer.crop, farmer.quantity_qtl, self._state)

        try:
            target_decision = target_centre.add_booking(farmer)
            if not target_decision.accepted and target_decision.status != QueueStatus.CONGESTION_ALTERNATE_SUGGESTED.value:
                raise TransferTargetRejectedError(
                    booking_id, target_centre.centre_id, target_decision.allocation_reason
                )
        except Exception as exc:
            # Atomic rollback on target failure
            if cap and had_reservation:
                reserve_procurement_capacity(farmer.crop, farmer.quantity_qtl, self._state)
            entry.status = old_status
            entry.allocation_reason = old_reason
            entry._allocation_history.append(f"Transfer failed ({exc}); local booking restored.")
            if isinstance(exc, TransferTargetRejectedError):
                raise
            raise TransferTargetRejectedError(
                booking_id, target_centre.centre_id, str(exc)
            ) from exc

        recalculate_eta_for_all(self._state, now=datetime.now())
        return target_decision

    def decline_centre_transfer(self, booking_id: str) -> AllocationDecision:
        """
        Farmer declined proposed transfer.

        Actions:
        - Retain booking at original centre with status WAITING.
        - Set allocation_reason = TRANSFER_DECLINED_RETAINED.
        - Zero side effects on queue position, priority lane, or ETA calculation basis.
        """
        entry = self._require_entry(booking_id)
        if (
            entry.status not in (QueueStatus.CONGESTION_ALTERNATE_SUGGESTED, QueueStatus.WAITING)
            and entry.allocation_reason != AllocationReason.CONGESTION_ALTERNATE_SUGGESTED
        ):
            raise InvalidTransferRequestError(booking_id, str(entry.status))

        entry.allocation_reason = AllocationReason.TRANSFER_DECLINED_RETAINED
        entry.status = QueueStatus.WAITING
        entry._allocation_history.append("Transfer offer declined by farmer; retained in queue.")

        recalculate_eta_for_all(self._state, now=datetime.now())

        cap = self._state.capacities.get(entry.farmer_request.crop)
        remaining = cap.available_qtl if cap else 0.0

        return AllocationDecision(
            booking_id=entry.booking_id,
            accepted=True,
            queue_position=entry.queue_position,
            assigned_counter_id=entry.assigned_counter_id,
            estimated_wait_minutes=entry.estimated_wait_minutes,
            estimated_service_minutes=entry.estimated_service_minutes,
            eta_timestamp=entry.eta_timestamp,
            priority_lane=entry.priority_lane,
            allocation_reason=AllocationReason.TRANSFER_DECLINED_RETAINED,
            procurement_capacity_remaining=remaining,
            status=AllocationReason.TRANSFER_DECLINED_RETAINED,
            alternate_centres=[],
        )


    def counter_available(self, counter_id: str) -> Optional[AllocationDecision]:
        """
        Signal that a counter has become free and should receive the next farmer.

        Triggered externally when a counter operator presses "Ready" or when the
        engine detects a counter freeing up after completion.

        Pre-condition: counter_id exists and is ACTIVE.
        Post-condition: the highest-priority fairness-eligible waiting farmer
            compatible with this counter is assigned, or None if queue is empty.

        Returns:
            AllocationDecision if an assignment was made, None otherwise.
        """
        counter = self._require_counter(counter_id)
        if counter.status == CounterStatus.INACTIVE:
            return None

        entry = self._next_for_counter(counter)
        if entry is None:
            return None

        return self._assign_entry_to_counter(entry, counter)

    def complete_booking(
        self,
        booking_id: str,
        actual_service_minutes: float,
    ) -> list[AllocationDecision]:
        """
        Mark a booking as completed and update service-time rolling average.

        Triggers:
        - Rolling average update for the crop & counter.
        - Immediate counter_available() for the freed counter.
        - ETA recalculation for all downstream waiting entries.

        Pre-condition: booking is in ASSIGNED or PROCESSING state.
        Post-condition: booking status = COMPLETED; procurement capacity updated
            from reserved → procured; freed counter attempts next allocation.

        Returns:
            List of AllocationDecision objects (0 or 1 for the next assignment).

        Raises:
            UnknownBookingError: booking_id not found.
            InvalidStateTransitionError: booking is not in a completable state.
        """
        entry = self._require_entry(booking_id)
        self._transition(entry, QueueStatus.COMPLETED)

        farmer = entry.farmer_request
        counter_id = entry.assigned_counter_id

        # Release counter
        if counter_id and counter_id in self._state.counters:
            self._state.counters[counter_id].current_booking_id = None
        entry.assigned_counter_id = None   # INV3: COMPLETED entries must have no counter

        # Update rolling average (rate = actual_minutes / quantity_qtl)
        if actual_service_minutes > 0 and farmer.quantity_qtl > 0 and counter_id:
            actual_rate = actual_service_minutes / farmer.quantity_qtl
            update_rolling_average(
                self._state, farmer.crop, actual_rate, counter_id, self._rolling_alpha
            )

        # Graduate reservation to procured
        mark_procured(farmer.crop, farmer.quantity_qtl, self._state)

        entry._allocation_history.append(
            f"Completed at actual_service_minutes={actual_service_minutes:.1f}"
        )

        # Free counter → attempt next allocation
        decisions: list[AllocationDecision] = []
        if counter_id:
            next_decision = self.counter_available(counter_id)
            if next_decision:
                decisions.append(next_decision)

        recalculate_eta_for_all(self._state, now=datetime.now())
        return decisions

    def mark_no_show(self, booking_id: str) -> dict:
        """
        Mark a booking as no-show and apply the retry policy.

        Retry policy: WAITING/ASSIGNED → NO_SHOW → RETRY_PENDING → WAITING
            (re-entering queue at end of same priority lane).
        After 1 retry, a second no-show → CANCELLED.

        Pre-condition: booking is in WAITING or ASSIGNED state.
        Post-condition: booking moves to RETRY_PENDING then back to WAITING,
            or CANCELLED if this was already a retry.

        Returns:
            Dict with keys: event, booking_id, new_status, farmer_id.

        Raises:
            UnknownBookingError, InvalidStateTransitionError.
        """
        entry = self._require_entry(booking_id)
        was_retry = "_retry=1" in " ".join(entry._allocation_history)

        # Transition FIRST (validates that transition is legal), then release counter.
        self._transition(entry, QueueStatus.NO_SHOW)

        # Release counter after transition succeeds
        if entry.assigned_counter_id:
            counter = self._state.counters.get(entry.assigned_counter_id)
            if counter:
                counter.current_booking_id = None
            entry.assigned_counter_id = None

        entry._allocation_history.append("Marked as NO_SHOW")

        if was_retry:
            # Second no-show → cancel
            self._transition(entry, QueueStatus.CANCELLED)
            release_procurement_reservation(
                entry.farmer_request.crop,
                entry.farmer_request.quantity_qtl,
                self._state,
            )
            entry._allocation_history.append("Second no-show: CANCELLED")
            status = QueueStatus.CANCELLED.value
        else:
            # First no-show → retry pending → back to waiting
            self._transition(entry, QueueStatus.RETRY_PENDING)
            entry._allocation_history.append("_retry=1; moved to RETRY_PENDING")
            self._transition(entry, QueueStatus.WAITING)
            entry._allocation_history.append("Re-inserted into queue (RETRY)")
            status = QueueStatus.WAITING.value

        recalculate_eta_for_all(self._state, now=datetime.now())

        return {
            "event": "NO_SHOW",
            "booking_id": booking_id,
            "new_status": status,
            "farmer_id": entry.farmer_request.farmer_id,
        }

    def cancel_booking(self, booking_id: str) -> None:
        """
        Cancel a booking, releasing its procurement reservation and freeing
        any assigned counter.

        Pre-condition: booking is in WAITING, ASSIGNED, or RETRY_PENDING.
        Post-condition: booking = CANCELLED; procurement capacity released;
            ETAs recalculated for all downstream entries.

        Raises:
            UnknownBookingError, InvalidStateTransitionError.
        """
        entry = self._require_entry(booking_id)
        self._transition(entry, QueueStatus.CANCELLED)

        if entry.assigned_counter_id:
            counter = self._state.counters.get(entry.assigned_counter_id)
            if counter:
                counter.current_booking_id = None
            entry.assigned_counter_id = None

        release_procurement_reservation(
            entry.farmer_request.crop,
            entry.farmer_request.quantity_qtl,
            self._state,
        )
        entry._allocation_history.append("Cancelled; procurement reservation released.")
        recalculate_eta_for_all(self._state, now=datetime.now())

    def disable_counter(self, counter_id: str) -> list[AllocationDecision]:
        """
        Take a counter offline.

        If the counter had an active assignment (ASSIGNED/PROCESSING), that farmer
        is requeued at the FRONT of their eligible lane (NOT the back — they should
        not lose their position due to counter failure).

        Pre-condition: counter_id exists.
        Post-condition: counter.status = INACTIVE; any evicted farmer is
            re-queued at front of their lane.

        Returns:
            List of AllocationDecision for the re-queued farmer (if any).

        Raises:
            UnknownCounterError.
        """
        counter = self._require_counter(counter_id)
        counter.status = CounterStatus.INACTIVE

        decisions: list[AllocationDecision] = []

        if counter.current_booking_id:
            evicted_booking_id = counter.current_booking_id
            counter.current_booking_id = None

            evicted = self._state.entries.get(evicted_booking_id)
            if evicted and evicted.status in (QueueStatus.ASSIGNED, QueueStatus.PROCESSING):
                evicted.assigned_counter_id = None
                # Requeue at front: give earliest possible arrival_time token so
                # sort_key places it first. We inject a synthetic prefix marker.
                evicted.farmer_request = _bump_arrival_to_front(evicted.farmer_request)
                self._transition(evicted, QueueStatus.WAITING)
                evicted.allocation_reason = AllocationReason.REQUEUED_COUNTER_DISABLED
                evicted._allocation_history.append(
                    f"Counter {counter_id} disabled; re-queued at front of lane."
                )

                # Build a synthetic AllocationDecision representing the requeue event
                remaining = self._state.capacities.get(
                    evicted.farmer_request.crop, ProcurementCapacity(evicted.farmer_request.crop, 0)
                ).available_qtl
                decisions.append(AllocationDecision(
                    booking_id=evicted_booking_id,
                    accepted=True,
                    queue_position=1,
                    assigned_counter_id=None,
                    estimated_wait_minutes=None,
                    estimated_service_minutes=evicted.estimated_service_minutes,
                    eta_timestamp=None,
                    priority_lane=evicted.priority_lane,
                    allocation_reason=AllocationReason.REQUEUED_COUNTER_DISABLED,
                    procurement_capacity_remaining=remaining,
                    status=QueueStatus.WAITING.value,
                ))

        recalculate_eta_for_all(self._state, now=datetime.now())
        return decisions

    def enable_counter(self, counter_id: str) -> Optional[AllocationDecision]:
        """
        Bring a counter back online and immediately attempt an allocation.

        Pre-condition: counter_id exists.
        Post-condition: counter.status = ACTIVE; if a waiting farmer exists,
            they are immediately allocated.

        Returns:
            AllocationDecision if a farmer was assigned, None otherwise.

        Raises:
            UnknownCounterError.
        """
        counter = self._require_counter(counter_id)
        counter.status = CounterStatus.ACTIVE
        return self.counter_available(counter_id)

    def recalculate_eta(self) -> list[QueueEntry]:
        """
        Recalculate ETAs for all WAITING/ASSIGNED entries using the current state.

        Can be called at any time without side-effects on allocation logic.

        Returns:
            List of QueueEntry objects with updated ETA fields.
        """
        return recalculate_eta_for_all(self._state, now=datetime.now())

    def recommend_centre(
        self,
        farmer: FarmerRequest,
        other_centres: list["DQAEngine"],
    ) -> list[dict]:
        """
        Rank this centre and candidate centres for a farmer's crop/quantity.

        Ranking criteria (applied in order):
        1. Hard filter: exclude centres with procurement_capacity < farmer.quantity_qtl.
        2. Processing capacity feasibility.
        3. Current queue length (WAITING entries).
        4. Projected ETA.

        Returns:
            Ranked list of dicts: {centre_id, projected_eta_minutes, remaining_capacity, reason},
            best first. An empty list means no centre can accommodate the farmer.
        """
        candidates = [self] + list(other_centres)
        results = []

        for engine in candidates:
            cap = engine._state.capacities.get(farmer.crop)
            if cap is None or cap.available_qtl < farmer.quantity_qtl:
                continue  # Hard filter

            est_service = estimate_service_minutes(farmer, engine._state)
            eligible = engine._eligible_counters_for_crop(farmer.crop)
            processing_ok = check_processing_capacity(est_service, eligible)
            q_len = sum(
                1 for e in engine._state.entries.values()
                if e.status in (QueueStatus.WAITING, QueueStatus.ASSIGNED)
            )

            # Compute projected ETA as min workload across eligible counters
            if eligible:
                min_workload = min(
                    sum(
                        ent.estimated_service_minutes or est_service
                        for ent in engine._state.entries.values()
                        if ent.assigned_counter_id == c.counter_id
                        and ent.status in (QueueStatus.ASSIGNED, QueueStatus.PROCESSING)
                    )
                    for c in eligible
                )
                projected_eta = min_workload + est_service
            else:
                projected_eta = float("inf")

            results.append({
                "centre_id": engine.centre_id,
                "projected_eta_minutes": round(projected_eta, 1),
                "remaining_capacity": cap.available_qtl,
                "queue_length": q_len,
                "processing_feasible": processing_ok,
                "reason": (
                    "PROCESSING_CAPACITY_FEASIBLE" if processing_ok
                    else "QUEUED_PENDING_CAPACITY"
                ),
            })

        # Sort: processing feasible first, then ETA asc, then queue length asc
        results.sort(key=lambda r: (
            0 if r["processing_feasible"] else 1,
            r["projected_eta_minutes"],
            r["queue_length"],
        ))
        return results

    def explain(self, booking_id: str) -> str:
        """
        Return a human-readable audit trail for a booking.

        Pre-condition: booking_id exists in the engine.
        Post-condition: returns a formatted string. No side effects.

        Raises:
            UnknownBookingError.
        """
        entry = self._require_entry(booking_id)
        farmer = entry.farmer_request
        lines = [
            f"Booking {booking_id}",
            f"  Farmer : {farmer.farmer_id} (token {farmer.token_number})",
            f"  Crop   : {farmer.crop} | Qty: {farmer.quantity_qtl} qtl",
            f"  Status : {entry.status.value}",
            f"  Lane   : {'PRIORITY' if entry.priority_lane else 'NORMAL'}",
            f"  Counter: {entry.assigned_counter_id or 'unassigned'}",
            f"  Reason : {entry.allocation_reason or 'N/A'}",
            "  History:",
        ] + [f"    [{i+1}] {event}" for i, event in enumerate(entry._allocation_history)]
        return "\n".join(lines)

    # ------------------------------------------------------------------
    # Safety Invariants
    # ------------------------------------------------------------------

    def assert_invariants(self) -> None:
        """
        Check all safety invariants against the current state.

        Call after every state-changing event to catch bugs early. Raises
        AssertionError with a descriptive message if any invariant is violated.

        Invariants checked:
        1. No procurement quantity exceeds available_qtl at time of booking.
        2. No two active entries reference the same counter simultaneously in PROCESSING state.
        3. No CANCELLED or COMPLETED entry has an assigned_counter_id.
        4. No INACTIVE counter has an active assignment.
        5. No negative capacity values.
        6. No negative ETA values.
        7. No entry references an unknown counter.
        8. No hard crop–counter constraint violated (specialty assigned wrong crop).
        """
        state = self._state

        # Invariant 5: No negative capacity
        for crop, cap in state.capacities.items():
            assert cap.available_qtl >= 0, \
                f"INV5: Negative available_qtl for crop '{crop}': {cap.available_qtl}"
            assert cap.reserved_qtl >= 0, \
                f"INV5: Negative reserved_qtl for crop '{crop}': {cap.reserved_qtl}"
            assert cap.procured_qtl >= 0, \
                f"INV5: Negative procured_qtl for crop '{crop}': {cap.procured_qtl}"

        processing_counters: dict[str, str] = {}  # counter_id → booking_id

        for bid, entry in state.entries.items():
            s = entry.status

            # Invariant 3: CANCELLED/COMPLETED/CONGESTION_ALTERNATE_SUGGESTED have no counter assignment
            if s in (QueueStatus.CANCELLED, QueueStatus.COMPLETED, QueueStatus.CONGESTION_ALTERNATE_SUGGESTED):
                assert entry.assigned_counter_id is None, \
                    f"INV3: {s.value} entry {bid} still has counter {entry.assigned_counter_id}"


            # Invariant 7: Counter exists if assigned
            if entry.assigned_counter_id:
                assert entry.assigned_counter_id in state.counters, \
                    f"INV7: Entry {bid} assigned to unknown counter {entry.assigned_counter_id}"

            # Invariant 4: INACTIVE counters have no active assignment
            if entry.assigned_counter_id:
                ctr = state.counters[entry.assigned_counter_id]
                if ctr.status == CounterStatus.INACTIVE:
                    assert s not in (QueueStatus.ASSIGNED, QueueStatus.PROCESSING), \
                        f"INV4: Entry {bid} assigned to INACTIVE counter {entry.assigned_counter_id}"

            # Invariant 2: No double-assignment on processing counters
            if s == QueueStatus.PROCESSING and entry.assigned_counter_id:
                assert entry.assigned_counter_id not in processing_counters, \
                    f"INV2: Counter {entry.assigned_counter_id} double-assigned " \
                    f"to {processing_counters[entry.assigned_counter_id]} and {bid}"
                processing_counters[entry.assigned_counter_id] = bid

            # Invariant 6: No negative ETA
            if entry.estimated_wait_minutes is not None:
                assert entry.estimated_wait_minutes >= 0, \
                    f"INV6: Negative estimated_wait_minutes for {bid}: {entry.estimated_wait_minutes}"

            # Invariant 8: Hard crop–counter specialty constraint
            if entry.assigned_counter_id and s in (QueueStatus.ASSIGNED, QueueStatus.PROCESSING):
                ctr = state.counters[entry.assigned_counter_id]
                if ctr.specialty and not ctr.accepts_general_when_idle:
                    assert ctr.specialty == entry.farmer_request.crop, \
                        f"INV8: Counter {ctr.counter_id} specialty={ctr.specialty} " \
                        f"but assigned to crop {entry.farmer_request.crop} (entry {bid})"

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _require_entry(self, booking_id: str) -> QueueEntry:
        entry = self._state.entries.get(booking_id)
        if entry is None:
            raise UnknownBookingError(booking_id)
        return entry

    def _require_counter(self, counter_id: str) -> Counter:
        counter = self._state.counters.get(counter_id)
        if counter is None:
            raise UnknownCounterError(counter_id)
        return counter

    def _transition(self, entry: QueueEntry, new_status: QueueStatus) -> None:
        """Enforce valid status transition; raise InvalidStateTransitionError otherwise."""
        allowed = _VALID_TRANSITIONS.get(entry.status, set())
        if new_status not in allowed:
            raise InvalidStateTransitionError(
                entry.booking_id, entry.status.value, new_status.value
            )
        entry.status = new_status

    def _eligible_counters_for_crop(self, crop: str) -> list[Counter]:
        """Return all ACTIVE counters that CAN serve the given crop (by specialty rules)."""
        return [
            c for c in self._state.counters.values()
            if c.status == CounterStatus.ACTIVE and c.can_serve_crop(crop)
        ]

    def _idle_eligible_counters_for_crop(self, crop: str) -> list[Counter]:
        """Return ACTIVE, idle counters eligible for the given crop."""
        return [
            c for c in self._eligible_counters_for_crop(crop)
            if c.is_idle()
        ]

    def _next_for_counter(self, counter: Counter) -> Optional[QueueEntry]:
        """
        Find the best next WAITING entry for this counter using fairness selection.

        Applies specialty resolution:
        1. Specialty-matching waiting entries (if counter has specialty).
        2. General waiting entries (if counter.accepts_general_when_idle).
        """
        from .models import QueueStatus

        waiting = sorted(
            [
                e for e in self._state.entries.values()
                if e.status == QueueStatus.WAITING and counter.can_serve_crop(e.farmer_request.crop)
            ],
            key=sort_key,
        )

        if not waiting:
            return None

        # Specialty-first resolve
        if counter.specialty:
            specialty_waiting = [e for e in waiting if e.farmer_request.crop == counter.specialty]
            general_waiting = [e for e in waiting if e.farmer_request.crop != counter.specialty]

            entry = select_next_candidate(
                specialty_waiting, self._state.allocation_history,
                self._priority_ratio, self._queue_window,
            )
            if entry is None and counter.accepts_general_when_idle:
                entry = select_next_candidate(
                    general_waiting, self._state.allocation_history,
                    self._priority_ratio, self._queue_window,
                )
        else:
            entry = select_next_candidate(
                waiting, self._state.allocation_history,
                self._priority_ratio, self._queue_window,
            )

        return entry

    def _assign_entry_to_counter(
        self, entry: QueueEntry, counter: Counter
    ) -> AllocationDecision:
        """Assign the given entry to the given counter and build an AllocationDecision."""
        from .capacity import estimate_service_minutes

        self._transition(entry, QueueStatus.ASSIGNED)
        entry.assigned_counter_id = counter.counter_id
        counter.current_booking_id = entry.booking_id

        # Determine reason
        is_specialty = counter.specialty == entry.farmer_request.crop
        was_priority = entry.priority_lane
        can_pri = True  # select_next_candidate already enforced fairness
        if was_priority:
            reason = (
                AllocationReason.PRIORITY_WITHIN_FAIRNESS_LIMIT
                if can_pri else AllocationReason.PRIORITY_DEFERRED_FAIRNESS_LIMIT
            )
        else:
            reason = AllocationReason.FCFS_ELIGIBLE

        if is_specialty:
            reason = AllocationReason.COUNTER_SPECIALTY_MATCH
        elif counter.specialty and not is_specialty:
            reason = AllocationReason.COUNTER_GENERAL_FALLBACK

        entry.allocation_reason = reason
        entry._allocation_history.append(
            f"Assigned to counter {counter.counter_id}; reason={reason}"
        )

        # Update allocation history for fairness
        self._state.allocation_history.append((entry.booking_id, entry.priority_lane))
        self._state.allocation_history = trim_history(
            self._state.allocation_history, self._queue_window
        )

        cap = self._state.capacities.get(entry.farmer_request.crop)
        remaining = cap.available_qtl if cap else 0.0
        est_service = entry.estimated_service_minutes or estimate_service_minutes(
            entry.farmer_request, self._state, counter.counter_id
        )

        return AllocationDecision(
            booking_id=entry.booking_id,
            accepted=True,
            queue_position=entry.queue_position,
            assigned_counter_id=counter.counter_id,
            estimated_wait_minutes=0.0,   # assigned immediately
            estimated_service_minutes=est_service,
            eta_timestamp=None,
            priority_lane=entry.priority_lane,
            allocation_reason=reason,
            procurement_capacity_remaining=remaining,
            status=QueueStatus.ASSIGNED.value,
        )

    def _try_allocate_entry(
        self,
        entry: QueueEntry,
        remaining_after: float,
    ) -> AllocationDecision:
        """
        Try to immediately assign the entry to a free eligible counter.
        Returns AllocationDecision (assigned or queued).
        """
        idle_counters = self._idle_eligible_counters_for_crop(entry.farmer_request.crop)

        if idle_counters:
            # Pick the best idle counter (specialty-first, then operating time)
            def counter_score(c: Counter) -> tuple:
                specialty_match = 0 if c.specialty == entry.farmer_request.crop else 1
                return (specialty_match, -c.operating_minutes_remaining)

            best_counter = min(idle_counters, key=counter_score)
            return self._assign_entry_to_counter(entry, best_counter)

        # No idle counter — entry stays WAITING
        cap = self._state.capacities.get(entry.farmer_request.crop)
        remaining = cap.available_qtl if cap else 0.0
        return AllocationDecision(
            booking_id=entry.booking_id,
            accepted=True,
            queue_position=None,
            assigned_counter_id=None,
            estimated_wait_minutes=None,
            estimated_service_minutes=entry.estimated_service_minutes,
            eta_timestamp=None,
            priority_lane=entry.priority_lane,
            allocation_reason=(
                AllocationReason.PRIORITY_WITHIN_FAIRNESS_LIMIT
                if entry.priority_lane else AllocationReason.FCFS_ELIGIBLE
            ),
            procurement_capacity_remaining=remaining,
            status=QueueStatus.WAITING.value,
        )

    def _rejection_decision(
        self, farmer: FarmerRequest, reason: str, remaining: float
    ) -> AllocationDecision:
        """Build a rejected AllocationDecision without side effects."""
        return AllocationDecision(
            booking_id="",
            accepted=False,
            queue_position=None,
            assigned_counter_id=None,
            estimated_wait_minutes=None,
            estimated_service_minutes=None,
            eta_timestamp=None,
            priority_lane=self._is_priority(farmer),
            allocation_reason=reason,
            procurement_capacity_remaining=remaining,
            status="REJECTED",
        )


def _bump_arrival_to_front(farmer: FarmerRequest) -> FarmerRequest:
    """
    Return a copy of FarmerRequest with arrival_time set to a sentinel that
    sorts before any real arrival, placing the farmer at the front of their lane.
    """
    from dataclasses import replace
    return replace(farmer, arrival_time="0000-00-00T00:00:00")
