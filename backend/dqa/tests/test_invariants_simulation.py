"""
Tests: Safety Invariants + Full Simulation Integration
=======================================================
Runs assert_invariants() after every step of the simulation and verifies
that all 8 safety invariants hold throughout the entire scenario.

Also runs the full simulation script to ensure it executes without errors.
"""

from __future__ import annotations

import pytest

from dqa.models import (
    Crop, Counter, CounterStatus, FarmerRequest,
    ProcurementCapacity, QueueStatus,
)
from dqa.engine import DQAEngine


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_engine() -> DQAEngine:
    return DQAEngine(
        crops={
            "paddy":  Crop("paddy",  avg_service_min_per_qtl=3.5),
            "cotton": Crop("cotton", avg_service_min_per_qtl=6.0),
        },
        counters=[
            Counter("A", specialty=None,      status=CounterStatus.ACTIVE),
            Counter("B", specialty="cotton",  status=CounterStatus.ACTIVE, accepts_general_when_idle=True),
            Counter("C", specialty=None,      status=CounterStatus.ACTIVE),
        ],
        capacities=[
            ProcurementCapacity("paddy",  total_qtl=1000.0),
            ProcurementCapacity("cotton", total_qtl=500.0),
        ],
        centre_id="test",
        priority_ratio=1,
        queue_window=5,
    )


def req(token: str, crop: str, qty: float, minute: int = 0,
        age: int = 35, acres: float = 2.0) -> FarmerRequest:
    return FarmerRequest(
        farmer_id="F" + token, crop=crop, quantity_qtl=qty,
        arrival_time=f"2026-01-01T09:{minute:02d}:00",
        age=age, land_area_acres=acres, token_number=token,
    )


# ── Invariant tests in isolation ──────────────────────────────────────────────

def test_no_capacity_violation_after_bookings():
    engine = make_engine()
    for i in range(10):
        engine.add_booking(req(f"T{i:02d}", "paddy", qty=50.0, minute=i))
        engine.assert_invariants()
    cap = engine.state.capacities["paddy"]
    assert cap.available_qtl >= 0.0


def test_no_double_assignment():
    """Two farmers cannot be in PROCESSING state on the same counter simultaneously."""
    engine = make_engine()
    d1 = engine.add_booking(req("T1", "paddy", 10.0, minute=0))
    d2 = engine.add_booking(req("T2", "paddy", 10.0, minute=1))

    # Force both entries to PROCESSING on the same counter to trigger INV2
    if d1.booking_id in engine.state.entries and d2.booking_id in engine.state.entries:
        entry1 = engine.state.entries[d1.booking_id]
        entry2 = engine.state.entries[d2.booking_id]
        # Set up the double-assignment scenario directly
        entry1.status = QueueStatus.PROCESSING
        entry1.assigned_counter_id = "A"
        entry2.status = QueueStatus.PROCESSING
        entry2.assigned_counter_id = "A"  # same counter → violation

        with pytest.raises(AssertionError, match="double-assigned|INV2"):
            engine.assert_invariants()



def test_completed_entry_has_no_counter():
    engine = make_engine()
    d = engine.add_booking(req("T1", "paddy", 10.0))
    engine.complete_booking(d.booking_id, actual_service_minutes=30.0)
    entry = engine.state.entries[d.booking_id]
    assert entry.assigned_counter_id is None
    engine.assert_invariants()


def test_inactive_counter_not_assigned():
    engine = make_engine()
    engine.disable_counter("A")
    # If any ASSIGNED/PROCESSING entry points to A, invariant should catch it
    engine.assert_invariants()


def test_no_negative_capacity_invariant():
    engine = make_engine()
    # Inject negative capacity via direct manipulation to verify invariant catches it
    engine.state.capacities["paddy"].reserved_qtl = -1.0
    with pytest.raises(AssertionError, match="INV5"):
        engine.assert_invariants()


def test_no_negative_eta_invariant():
    engine = make_engine()
    d = engine.add_booking(req("T1", "paddy", 10.0))
    entry = engine.state.entries[d.booking_id]
    entry.estimated_wait_minutes = -5.0  # inject invalid
    with pytest.raises(AssertionError, match="INV6"):
        engine.assert_invariants()


# ── Full simulation integration ───────────────────────────────────────────────

def test_full_simulation_runs_without_error():
    """The simulation script must execute end-to-end without raising exceptions."""
    from dqa import simulation
    simulation.run()   # stdout captured by pytest; exception = test failure


def test_simulation_invariants_hold_throughout():
    """
    Replicate core simulation steps and verify assert_invariants passes after each.
    """
    engine = make_engine()

    # Step 1: Initial bookings
    farmers = [
        req("T1", "paddy",  20.0, minute=0),
        req("T2", "paddy",  15.0, minute=1),
        req("T3", "paddy",  30.0, minute=2),
        req("T4", "paddy",  10.0, minute=3, age=65),   # priority
        req("T5", "cotton",  8.0, minute=0),
        req("T6", "cotton", 12.0, minute=5),
        req("T7", "paddy",   5.0, minute=10, acres=0.5),  # priority small farmer
    ]
    bids: dict[str, str] = {}
    for f in farmers:
        d = engine.add_booking(f)
        if d.booking_id:
            bids[f.token_number] = d.booking_id
        engine.assert_invariants()

    # Step 2: Complete an assigned booking
    assigned = [
        (e.farmer_request.token_number, e.booking_id)
        for e in engine.state.entries.values()
        if e.status == QueueStatus.ASSIGNED
    ]
    if assigned:
        tok, bid = assigned[0]
        engine.complete_booking(bid, actual_service_minutes=50.0)
        engine.assert_invariants()

    # Step 3: No-show → retry
    waiting = [
        (e.farmer_request.token_number, e.booking_id)
        for e in engine.state.entries.values()
        if e.status in (QueueStatus.WAITING, QueueStatus.ASSIGNED)
    ]
    if waiting:
        _, ns_bid = waiting[0]
        engine.mark_no_show(ns_bid)
        engine.assert_invariants()

    # Step 4: Cancel one
    waiting2 = [
        e.booking_id for e in engine.state.entries.values()
        if e.status == QueueStatus.WAITING
    ]
    if waiting2:
        engine.cancel_booking(waiting2[-1])
        engine.assert_invariants()

    # Step 5: New farmer mid-simulation
    late = req("T8", "paddy", 18.0, minute=60)
    engine.add_booking(late)
    engine.assert_invariants()

    # Step 6: Rejection — exceed capacity
    engine.state.capacities["cotton"].procured_qtl = 490.0
    d_rej = engine.add_booking(req("T9", "cotton", 50.0, minute=61))
    assert not d_rej.accepted
    engine.assert_invariants()

    # Step 7: Disable counter mid-processing
    assigned2 = [
        e for e in engine.state.entries.values()
        if e.status == QueueStatus.ASSIGNED and e.assigned_counter_id
    ]
    if assigned2:
        vic = assigned2[0]
        vic.status = QueueStatus.PROCESSING
        disabled = vic.assigned_counter_id
        engine.disable_counter(disabled)
        engine.assert_invariants()
        engine.enable_counter(disabled)
        engine.assert_invariants()

    # Final complete simulation invariant check
    engine.assert_invariants()
