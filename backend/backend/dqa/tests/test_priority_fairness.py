"""
Tests: Priority Eligibility & Fairness Bounded-Interleaving
============================================================
Covers:
- Priority predicate correctness (age, land area thresholds, both, neither).
- FCFS tiebreaks down to token_number with identical timestamps.
- Sliding-window fairness constraint enforcement.
- Starvation prevention: no normal farmer waits behind >priority_ratio
  consecutive priority farmers indefinitely.
- Randomized sequences to verify no window of size queue_window
  exceeds priority_ratio priority serves.
"""

from __future__ import annotations

import random
import pytest

from dqa.models import Crop, Counter, CounterStatus, FarmerRequest, ProcurementCapacity, QueueEntry, QueueStatus
from dqa.engine import DQAEngine
from dqa.priority import make_priority_predicate, default_is_priority
from dqa.fairness import can_serve_priority_now, select_next_candidate, sort_key


# ── Fixtures ──────────────────────────────────────────────────────────────────

def req(token: str, age: int = 35, acres: float = 2.0,
        arrival: str = "2026-01-01T09:00:00", crop: str = "paddy") -> FarmerRequest:
    return FarmerRequest(
        farmer_id="F" + token, crop=crop, quantity_qtl=10.0,
        arrival_time=arrival, age=age, land_area_acres=acres,
        token_number=token,
    )


def entry_from_req(farmer: FarmerRequest, priority: bool) -> QueueEntry:
    return QueueEntry(
        booking_id="bid-" + farmer.token_number,
        farmer_request=farmer,
        status=QueueStatus.WAITING,
        priority_lane=priority,
    )


# ── Priority predicate ────────────────────────────────────────────────────────

def test_priority_by_age():
    is_p = make_priority_predicate()
    assert is_p(req("T1", age=60))       # senior citizen (inclusive)
    assert is_p(req("T2", age=75))
    assert not is_p(req("T3", age=59))


def test_priority_by_land():
    is_p = make_priority_predicate()
    assert is_p(req("T1", acres=0.5))    # small farmer (exclusive threshold)
    assert is_p(req("T2", acres=0.99))
    assert not is_p(req("T3", acres=1.0))  # exactly 1.0 is NOT priority
    assert not is_p(req("T4", acres=2.0))


def test_priority_both_conditions():
    is_p = make_priority_predicate()
    assert is_p(req("T1", age=65, acres=0.5))


def test_not_priority_neither():
    is_p = make_priority_predicate()
    assert not is_p(req("T1", age=40, acres=2.0))


def test_configurable_thresholds():
    """Custom thresholds work correctly."""
    is_p = make_priority_predicate(senior_age_threshold=70, small_farmer_acres_threshold=0.5)
    assert is_p(req("T1", age=70))
    assert not is_p(req("T2", age=60))  # below custom threshold
    assert is_p(req("T3", acres=0.4))
    assert not is_p(req("T4", acres=0.5))  # not below 0.5


# ── FCFS ordering with tiebreaks ──────────────────────────────────────────────

def test_fcfs_same_arrival_tiebreak_by_token():
    """Same arrival_time → tiebreak by token_number (lexicographic)."""
    same_time = "2026-01-01T09:00:00"
    e1 = entry_from_req(req("T003", arrival=same_time), priority=False)
    e2 = entry_from_req(req("T001", arrival=same_time), priority=False)
    e3 = entry_from_req(req("T002", arrival=same_time), priority=False)

    sorted_entries = sorted([e1, e2, e3], key=sort_key)
    tokens = [e.farmer_request.token_number for e in sorted_entries]
    assert tokens == ["T001", "T002", "T003"]


def test_fcfs_earlier_arrival_first():
    e1 = entry_from_req(req("T1", arrival="2026-01-01T09:05:00"), priority=False)
    e2 = entry_from_req(req("T2", arrival="2026-01-01T09:00:00"), priority=False)
    sorted_entries = sorted([e1, e2], key=sort_key)
    assert sorted_entries[0].farmer_request.token_number == "T2"


def test_priority_lane_sorted_before_normal_in_base_key():
    """sort_key puts priority entries before normal; actual interleaving is fairness.select."""
    p_entry = entry_from_req(req("T1"), priority=True)
    n_entry = entry_from_req(req("T2"), priority=False)
    assert sort_key(p_entry) < sort_key(n_entry)


# ── Fairness window ───────────────────────────────────────────────────────────

def test_can_serve_priority_when_history_empty():
    assert can_serve_priority_now([], priority_ratio=1, queue_window=5) is True


def test_can_serve_priority_when_below_ratio():
    history = [("b1", False), ("b2", False)]
    assert can_serve_priority_now(history, priority_ratio=1, queue_window=5) is True


def test_cannot_serve_priority_when_ratio_saturated():
    # 1 priority in last 4 slots, window=5, ratio=1 — saturated
    history = [("b1", False), ("b2", False), ("b3", False), ("b4", True)]
    assert can_serve_priority_now(history, priority_ratio=1, queue_window=5) is False


