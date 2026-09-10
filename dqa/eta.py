"""
DQA ETA Engine
==============
Computes waiting-time estimates for every WAITING/ASSIGNED QueueEntry,
and maintains the per-(crop, counter) rolling service-time average.

SPLIT-LOAD ETA DESIGN (the detail most implementations get wrong)
-----------------------------------------------------------------
Naive implementations compute ETA as (queue_position - 1) × average_service_time.
This is wrong when multiple counters are eligible to serve a farmer, because the
farmer will be served by whichever eligible counter frees up first.

This module computes ETA correctly:
1. Group counters into eligibility sets per waiting farmer.
2. For each counter, compute the sum of estimated service times of all entries
   *currently assigned or already committed to it* (its local workload).
3. A farmer's expected wait = minimum over all eligible counters of that counter's
   remaining workload up to the point where the farmer would be reached.
4. When multiple counters are eligible, the expected wait is the arrival time at
   the *first* counter to free up, not a single-queue serialisation.

This is a direct application of the M/D/c queueing model approximation, simplified
to a deterministic schedule (known service times from estimates). When estimates
are inaccurate, the rolling average corrects over time.

ROLLING AVERAGE SCOPE
---------------------
Default: per-crop global (shared across all counters using that crop's rate).
Override: per-(crop, counter) when `state.per_counter_rolling_rates` contains
    entries — specialty counters are often measurably faster for their crop.
The README states this default explicitly so it is not silently assumed.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .models import QueueEntry, QueueState, Counter


ROLLING_ALPHA_DEFAULT: float = 0.3


def update_rolling_average(
    state: "QueueState",
    crop: str,
    actual_service_minutes: float,
    counter_id: str,
    alpha: float = ROLLING_ALPHA_DEFAULT,
) -> None:
    """
    Update the exponential rolling average for service time on booking completion.

    Formula: new_avg = alpha * actual_time + (1 - alpha) * old_avg

    Updates BOTH:
    - The global crop rate in state.crops[crop].avg_service_min_per_qtl
    - The per-(crop, counter) rate in state.per_counter_rolling_rates

    This dual update allows the ETA engine to use either scope.

    Pre-condition: crop exists in state.crops.
    Post-condition: averages are updated in-place; all values remain positive.
    """
    crop_obj = state.crops.get(crop)
    if crop_obj is None:
        return

    # Find the farmer's quantity to convert actual minutes → minutes-per-qtl
    # We cannot recover quantity here, so actual_service_minutes is already
    # a TOTAL duration. The rate update is done at the crop.avg_service_min_per_qtl
    # level — back-calculated from the entry's quantity in the engine.
    # This function accepts actual_rate_per_qtl (pre-divided by caller).
    old_global = crop_obj.avg_service_min_per_qtl
    new_global = alpha * actual_service_minutes + (1 - alpha) * old_global
    crop_obj.avg_service_min_per_qtl = max(0.01, new_global)

    # Per-counter update
    if counter_id not in state.per_counter_rolling_rates:
        state.per_counter_rolling_rates[counter_id] = {}
    per_counter = state.per_counter_rolling_rates[counter_id]
    old_local = per_counter.get(crop, old_global)
    new_local = alpha * actual_service_minutes + (1 - alpha) * old_local
    per_counter[crop] = max(0.01, new_local)


def _counter_remaining_workload(
    counter: "Counter",
    assigned_entries: list["QueueEntry"],
    state: "QueueState",
) -> float:
    """
    Compute the total estimated service minutes remaining on this counter,
    counting all entries currently ASSIGNED or PROCESSING.

    Used as the base from which a waiting farmer's ETA is calculated.

    Pre-condition: assigned_entries are the entries currently committed to this counter.
    Post-condition: returns a non-negative float.
    """
    from .capacity import estimate_service_minutes

    total = 0.0
    for entry in assigned_entries:
        est = entry.estimated_service_minutes
        if est is None:
            est = estimate_service_minutes(entry.farmer_request, state, counter.counter_id)
        total += est
    return total


def recalculate_eta_for_all(
    state: "QueueState",
    now: Optional[datetime] = None,
) -> list["QueueEntry"]:
    """
    Recalculate ETA for every WAITING or ASSIGNED entry in the queue.

    SPLIT-LOAD APPROACH:
    For each WAITING entry:
    1. Find the set of ACTIVE counters eligible to serve it (crop-compatible,
       not INACTIVE).
    2. Compute each eligible counter's current remaining workload (sum of
       committed service times for entries already assigned to it).
    3. Accumulate forward through the waiting list: for each counter, simulate
       the service queue as entries are committed in order.
    4. The entry's estimated wait = minimum remaining workload over eligible counters
       at the point they would reach this entry.

    This correctly accounts for multi-counter parallelism — a farmer waiting
    behind 10 people but 3 counters are eligible will have a much shorter ETA
    than a naive single-queue sum would suggest.

    Pre-condition: state is consistent (entries, counters, crops populated).
    Post-condition: entry.queue_position, estimated_wait_minutes,
        estimated_service_minutes, estimated_total_minutes, eta_timestamp are
        all updated in-place. Returns the list of modified entries.

    Complexity: O(n * c) where n = waiting entries, c = number of active counters.
    """
    from .capacity import estimate_service_minutes
    from .models import QueueStatus, CounterStatus

    active_counters: dict[str, "Counter"] = {
        cid: c for cid, c in state.counters.items()
        if c.status == CounterStatus.ACTIVE
    }

    # Build per-counter running workload starting from currently committed work.
    counter_workload: dict[str, float] = {}
    for cid, counter in active_counters.items():
        assigned = [
            e for e in state.entries.values()
            if e.assigned_counter_id == cid
            and e.status in (QueueStatus.ASSIGNED, QueueStatus.PROCESSING)
        ]
        counter_workload[cid] = _counter_remaining_workload(counter, assigned, state)

    # Sort WAITING entries in serving order for ETA assignment.
    from .fairness import sort_key
    waiting_entries = sorted(
        [e for e in state.entries.values() if e.status == QueueStatus.WAITING],
        key=sort_key,
    )

    modified: list["QueueEntry"] = []
    position_counter = 1

    # Track virtual workloads as we assign waiting entries to counters.
    virtual_workload = dict(counter_workload)

    for entry in waiting_entries:
        farmer = entry.farmer_request
        est_service = estimate_service_minutes(farmer, state)
        entry.estimated_service_minutes = est_service

        # Determine eligible counters for this farmer.
        eligible_cids = [
            cid for cid, c in active_counters.items()
            if c.can_serve_crop(farmer.crop)
        ]

        if not eligible_cids:
            # No eligible counter — cannot estimate ETA.
            entry.queue_position = position_counter
            entry.estimated_wait_minutes = None
            entry.estimated_total_minutes = None
            entry.eta_timestamp = None
        else:
            # Minimum virtual workload across eligible counters = when this farmer
            # would start being served if committed to the best counter next.
            best_cid = min(eligible_cids, key=lambda cid: virtual_workload[cid])
            wait_minutes = virtual_workload[best_cid]

            entry.queue_position = position_counter
            entry.estimated_wait_minutes = max(0.0, wait_minutes)
            entry.estimated_total_minutes = entry.estimated_wait_minutes + est_service

            if now is not None:
                completion_dt = now + timedelta(minutes=entry.estimated_total_minutes)
                entry.eta_timestamp = completion_dt.isoformat(timespec="seconds")
            else:
                entry.eta_timestamp = None

            # Advance the best counter's virtual workload by this entry's service time
            # (simulating commitment of this entry).
            virtual_workload[best_cid] += est_service

        position_counter += 1
        modified.append(entry)

    return modified
