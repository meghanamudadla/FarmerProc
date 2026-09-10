"""
Tests: Counter Specialization, General Fallback, Disable/Enable
===============================================================
Covers:
- Specialty counter serves matching crop first.
- Specialty counter falls back to general when idle and accepts_general_when_idle=True.
- Specialty counter with accepts_general_when_idle=False strictly rejects other crops.
- All-counters-busy → farmer queues correctly.
- INACTIVE counter exclusion.
- disable_counter mid-processing: farmer requeued at FRONT of lane (not back).
- enable_counter immediately serves next queued farmer.
"""

from __future__ import annotations

import pytest

from dqa.models import (
    Crop, Counter, CounterStatus, FarmerRequest, ProcurementCapacity, QueueStatus,
)
from dqa.engine import DQAEngine
from dqa.exceptions import UnknownCounterError


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_engine(counters, crops=None, caps=None) -> DQAEngine:
    if crops is None:
        crops = {
            "paddy":  Crop("paddy",  avg_service_min_per_qtl=3.5),
            "cotton": Crop("cotton", avg_service_min_per_qtl=6.0),
        }
    if caps is None:
        caps = [
            ProcurementCapacity("paddy",  total_qtl=9999.0),
            ProcurementCapacity("cotton", total_qtl=9999.0),
        ]
    return DQAEngine(crops=crops, counters=counters, capacities=caps, centre_id="t")


def req(token: str, crop: str, qty: float = 10.0, minute: int = 0) -> FarmerRequest:
    return FarmerRequest(
        farmer_id="F" + token, crop=crop, quantity_qtl=qty,
        arrival_time=f"2026-01-01T09:{minute:02d}:00",
        age=35, land_area_acres=2.0, token_number=token,
    )


# ── Specialty matching ────────────────────────────────────────────────────────

def test_specialty_counter_serves_matching_crop_first():
    counters = [
        Counter("COTTON-CTR", specialty="cotton", status=CounterStatus.ACTIVE),
    ]
    engine = make_engine(counters)
    d = engine.add_booking(req("T1", "cotton"))
    assert d.accepted
    assert d.assigned_counter_id == "COTTON-CTR"
    assert d.allocation_reason == "COUNTER_SPECIALTY_MATCH"


def test_general_counter_serves_any_crop():
    counters = [Counter("GEN", specialty=None, status=CounterStatus.ACTIVE)]
    engine = make_engine(counters)
    d1 = engine.add_booking(req("T1", "paddy"))
    d2_engine = make_engine([Counter("GEN2", specialty=None, status=CounterStatus.ACTIVE)])
    d2 = d2_engine.add_booking(req("T2", "cotton"))
    assert d1.assigned_counter_id == "GEN"
    assert d2.assigned_counter_id == "GEN2"


def test_specialty_counter_falls_back_to_general_when_idle():
    counters = [
        Counter("COTTON-CTR", specialty="cotton", status=CounterStatus.ACTIVE,
                accepts_general_when_idle=True),
    ]
    engine = make_engine(counters)
    # No cotton farmers — paddy farmer should be served (general fallback)
    d = engine.add_booking(req("T1", "paddy"))
    assert d.accepted
    assert d.assigned_counter_id == "COTTON-CTR"
    assert d.allocation_reason == "COUNTER_GENERAL_FALLBACK"


def test_specialty_counter_does_not_fall_back_when_flag_false():
    counters = [
        Counter("COTTON-CTR", specialty="cotton", status=CounterStatus.ACTIVE,
                accepts_general_when_idle=False),
    ]
    engine = make_engine(counters)
    # Paddy request → no eligible counter → queued
    d = engine.add_booking(req("T1", "paddy"))
    assert d.accepted   # should still be accepted (procurement passed)
    assert d.assigned_counter_id is None  # but not assigned to specialty counter


# ── All counters busy ─────────────────────────────────────────────────────────

def test_all_counters_busy_farmer_queued():
    counters = [Counter("C1", status=CounterStatus.ACTIVE)]
    engine = make_engine(counters)
    # First farmer takes the counter
    d1 = engine.add_booking(req("T1", "paddy", minute=0))
    assert d1.assigned_counter_id == "C1"
    # Second farmer queues
    d2 = engine.add_booking(req("T2", "paddy", minute=1))
    assert d2.accepted
    assert d2.assigned_counter_id is None
    entry2 = engine.state.entries[d2.booking_id]
    assert entry2.status == QueueStatus.WAITING


# ── INACTIVE counter exclusion ────────────────────────────────────────────────

def test_inactive_counter_never_receives_assignment():
    counters = [Counter("INACTIVE-CTR", status=CounterStatus.INACTIVE)]
    engine = make_engine(counters)
    d = engine.add_booking(req("T1", "paddy"))
    assert d.accepted
    assert d.assigned_counter_id is None   # inactive counter must not get it
    engine.assert_invariants()


def test_unknown_counter_raises():
    engine = make_engine([Counter("C1", status=CounterStatus.ACTIVE)])
    with pytest.raises(UnknownCounterError):
        engine.disable_counter("nonexistent")


# ── disable_counter: farmer requeued at FRONT ────────────────────────────────

def test_disable_counter_requeues_farmer_at_front():
    counters = [Counter("C1", status=CounterStatus.ACTIVE)]
    engine = make_engine(counters)
    # Book 3 farmers — F1 gets counter, F2 & F3 wait
    d_f1 = engine.add_booking(req("T1", "paddy", minute=0))
    d_f2 = engine.add_booking(req("T2", "paddy", minute=1))
    d_f3 = engine.add_booking(req("T3", "paddy", minute=2))

    assert d_f1.assigned_counter_id == "C1"
    f1_bid = d_f1.booking_id

    # Simulate F1 in PROCESSING state
    engine.state.entries[f1_bid].status = QueueStatus.PROCESSING

    # Disable counter
    decisions = engine.disable_counter("C1")
    assert len(decisions) == 1
    requeued = decisions[0]
    assert requeued.booking_id == f1_bid
    assert requeued.allocation_reason == "REQUEUED_COUNTER_DISABLED"
    assert requeued.status == QueueStatus.WAITING.value

    # F1 must now be at the front (earliest arrival sentinel)
    entry_f1 = engine.state.entries[f1_bid]
    assert entry_f1.farmer_request.arrival_time == "0000-00-00T00:00:00"
    engine.assert_invariants()


def test_disable_idle_counter_returns_empty_list():
    counters = [Counter("C1", status=CounterStatus.ACTIVE)]
    engine = make_engine(counters)
    # No bookings yet — counter is idle
    result = engine.disable_counter("C1")
    assert result == []
    engine.assert_invariants()


# ── enable_counter immediately allocates ─────────────────────────────────────

def test_enable_counter_immediately_serves_waiting_farmer():
    counters = [
        Counter("C1", status=CounterStatus.ACTIVE),
        Counter("C2", status=CounterStatus.INACTIVE),
    ]
    engine = make_engine(counters)
    # C1 takes one farmer; second farmer waits
    engine.add_booking(req("T1", "paddy", minute=0))
    d2 = engine.add_booking(req("T2", "paddy", minute=1))
    assert d2.assigned_counter_id is None

    # Enable C2 → should immediately pick up T2
    decision = engine.enable_counter("C2")
    assert decision is not None
    assert decision.assigned_counter_id == "C2"
    assert decision.booking_id == d2.booking_id
    engine.assert_invariants()


def test_enable_counter_returns_none_when_queue_empty():
    counters = [Counter("C1", status=CounterStatus.INACTIVE)]
    engine = make_engine(counters)
    result = engine.enable_counter("C1")
    assert result is None
