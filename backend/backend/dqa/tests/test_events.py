"""
Tests: Event Lifecycle — complete, cancel, no-show, retry, counter_available
=============================================================================
Covers:
- complete_booking: happy path, rolling average, freed counter re-allocated.
- complete_booking on already-completed id: raises clear typed exception.
- cancel_booking: releases reservation, frees counter.
- cancel_booking on COMPLETED: raises InvalidStateTransitionError.
- mark_no_show: first no-show → RETRY_PENDING → WAITING.
- mark_no_show: second no-show → CANCELLED.
- counter_available: allocates correctly when called directly.
- explain: returns non-empty human-readable string.
"""

from __future__ import annotations

import pytest

from dqa.models import Crop, Counter, CounterStatus, FarmerRequest, ProcurementCapacity, QueueStatus
from dqa.engine import DQAEngine
from dqa.exceptions import UnknownBookingError, InvalidStateTransitionError


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_engine() -> DQAEngine:
    return DQAEngine(
        crops={"paddy": Crop("paddy", avg_service_min_per_qtl=3.5)},
        counters=[Counter("C1", status=CounterStatus.ACTIVE)],
        capacities=[ProcurementCapacity("paddy", total_qtl=9999.0)],
        centre_id="test",
    )


def req(token: str, qty: float = 10.0, minute: int = 0) -> FarmerRequest:
    return FarmerRequest(
        farmer_id="F" + token, crop="paddy", quantity_qtl=qty,
        arrival_time=f"2026-01-01T09:{minute:02d}:00",
        age=35, land_area_acres=2.0, token_number=token,
    )


# ── complete_booking ──────────────────────────────────────────────────────────

def test_complete_booking_happy_path():
    engine = make_engine()
    d = engine.add_booking(req("T1"))
    assert d.assigned_counter_id == "C1"

    results = engine.complete_booking(d.booking_id, actual_service_minutes=35.0)
    entry = engine.state.entries[d.booking_id]
    assert entry.status == QueueStatus.COMPLETED
    # Procurement should move from reserved to procured
    cap = engine.state.capacities["paddy"]
    assert cap.procured_qtl == 10.0
    assert cap.reserved_qtl == 0.0
    engine.assert_invariants()


def test_complete_booking_frees_counter_and_allocates_next():
    engine = make_engine()
    d1 = engine.add_booking(req("T1", minute=0))
    d2 = engine.add_booking(req("T2", minute=1))
    assert d1.assigned_counter_id == "C1"
    assert d2.assigned_counter_id is None  # waiting

    next_decisions = engine.complete_booking(d1.booking_id, actual_service_minutes=35.0)
    assert len(next_decisions) == 1
    assert next_decisions[0].assigned_counter_id == "C1"
    assert next_decisions[0].booking_id == d2.booking_id
    engine.assert_invariants()


def test_complete_booking_already_completed_raises():
    engine = make_engine()
    d = engine.add_booking(req("T1"))
    engine.complete_booking(d.booking_id, actual_service_minutes=35.0)
    with pytest.raises(InvalidStateTransitionError):
        engine.complete_booking(d.booking_id, actual_service_minutes=10.0)


def test_complete_booking_unknown_id_raises():
    engine = make_engine()
    with pytest.raises(UnknownBookingError):
        engine.complete_booking("non-existent-id", actual_service_minutes=10.0)


def test_complete_booking_updates_rolling_average():
    engine = make_engine()
    old_rate = engine.state.crops["paddy"].avg_service_min_per_qtl
    d = engine.add_booking(req("T1", qty=10.0))
    engine.complete_booking(d.booking_id, actual_service_minutes=20.0)  # faster than estimate
    new_rate = engine.state.crops["paddy"].avg_service_min_per_qtl
    assert new_rate != old_rate


# ── cancel_booking ────────────────────────────────────────────────────────────

def test_cancel_booking_releases_reservation():
    engine = make_engine()
    d = engine.add_booking(req("T1"))
    assert engine.state.capacities["paddy"].reserved_qtl == 10.0

    engine.cancel_booking(d.booking_id)
    assert engine.state.capacities["paddy"].reserved_qtl == 0.0
    entry = engine.state.entries[d.booking_id]
    assert entry.status == QueueStatus.CANCELLED
    engine.assert_invariants()