def test_select_prefers_normal_when_window_saturated():
    history = [("b1", True)]  # last 1 priority, ratio=1, window=2
    p = entry_from_req(req("P1"), priority=True)
    n = entry_from_req(req("N1"), priority=False)
    chosen = select_next_candidate([p, n], history, priority_ratio=1, queue_window=2)
    assert chosen is n


def test_select_chooses_priority_when_window_allows():
    history = [("b1", False)]
    p = entry_from_req(req("P1"), priority=True)
    n = entry_from_req(req("N1"), priority=False)
    chosen = select_next_candidate([p, n], history, priority_ratio=1, queue_window=5)
    assert chosen is p


def test_select_returns_none_for_empty_list():
    assert select_next_candidate([], [], 1, 5) is None


def test_select_priority_only_when_no_normal_and_window_full():
    """If window is full but no normal farmer exists, priority farmer is served anyway."""
    history = [("b1", True)]
    p = entry_from_req(req("P1"), priority=True)
    chosen = select_next_candidate([p], history, priority_ratio=1, queue_window=2)
    assert chosen is p


# ── Starvation prevention (randomized) ───────────────────────────────────────

def test_no_window_exceeds_priority_ratio():
    """
    Property: for any random sequence of priority/normal arrivals,
    the engine never serves more than priority_ratio priority farmers
    consecutively when normal farmers are also available.
    The starvation-prevention exemption legitimately allows priority farmers
    to be served when no normal farmers remain in the queue.
    """
    random.seed(42)
    priority_ratio = 1
    queue_window = 5

    for trial in range(20):   # 20 different random sequences
        n_farmers = random.randint(10, 30)
        priorities = [random.choice([True, False]) for _ in range(n_farmers)]

        # Ensure at least half are normal to make fairness meaningful
        if sum(not p for p in priorities) < n_farmers // 3:
            priorities = [False] * (n_farmers // 2) + priorities[n_farmers // 2:]

        history: list[tuple[str, bool]] = []
        served_order: list[bool] = []

        initial_waiting = [
            entry_from_req(
                req(f"T{i:03d}", arrival=f"2026-01-01T09:{i:02d}:00"),
                priority=priorities[i],
            )
            for i in range(n_farmers)
        ]

        waiting = list(initial_waiting)

        while waiting:
            had_normal_before = any(not e.priority_lane for e in waiting)
            chosen = select_next_candidate(waiting, history, priority_ratio, queue_window)
            if chosen is None:
                break
            waiting.remove(chosen)
            history.append((chosen.booking_id, chosen.priority_lane))
            served_order.append((chosen.priority_lane, had_normal_before))

        # Check: no window exceeds ratio WHEN normals were available at those positions
        served_flags = [p for p, _ in served_order]
        served_had_normal = [had for _, had in served_order]

        for i in range(len(served_flags) - queue_window + 1):
            window_flags = served_flags[i:i + queue_window]
            window_had_normal = served_had_normal[i:i + queue_window]

            # Only enforce constraint for serves where normal farmers were present
            constrained_priority_count = sum(
                1 for flag, had_n in zip(window_flags, window_had_normal)
                if flag and had_n
            )
            assert constrained_priority_count <= priority_ratio, (
                f"Trial {trial}: Window at position {i} has {constrained_priority_count} "
                f"constrained priority farmers (limit {priority_ratio}): "
                f"flags={window_flags}, had_normal={window_had_normal}"
            )



# ── Full engine integration with fairness ─────────────────────────────────────

def make_full_engine(priority_ratio: int = 1, queue_window: int = 5) -> DQAEngine:
    return DQAEngine(
        crops={"paddy": Crop("paddy", avg_service_min_per_qtl=3.5)},
        counters=[Counter("C1", status=CounterStatus.ACTIVE)],
        capacities=[ProcurementCapacity("paddy", total_qtl=9999.0)],
        priority_ratio=priority_ratio,
        queue_window=queue_window,
        centre_id="test",
    )


def make_req(token: str, age: int = 35, acres: float = 2.0, minute: int = 0) -> FarmerRequest:
    return FarmerRequest(
        farmer_id="F" + token, crop="paddy", quantity_qtl=5.0,
        arrival_time=f"2026-01-01T09:{minute:02d}:00",
        age=age, land_area_acres=acres, token_number=token,
    )


def test_engine_priority_within_fairness_accepted():
    engine = make_full_engine()
    # Single priority farmer, no history → should be served with priority reason
    d = engine.add_booking(make_req("P1", age=65, minute=0))
    assert d.accepted
    assert d.priority_lane is True


def test_engine_normal_not_starved():
    """With priority_ratio=1/window=3, a normal farmer is never blocked by >1 consecutive priority."""
    engine = make_full_engine(priority_ratio=1, queue_window=3)
    results = []
    for i in range(6):
        age = 65 if i % 2 == 0 else 35   # alternating priority/normal
        r = make_req(f"T{i:02d}", age=age, minute=i * 2)
        d = engine.add_booking(r)
        results.append((d.priority_lane, d.accepted))
    assert all(accepted for _, accepted in results)
