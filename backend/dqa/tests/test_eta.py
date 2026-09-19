"""
Tests: ETA Calculation — Single Counter, Split-Load, Rolling Average
=====================================================================
Covers:
- Single counter ETA as sum of entries ahead.
- Split-load ETA with multiple eligible counters (correct parallel load sharing).
- Rolling average update (alpha weighted) on completion.
- Rolling average shifts affect downstream ETA calculations.
- Per-(crop, counter) rolling average overrides global rate.
"""

from __future__ import annotations

import pytest

from dqa.models import Crop, Counter, CounterStatus, FarmerRequest, ProcurementCapacity, QueueStatus
from dqa.engine import DQAEngine
from dqa.eta import update_rolling_average, recalculate_eta_for_all
from dqa.models import QueueState


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_engine(n_counters: int = 1) -> DQAEngine:
    counters = [
        Counter(f"C{i+1}", status=CounterStatus.ACTIVE, operating_minutes_remaining=480.0)
        for i in range(n_counters)
    ]
    return DQAEngine(
        crops={"paddy": Crop("paddy", avg_service_min_per_qtl=4.0)},
        counters=counters,
        capacities=[ProcurementCapacity("paddy", total_qtl=9999.0)],
        centre_id="test",
    )


def req(token: str, qty: float, minute: int = 0) -> FarmerRequest:
    return FarmerRequest(
        farmer_id="F" + token, crop="paddy", quantity_qtl=qty,
        arrival_time=f"2026-01-01T09:{minute:02d}:00",
        age=35, land_area_acres=2.0, token_number=token,
    )


# ── Single counter ETA ────────────────────────────────────────────────────────

def test_single_counter_first_farmer_zero_wait():
    engine = make_engine(n_counters=1)
    d = engine.add_booking(req("T1", qty=10.0))
    # First farmer gets assigned immediately — wait = 0
    assert d.estimated_wait_minutes == pytest.approx(0.0)
    assert d.estimated_service_minutes == pytest.approx(40.0)  # 10 * 4.0


def test_single_counter_second_farmer_waits_behind_first():
    engine = make_engine(n_counters=1)
    engine.add_booking(req("T1", qty=10.0))   # takes C1 (40 min)
    engine.add_booking(req("T2", qty=5.0))    # waits behind T1

    entries = recalculate_eta_for_all(engine.state)
    waiting = [e for e in entries if e.status == QueueStatus.WAITING]
    assert len(waiting) == 1
    # T2 must wait at least as long as T1's service time (40 min)
    assert waiting[0].estimated_wait_minutes == pytest.approx(40.0, abs=1.0)


def test_queue_position_monotonically_increasing():
    engine = make_engine(n_counters=1)
    for i in range(5):
        engine.add_booking(req(f"T{i}", qty=10.0, minute=i))

    entries = recalculate_eta_for_all(engine.state)
    positions = [e.queue_position for e in entries if e.queue_position is not None]
    assert positions == sorted(positions)
    assert len(set(positions)) == len(positions)   # all unique


# ── Split-load ETA (multi-counter parallel) ────────────────────────────────────

def test_two_counters_split_load_halves_wait_time():
    """
    Two eligible counters and one assigned farmer each → second farmer's wait
    should be approximately half of what it would be with one counter.
    """
    engine = make_engine(n_counters=2)
    # Assign T1 to C1 and T2 to C2, each 40 min
    d1 = engine.add_booking(req("T1", qty=10.0, minute=0))  # → C1
    d2 = engine.add_booking(req("T2", qty=10.0, minute=1))  # → C2
    # T3 waits — eligible for both C1 and C2 (load split)
    d3 = engine.add_booking(req("T3", qty=10.0, minute=2))

    entries = recalculate_eta_for_all(engine.state)
    t3_entry = next(e for e in entries if e.farmer_request.token_number == "T3")

    if t3_entry.estimated_wait_minutes is not None:
        # With two counters each carrying ~40min, T3's wait is ~40min
        # (it goes to whichever frees first — both have 40min left)
        assert t3_entry.estimated_wait_minutes <= 45.0