def test_cancel_waiting_farmer():
    engine = make_engine()
    engine.add_booking(req("T1", minute=0))   # takes counter
    d2 = engine.add_booking(req("T2", minute=1))  # waiting

    engine.cancel_booking(d2.booking_id)
    entry = engine.state.entries[d2.booking_id]
    assert entry.status == QueueStatus.CANCELLED
    engine.assert_invariants()


def test_cancel_completed_booking_raises():
    engine = make_engine()
    d = engine.add_booking(req("T1"))
    engine.complete_booking(d.booking_id, actual_service_minutes=30.0)
    with pytest.raises(InvalidStateTransitionError):
        engine.cancel_booking(d.booking_id)


def test_cancel_unknown_booking_raises():
    engine = make_engine()
    with pytest.raises(UnknownBookingError):
        engine.cancel_booking("ghost-id")


# ── mark_no_show ──────────────────────────────────────────────────────────────

def test_first_no_show_requeues_farmer():
    engine = make_engine()
    d = engine.add_booking(req("T1"))
    result = engine.mark_no_show(d.booking_id)
    assert result["event"] == "NO_SHOW"
    assert result["new_status"] == QueueStatus.WAITING.value
    entry = engine.state.entries[d.booking_id]
    assert entry.status == QueueStatus.WAITING
    # Reservation is still held (not released)
    assert engine.state.capacities["paddy"].reserved_qtl == 10.0
    engine.assert_invariants()


def test_second_no_show_cancels_booking():
    engine = make_engine()
    d = engine.add_booking(req("T1"))

    # First no-show
    engine.mark_no_show(d.booking_id)
    entry = engine.state.entries[d.booking_id]
    assert entry.status == QueueStatus.WAITING

    # Second no-show
    result = engine.mark_no_show(d.booking_id)
    assert result["new_status"] == QueueStatus.CANCELLED.value
    entry = engine.state.entries[d.booking_id]
    assert entry.status == QueueStatus.CANCELLED
    # Reservation released on final cancel
    assert engine.state.capacities["paddy"].reserved_qtl == 0.0
    engine.assert_invariants()


def test_no_show_unknown_booking_raises():
    engine = make_engine()
    with pytest.raises(UnknownBookingError):
        engine.mark_no_show("ghost-id")


# ── counter_available ─────────────────────────────────────────────────────────

def test_counter_available_returns_none_when_queue_empty():
    engine = make_engine()
    result = engine.counter_available("C1")
    assert result is None


def test_counter_available_assigns_waiting_farmer():
    engine = make_engine()
    engine.add_booking(req("T1", minute=0))   # gets counter
    d2 = engine.add_booking(req("T2", minute=1))  # waiting

    # Manually free counter (simulating a completion without calling complete_booking)
    engine.state.counters["C1"].current_booking_id = None
    engine.state.entries[d2.booking_id].status = QueueStatus.WAITING

    result = engine.counter_available("C1")
    assert result is not None
    assert result.booking_id == d2.booking_id
    assert result.assigned_counter_id == "C1"
    engine.assert_invariants()


def test_counter_available_inactive_counter_returns_none():
    engine = make_engine()
    engine.state.counters["C1"].status = CounterStatus.INACTIVE
    engine.add_booking(req("T1"))
    result = engine.counter_available("C1")
    assert result is None


# ── explain ───────────────────────────────────────────────────────────────────

def test_explain_returns_nonempty_string():
    engine = make_engine()
    d = engine.add_booking(req("T1"))
    audit = engine.explain(d.booking_id)
    assert isinstance(audit, str)
    assert len(audit) > 0
    assert "T1" in audit or "PDC" in audit or "F" in audit


def test_explain_unknown_booking_raises():
    engine = make_engine()
    with pytest.raises(UnknownBookingError):
        engine.explain("no-such-id")


def test_explain_includes_history_entries():
    engine = make_engine()
    d = engine.add_booking(req("T1"))
    engine.complete_booking(d.booking_id, actual_service_minutes=30.0)
    audit = engine.explain(d.booking_id)
    assert "Completed" in audit or "COMPLETED" in audit or "History" in audit
