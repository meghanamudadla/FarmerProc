"""
Tests: Capacity — Dual-Gate Truth Table
=========================================
Covers all 4 cells of (Procurement pass/fail) × (Processing pass/fail):
  Cell A: Both pass   → entry queued/assigned, reservation made.
  Cell B: Proc fail   → hard rejection, NO reservation.
  Cell C: Proc pass, Processing fail → still accepted, queued pending capacity.
  Cell D: Both fail   → hard rejection (proc gate is checked first).
"""

from __future__ import annotations

import pytest

from dqa.models import (
    Crop, Counter, CounterStatus, FarmerRequest, ProcurementCapacity,
    QueueStatus
)
from dqa.engine import DQAEngine
from dqa.exceptions import CapacityExceededError, UnknownCropError
from dqa.capacity import (
    check_procurement_capacity, reserve_procurement_capacity,
    release_procurement_reservation, estimate_service_minutes,
    check_processing_capacity,
)


# ── Fixtures ──────────────────────────────────────────────────────────────────

def make_engine(total_qtl: float = 100.0, counter_window: float = 60.0) -> DQAEngine:
    """Minimal engine: 1 crop, 1 counter."""
    return DQAEngine(
        crops={"paddy": Crop("paddy", avg_service_min_per_qtl=3.5)},
        counters=[
            Counter("C1", status=CounterStatus.ACTIVE,
                    operating_minutes_remaining=counter_window),
        ],
        capacities=[ProcurementCapacity("paddy", total_qtl=total_qtl)],
        centre_id="test",
    )


def req(qty: float, token: str = "T001", crop: str = "paddy") -> FarmerRequest:
    return FarmerRequest(
        farmer_id="F1", crop=crop, quantity_qtl=qty,
        arrival_time="2026-01-01T09:00:00",
        age=35, land_area_acres=2.0, token_number=token,
    )


# ── Cell A: Both pass ─────────────────────────────────────────────────────────

def test_exact_boundary_quantity_accepted():
    """qty == available_qtl should pass (boundary inclusive)."""
    engine = make_engine(total_qtl=20.0)
    d = engine.add_booking(req(20.0))
    assert d.accepted
    assert d.procurement_capacity_remaining == 0.0


def test_normal_booking_accepted_and_reserved():
    """Standard case: qty < available_qtl, counter available."""
    engine = make_engine(total_qtl=100.0)
    d = engine.add_booking(req(30.0))
    assert d.accepted
    # Reservation deducted from capacity
    assert engine.state.capacities["paddy"].reserved_qtl == 30.0
    assert engine.state.capacities["paddy"].available_qtl == 70.0


# ── Cell B: Procurement fails ─────────────────────────────────────────────────

def test_one_over_quantity_rejected():
    """qty = available_qtl + epsilon must be rejected."""
    engine = make_engine(total_qtl=20.0)
    d = engine.add_booking(req(20.01))
    assert not d.accepted
    assert d.allocation_reason == "REJECTED_PROCUREMENT_CAPACITY_EXCEEDED"
    assert d.procurement_capacity_remaining == pytest.approx(20.0, abs=0.01)


def test_zero_capacity_rejected():
    """No capacity at all → rejection."""
    engine = make_engine(total_qtl=0.0)
    d = engine.add_booking(req(1.0))
    assert not d.accepted
    assert d.allocation_reason == "REJECTED_PROCUREMENT_CAPACITY_EXCEEDED"
    assert d.procurement_capacity_remaining == 0.0


def test_unknown_crop_rejected():
    """Requesting a crop not in the centre's table → rejection."""
    engine = make_engine()
    d = engine.add_booking(req(10.0, crop="wheat"))
    assert not d.accepted
    assert d.allocation_reason == "REJECTED_PROCUREMENT_CAPACITY_EXCEEDED"


def test_reservation_not_made_on_rejection():
    """Rejected requests must not modify procurement capacity."""
    engine = make_engine(total_qtl=10.0)
    before = engine.state.capacities["paddy"].available_qtl
    engine.add_booking(req(20.0))
    after = engine.state.capacities["paddy"].available_qtl
    assert before == after


# ── Cell C: Procurement passes, Processing fails ──────────────────────────────

def test_processed_fail_still_queued_not_rejected():
    """
    Counter window too small (counter_window=5min, need 70min) → booking is
    accepted (procurement capacity reserved) but entry stays WAITING.
    """
    engine = make_engine(total_qtl=100.0, counter_window=5.0)
    # 20qtl * 3.5 min/qtl = 70 min estimated; window only 5 min
    d = engine.add_booking(req(20.0))
    assert d.accepted, "Must be accepted (not hard-rejected) when only processing capacity fails"
    entry = engine.state.entries[d.booking_id]
    assert entry.status in (QueueStatus.WAITING, QueueStatus.ASSIGNED)
    # Capacity IS reserved (procurement gate passed)
    assert engine.state.capacities["paddy"].reserved_qtl > 0


# ── Cell D: Both fail ─────────────────────────────────────────────────────────

def test_proc_gate_checked_first():
    """Both gates fail: only procurement rejection is returned (proc gate is checked first)."""
    engine = make_engine(total_qtl=0.0, counter_window=5.0)
    d = engine.add_booking(req(10.0))
    assert not d.accepted
    assert d.allocation_reason == "REJECTED_PROCUREMENT_CAPACITY_EXCEEDED"


# ── Reservation lifecycle ─────────────────────────────────────────────────────

def test_reservation_released_on_cancellation():
    """Cancelling a booking releases its procurement reservation."""
    engine = make_engine(total_qtl=100.0)
    d = engine.add_booking(req(40.0))
    assert d.accepted
    assert engine.state.capacities["paddy"].reserved_qtl == 40.0

    engine.cancel_booking(d.booking_id)
    assert engine.state.capacities["paddy"].reserved_qtl == 0.0
    assert engine.state.capacities["paddy"].available_qtl == 100.0


def test_two_bookings_do_not_exceed_total():
    """Sequential bookings must not double-spend capacity."""
    engine = make_engine(total_qtl=50.0)
    d1 = engine.add_booking(req(30.0, token="T1"))
    d2 = engine.add_booking(req(30.0, token="T2"))
    assert d1.accepted
    assert not d2.accepted
    assert engine.state.capacities["paddy"].available_qtl >= 0.0


# ── Unit tests for capacity module directly ───────────────────────────────────

def test_check_procurement_capacity_raises():
    from dqa.models import QueueState
    state = QueueState(
        centre_id="t",
        crops={"paddy": Crop("paddy", 3.5)},
        capacities={"paddy": ProcurementCapacity("paddy", total_qtl=10.0)},
    )
    with pytest.raises(CapacityExceededError):
        check_procurement_capacity(req(15.0), state)


def test_check_processing_capacity_true_when_counter_has_time():
    counter = Counter("X", operating_minutes_remaining=100.0)
    assert check_processing_capacity(50.0, [counter]) is True


def test_check_processing_capacity_false_when_no_counters():
    assert check_processing_capacity(10.0, []) is False


def test_check_processing_capacity_false_when_window_insufficient():
    counter = Counter("X", operating_minutes_remaining=10.0)
    assert check_processing_capacity(50.0, [counter]) is False
