"""
DQA Capacity Verification
==========================
Implements the two independent capacity gates that every FarmerRequest must
pass through before it can enter the queue.

Gate 1 — Procurement Capacity: how much crop, by weight, remains purchasable.
Gate 2 — Processing Capacity: whether any counter has a sufficient time window
    remaining to service this booking at all within the current slot.

These gates are intentionally separate functions — a request can pass Gate 1
and fail Gate 2 (queued but not rejected), or fail Gate 1 (hard rejection).
See truth table in tests/test_capacity.py.
"""

from __future__ import annotations

from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .models import FarmerRequest, QueueState, Counter

from .exceptions import CapacityExceededError, UnknownCropError


# ---------------------------------------------------------------------------
# Gate 1 — Procurement Capacity
# ---------------------------------------------------------------------------

def check_procurement_capacity(
    farmer: "FarmerRequest",
    state: "QueueState",
) -> float:
    """
    Verify that the centre still has enough quota to purchase this farmer's crop.

    Pre-condition: `state.capacities` and `state.crops` are populated.
    Post-condition on success: returns `available_qtl` AFTER reserving
        farmer.quantity_qtl (i.e. the remaining headroom).

    Raises:
        UnknownCropError: if the crop is not in the centre's crop table.
        CapacityExceededError: if available_qtl < farmer.quantity_qtl.
    """
    if farmer.crop not in state.crops:
        raise UnknownCropError(farmer.crop)

    cap = state.capacities.get(farmer.crop)
    if cap is None:
        # No capacity record means this crop is not procured at this centre.
        raise CapacityExceededError(farmer.crop, farmer.quantity_qtl, 0.0)

    available = cap.available_qtl
    if farmer.quantity_qtl > available:
        raise CapacityExceededError(farmer.crop, farmer.quantity_qtl, available)

    # Return remaining capacity AFTER this booking would be reserved.
    return available - farmer.quantity_qtl


def reserve_procurement_capacity(
    crop: str,
    quantity_qtl: float,
    state: "QueueState",
) -> None:
    """
    Atomically reserve quantity_qtl from the crop's procurement capacity.

    Pre-condition: check_procurement_capacity passed for this request.
    Post-condition: state.capacities[crop].reserved_qtl increases by quantity_qtl.

    This is the only place reserved_qtl is incremented. The backend team
    calls mark_procured() to graduate reserved → procured after completion.
    """
    state.capacities[crop].reserved_qtl += quantity_qtl


def release_procurement_reservation(
    crop: str,
    quantity_qtl: float,
    state: "QueueState",
) -> None:
    """
    Release a previously reserved quantity (on cancellation or no-show).

    Post-condition: state.capacities[crop].reserved_qtl decreases by quantity_qtl,
        floored at 0.0 to prevent negative values under any race condition.
    """
    cap = state.capacities.get(crop)
    if cap is not None:
        cap.reserved_qtl = max(0.0, cap.reserved_qtl - quantity_qtl)


def mark_procured(
    crop: str,
    quantity_qtl: float,
    state: "QueueState",
) -> None:
    """
    Graduate a reservation to procured on completion.

    Post-condition: reserved_qtl decreases, procured_qtl increases, both bounded below 0.
    """
    cap = state.capacities.get(crop)
    if cap is not None:
        cap.reserved_qtl = max(0.0, cap.reserved_qtl - quantity_qtl)
        cap.procured_qtl += quantity_qtl


# ---------------------------------------------------------------------------
# Gate 2 — Processing Capacity
# ---------------------------------------------------------------------------

def estimate_service_minutes(
    farmer: "FarmerRequest",
    state: "QueueState",
    counter_id: Optional[str] = None,
) -> float:
    """
    Estimate processing time for this farmer's booking.

    Formula: quantity_qtl × avg_service_min_per_qtl

    When counter_id is provided, uses the per-(crop, counter) rolling average
    if one exists; otherwise falls back to the global crop rate.

    Pre-condition: farmer.crop exists in state.crops.
    Post-condition: returns a positive float.
    """
    # Per-counter override takes precedence
    if counter_id and counter_id in state.per_counter_rolling_rates:
        rate = state.per_counter_rolling_rates[counter_id].get(
            farmer.crop,
            state.crops[farmer.crop].avg_service_min_per_qtl,
        )
    else:
        rate = state.crops[farmer.crop].avg_service_min_per_qtl

    return farmer.quantity_qtl * rate


def check_processing_capacity(
    estimated_service_minutes: float,
    eligible_counters: list["Counter"],
) -> bool:
    """
    Determine whether ANY eligible counter has enough operating time remaining
    to service the booking within the current window.

    Returns True if at least one counter can accommodate the booking.
    Returns False if no counter can — the booking should be queued pending
    the next available window; it must NOT be hard-rejected.

    Pre-condition: eligible_counters is already filtered for crop compatibility
        and ACTIVE status.
    Post-condition: purely read-only, no mutations.
    """
    if not eligible_counters:
        return False
    return any(
        c.operating_minutes_remaining >= estimated_service_minutes
        for c in eligible_counters
    )