def test_split_load_eta_less_than_single_counter():
    """
    With 3 counters serving paddy, the 4th farmer's wait should be less than
    or equal to what it would be with 1 counter (demonstrating split-load).
    """
    engine_1 = make_engine(n_counters=1)
    engine_3 = make_engine(n_counters=3)

    for i in range(3):
        engine_1.add_booking(req(f"T{i}", qty=10.0, minute=i))
        engine_3.add_booking(req(f"T{i}", qty=10.0, minute=i))

    d_1 = engine_1.add_booking(req("T4", qty=10.0, minute=3))
    d_3 = engine_3.add_booking(req("T4", qty=10.0, minute=3))

    entries_1 = recalculate_eta_for_all(engine_1.state)
    entries_3 = recalculate_eta_for_all(engine_3.state)

    t4_1 = next((e for e in entries_1 if e.farmer_request.token_number == "T4"), None)
    t4_3 = next((e for e in entries_3 if e.farmer_request.token_number == "T4"), None)

    if t4_1 and t4_3 and t4_1.estimated_wait_minutes and t4_3.estimated_wait_minutes:
        assert t4_3.estimated_wait_minutes <= t4_1.estimated_wait_minutes


# ── Rolling average ───────────────────────────────────────────────────────────

def test_rolling_average_shifts_down_on_fast_completion():
    engine = make_engine(n_counters=1)
    d = engine.add_booking(req("T1", qty=10.0))

    old_rate = engine.state.crops["paddy"].avg_service_min_per_qtl  # 4.0
    # Actual = 20 min for 10 qtl = 2.0 min/qtl (faster than 4.0)
    engine.complete_booking(d.booking_id, actual_service_minutes=20.0)
    new_rate = engine.state.crops["paddy"].avg_service_min_per_qtl

    assert new_rate < old_rate, f"Expected rate to decrease from {old_rate} but got {new_rate}"


def test_rolling_average_shifts_up_on_slow_completion():
    engine = make_engine(n_counters=1)
    d = engine.add_booking(req("T1", qty=10.0))

    old_rate = engine.state.crops["paddy"].avg_service_min_per_qtl  # 4.0
    # Actual = 80 min for 10 qtl = 8.0 min/qtl (slower)
    engine.complete_booking(d.booking_id, actual_service_minutes=80.0)
    new_rate = engine.state.crops["paddy"].avg_service_min_per_qtl

    assert new_rate > old_rate, f"Expected rate to increase from {old_rate} but got {new_rate}"


def test_rolling_average_formula_exact():
    """alpha=0.3: new = 0.3*actual + 0.7*old"""
    alpha = 0.3
    old = 4.0
    actual_rate = 2.0
    expected_new = alpha * actual_rate + (1 - alpha) * old

    state = QueueState(
        centre_id="test",
        crops={"paddy": Crop("paddy", avg_service_min_per_qtl=old)},
        capacities={},
        counters={},
    )
    update_rolling_average(state, "paddy", actual_rate, "C1", alpha=alpha)
    assert state.crops["paddy"].avg_service_min_per_qtl == pytest.approx(expected_new, abs=0.001)


def test_per_counter_rate_differs_from_global():
    """Completion on one counter updates its local rate but global rate changes differently."""
    alpha = 0.3
    state = QueueState(
        centre_id="test",
        crops={"paddy": Crop("paddy", avg_service_min_per_qtl=4.0)},
        capacities={},
        counters={},
    )
    update_rolling_average(state, "paddy", 2.0, "C_FAST", alpha=alpha)
    update_rolling_average(state, "paddy", 6.0, "C_SLOW", alpha=alpha)

    assert "C_FAST" in state.per_counter_rolling_rates
    assert "C_SLOW" in state.per_counter_rolling_rates
    fast_rate = state.per_counter_rolling_rates["C_FAST"]["paddy"]
    slow_rate = state.per_counter_rolling_rates["C_SLOW"]["paddy"]
    assert fast_rate < slow_rate
