"""
Tests: Congestion-Triggered Centre Transfer (Consent-Based)
============================================================
Covers:
- Congestion threshold boundary (90.0 vs 90.1 min).
- Independent congestion triggers (wait time, procurement shortfall, processing window exhaustion).
- Fallthrough to normal allocation when no alternate centre is better.
- accept_centre_transfer happy path & atomic rollback on target rejection.
- decline_centre_transfer zero state drift.
- Exception handling for invalid transfer API calls.
"""

from __future__ import annotations

import pytest

from dqa.models import (
    Crop,
    Counter,
    CounterStatus,
    FarmerRequest,
    ProcurementCapacity,
    QueueStatus,
    AllocationReason,
    CongestionSignal,
)
from dqa.engine import DQAEngine
from dqa.congestion import detect_congestion
from dqa.exceptions import (
    InvalidTransferRequestError,
    TransferTargetRejectedError,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_centre(
    centre_id: str,
    total_qtl: float = 1000.0,
    counter_count: int = 1,
    avg_service: float = 5.0,
) -> DQAEngine:
    counters = [
        Counter(f"{centre_id}_C{i+1}", status=CounterStatus.ACTIVE)
        for i in range(counter_count)
    ]
    return DQAEngine(
        crops={"paddy": Crop("paddy", avg_service_min_per_qtl=avg_service)},
        counters=counters,
        capacities=[ProcurementCapacity("paddy", total_qtl=total_qtl)],
        centre_id=centre_id,
    )


def make_req(token: str, qty: float = 10.0, minute: int = 0) -> FarmerRequest:
    return FarmerRequest(
        farmer_id=f"F{token}",
        crop="paddy",
        quantity_qtl=qty,
        arrival_time=f"2026-01-01T09:{minute:02d}:00",
        age=35,
        land_area_acres=2.0,
        token_number=token,
    )


# ── Congestion Detection Unit Tests ──────────────────────────────────────────

def test_congestion_threshold_boundary():
    c1 = make_centre("C1")
    req = make_req("T1")

    # 90.0 min estimated wait: NOT congested
    sig_exact = detect_congestion(c1.state, req, congestion_wait_threshold_minutes=90.0, estimated_wait_minutes=90.0)
    assert sig_exact is None

    # 90.1 min estimated wait: CONGESTED
    sig_over = detect_congestion(c1.state, req, congestion_wait_threshold_minutes=90.0, estimated_wait_minutes=90.1)
    assert sig_over is not None
    assert sig_over.reason == "WAIT_THRESHOLD_EXCEEDED"
    assert pytest.approx(sig_over.wait_exceeded_by, 0.01) == 0.1


def test_congestion_triggers_procurement_shortfall():
    c1 = make_centre("C1", total_qtl=15.0)
    req = make_req("T1", qty=20.0)  # Exceeds total capacity of 15.0

    sig = detect_congestion(c1.state, req)
    assert sig is not None
    assert sig.reason == "PROCUREMENT_SHORTFALL"
    assert sig.procurement_shortfall_qtl == 5.0


def test_congestion_triggers_processing_exhaustion():
    c1 = make_centre("C1", avg_service=10.0)
    # Set operating minutes remaining to only 5 minutes (requires 100 min for 10 qtl)
    c1.state.counters["C1_C1"].operating_minutes_remaining = 5.0

    req = make_req("T1", qty=10.0)
    sig = detect_congestion(c1.state, req)
    assert sig is not None
    assert sig.reason == "PROCESSING_EXHAUSTED"
    assert sig.processing_feasible is False


# ── Allocation Wiring & Alternate Ranking Tests ────────────────────────────────

def test_empty_alternates_fallthrough():
    c1 = make_centre("C1")
    # C1 has 2 bookings (est wait = 10 min)
    for i in range(2):
        c1.add_booking(make_req(f"A{i}", qty=10.0, minute=i))

    # C2 has 50 bookings (est wait = 250 min, much worse than C1)
    c2 = make_centre("C2")
    for i in range(50):
        c2.add_booking(make_req(f"B{i}", qty=10.0, minute=i))

    req = make_req("T99", qty=10.0, minute=25)

    # When C2 is worse than C1, C1 skips suggestion and allocates normally
    decision = c1.add_booking(req, other_centres=[c2], congestion_wait_threshold_minutes=5.0)
    assert decision.status != QueueStatus.CONGESTION_ALTERNATE_SUGGESTED.value
    assert decision.accepted is True
    c1.assert_invariants()




def test_congestion_suggests_better_alternate():
    c1 = make_centre("C1")
    # Congest C1
    for i in range(10):
        c1.add_booking(make_req(f"A{i}", qty=10.0, minute=i))

    # C2 is empty and clean
    c2 = make_centre("C2")

    new_req = make_req("T_NEW", qty=10.0, minute=15)
    decision = c1.add_booking(new_req, other_centres=[c2], congestion_wait_threshold_minutes=15.0)

    assert decision.accepted is False
    assert decision.status == QueueStatus.CONGESTION_ALTERNATE_SUGGESTED.value
    assert decision.allocation_reason == AllocationReason.CONGESTION_ALTERNATE_SUGGESTED
    assert len(decision.alternate_centres) >= 1
    assert decision.alternate_centres[0]["centre_id"] == "C2"
    c1.assert_invariants()


# ── Accept / Decline Transfer Tests ──────────────────────────────────────────

def test_accept_centre_transfer_happy_path():
    c1 = make_centre("C1")
    for i in range(10):
        c1.add_booking(make_req(f"A{i}", qty=10.0, minute=i))

    c2 = make_centre("C2")

    new_req = make_req("T_TRANSFER", qty=10.0, minute=15)
    d_proposal = c1.add_booking(new_req, other_centres=[c2], congestion_wait_threshold_minutes=15.0)
    bid = d_proposal.booking_id

    # Farmer accepts transfer to C2
    target_decision = c1.accept_centre_transfer(bid, c2)

    # C1 entry should be CANCELLED with TRANSFERRED_OUT
    entry_c1 = c1.state.entries[bid]
    assert entry_c1.status == QueueStatus.CANCELLED
    assert entry_c1.allocation_reason == AllocationReason.TRANSFERRED_OUT

    # C2 should now have the accepted booking
    assert target_decision.accepted is True
    assert target_decision.assigned_counter_id == "C2_C1"

    c1.assert_invariants()
    c2.assert_invariants()


def test_accept_centre_transfer_atomic_rollback_on_target_failure():
    c1 = make_centre("C1")
    for i in range(10):
        c1.add_booking(make_req(f"A{i}", qty=10.0, minute=i))

    c2_valid = make_centre("C2_VALID")
    c3_full = make_centre("C3_FULL", total_qtl=0.0)

    new_req = make_req("T_FAIL", qty=10.0, minute=15)
    d_proposal = c1.add_booking(new_req, other_centres=[c2_valid], congestion_wait_threshold_minutes=15.0)
    bid = d_proposal.booking_id

    # Accepting transfer to full C3 raises TransferTargetRejectedError and rolls back C1 atomically
    with pytest.raises(TransferTargetRejectedError):
        c1.accept_centre_transfer(bid, c3_full)

    # Local state restored
    entry_c1 = c1.state.entries[bid]
    assert entry_c1.status == QueueStatus.CONGESTION_ALTERNATE_SUGGESTED
    c1.assert_invariants()



def test_decline_centre_transfer_zero_state_drift():
    c1 = make_centre("C1")
    for i in range(10):
        c1.add_booking(make_req(f"A{i}", qty=10.0, minute=i))

    c2 = make_centre("C2")

    new_req = make_req("T_DECLINE", qty=10.0, minute=15)
    d_proposal = c1.add_booking(new_req, other_centres=[c2], congestion_wait_threshold_minutes=15.0)
    bid = d_proposal.booking_id

    entry_before = c1.state.entries[bid]
    pos_before = entry_before.queue_position
    eta_before = entry_before.estimated_wait_minutes
    lane_before = entry_before.priority_lane

    # Farmer declines transfer
    d_decline = c1.decline_centre_transfer(bid)

    assert d_decline.accepted is True
    assert d_decline.allocation_reason == AllocationReason.TRANSFER_DECLINED_RETAINED
    assert d_decline.status == AllocationReason.TRANSFER_DECLINED_RETAINED

    entry_after = c1.state.entries[bid]
    assert entry_after.queue_position == pos_before
    assert entry_after.estimated_wait_minutes == eta_before
    assert entry_after.priority_lane == lane_before
    assert entry_after.status == QueueStatus.WAITING

    c1.assert_invariants()


def test_invalid_transfer_calls_raise_exception():
    c1 = make_centre("C1")
    c2 = make_centre("C2")

    d = c1.add_booking(make_req("T1"))
    bid = d.booking_id  # Normal ASSIGNED booking

    with pytest.raises(InvalidTransferRequestError):
        c1.accept_centre_transfer(bid, c2)

    with pytest.raises(InvalidTransferRequestError):
        c1.decline_centre_transfer(bid)
