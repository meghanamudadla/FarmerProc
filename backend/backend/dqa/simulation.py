"""
DQA Simulation — Standalone Demo Script
=========================================
Run with: python -m dqa.simulation

Models a real procurement centre scenario with 3 counters, 2 crop types,
and 12+ farmers, walking through all 10 event types specified in Section 14
of the Build Spec. After every step, assert_invariants() is run to verify
safety properties.

Read top-to-bottom as a complete demonstration of the engine's intelligence:
priority fairness, ETA recalculation, rolling averages, no-show retry flow,
counter disable/re-enable, cross-centre recommendation, and hard capacity rejection.
"""

from __future__ import annotations

import textwrap
from datetime import datetime

from .engine import DQAEngine
from .models import (
    Crop,
    Counter,
    CounterStatus,
    FarmerRequest,
    ProcurementCapacity,
    QueueStatus,
)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

SEP = "─" * 72
STEP_COUNTER = [0]


def step(title: str) -> None:
    STEP_COUNTER[0] += 1
    print(f"\n{SEP}")
    print(f"  STEP {STEP_COUNTER[0]:02d}: {title}")
    print(SEP)


def show_queue(engine: DQAEngine, label: str = "") -> None:
    entries = engine.state.entries
    if label:
        print(f"\n  [{label}] Queue snapshot ({len(entries)} total entries):")
    waiting = [e for e in entries.values() if e.status == QueueStatus.WAITING]
    assigned = [e for e in entries.values() if e.status == QueueStatus.ASSIGNED]
    processing = [e for e in entries.values() if e.status == QueueStatus.PROCESSING]
    done = [
        e for e in entries.values()
        if e.status in (QueueStatus.COMPLETED, QueueStatus.CANCELLED, QueueStatus.NO_SHOW)
    ]
    for group, grp_label in [(processing, "PROCESSING"), (assigned, "ASSIGNED"), (waiting, "WAITING"), (done, "DONE")]:
        for e in group:
            farmer = e.farmer_request
            wait = f"{e.estimated_wait_minutes:.1f}min" if e.estimated_wait_minutes is not None else "N/A"
            print(
                f"    [{grp_label:10s}] token={farmer.token_number:8s} "
                f"crop={farmer.crop:8s} qty={farmer.quantity_qtl:5.1f}qtl "
                f"priority={'Y' if e.priority_lane else 'N'} "
                f"counter={e.assigned_counter_id or '--':12s} "
                f"wait={wait:8s} reason={e.allocation_reason or 'N/A'}"
            )


def show_capacities(engine: DQAEngine) -> None:
    print("\n  Procurement capacity:")
    for crop, cap in engine.state.capacities.items():
        print(f"    {crop:10s}: total={cap.total_qtl} reserved={cap.reserved_qtl:.1f} "
              f"procured={cap.procured_qtl:.1f} available={cap.available_qtl:.1f}")


def show_counters(engine: DQAEngine) -> None:
    print("\n  Counters:")
    for cid, c in engine.state.counters.items():
        print(f"    {cid:14s}: status={c.status.name:8s} specialty={c.specialty or 'general':8s} "
              f"current={c.current_booking_id or '--'}")


def show_rates(engine: DQAEngine) -> None:
    print("\n  Rolling service-time rates (min/qtl):")
    for crop, c_obj in engine.state.crops.items():
        print(f"    {crop:10s}: global avg = {c_obj.avg_service_min_per_qtl:.3f}")
    for cid, rates in engine.state.per_counter_rolling_rates.items():
        for crop, rate in rates.items():
            print(f"    counter={cid}, crop={crop}: {rate:.3f}")


def verify(engine: DQAEngine, label: str = "") -> None:
    engine.assert_invariants()
    tag = f"({label})" if label else ""
    print(f"  ✓ assert_invariants passed {tag}")


# ─────────────────────────────────────────────────────────────────────────────
# Farmer factory
# ─────────────────────────────────────────────────────────────────────────────

def farmer(
    fid: str, crop: str, qty: float, token: str,
    hour: int = 9, minute: int = 0, age: int = 35, acres: float = 2.0
) -> FarmerRequest:
    arrival = f"2026-09-10T{hour:02d}:{minute:02d}:00"
    return FarmerRequest(
        farmer_id=fid, crop=crop, quantity_qtl=qty,
        arrival_time=arrival, age=age, land_area_acres=acres,
        token_number=token,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Simulation
# ─────────────────────────────────────────────────────────────────────────────

def run() -> None:
    print("\n" + "═" * 72)
    print("  FarmerProc — DQA Engine Simulation")
    print("  Dynamic Queue Allocation: rule-based, auditable, deterministic")
    print("═" * 72)

    # ── Centre setup ─────────────────────────────────────────────────────────
    crops = {
        "paddy":  Crop("paddy",  avg_service_min_per_qtl=3.5),
        "cotton": Crop("cotton", avg_service_min_per_qtl=6.0),
        "maize":  Crop("maize",  avg_service_min_per_qtl=4.0),
    }
    counters = [
        Counter("counter-A", specialty=None,     status=CounterStatus.ACTIVE, accepts_general_when_idle=True),
        Counter("counter-B", specialty="cotton",  status=CounterStatus.ACTIVE, accepts_general_when_idle=True),
        Counter("counter-C", specialty=None,     status=CounterStatus.ACTIVE, accepts_general_when_idle=True),
    ]
    capacities = [
        ProcurementCapacity("paddy",  total_qtl=1000.0),
        ProcurementCapacity("cotton", total_qtl=500.0),
        ProcurementCapacity("maize",  total_qtl=300.0),
    ]

    engine1 = DQAEngine(
        crops=crops, counters=counters, capacities=capacities,
        centre_id="centre-1", priority_ratio=1, queue_window=5,
    )

    # Second centre for cross-centre recommendation
    engine2 = DQAEngine(
        crops={
            "paddy":  Crop("paddy",  avg_service_min_per_qtl=3.5),
            "cotton": Crop("cotton", avg_service_min_per_qtl=6.0),
        },
        counters=[
            Counter("c2-A", specialty=None, status=CounterStatus.ACTIVE),
            Counter("c2-B", specialty=None, status=CounterStatus.ACTIVE),
        ],
        capacities=[
            ProcurementCapacity("paddy",  total_qtl=2000.0),
            ProcurementCapacity("cotton", total_qtl=800.0),
        ],
        centre_id="centre-2",
    )

    booking_ids: dict[str, str] = {}  # label → booking_id

    # ── STEP 1 ────────────────────────────────────────────────────────────────
    step("Initial arrivals and first allocations")

    # Normal farmers (paddy) — arrive together
    farmers_batch1 = [
        farmer("F001", "paddy", 20.0,  "PDC-001", hour=8, minute=0),
        farmer("F002", "paddy", 15.0,  "PDC-002", hour=8, minute=1),
        farmer("F003", "paddy", 30.0,  "PDC-003", hour=8, minute=2),
        # Priority farmer: age 65
        farmer("F004", "paddy", 10.0,  "PDC-004", hour=8, minute=3, age=65),
        # Cotton specialty → counter-B
        farmer("F005", "cotton", 8.0,  "PDC-005", hour=8, minute=0),
        farmer("F006", "cotton", 12.0, "PDC-006", hour=8, minute=5),
        # Small farmer (<1 acre) → priority
        farmer("F007", "paddy", 5.0,   "PDC-007", hour=8, minute=10, acres=0.5),
    ]

    for f in farmers_batch1:
        decision = engine1.add_booking(f)
        tag = f"{'[PRIORITY]' if decision.priority_lane else '          '}"
        print(f"  {tag} token={f.token_number} crop={f.crop:8s} "
              f"accepted={decision.accepted} counter={decision.assigned_counter_id or 'queued':14s} "
              f"reason={decision.allocation_reason}")
        if decision.accepted and decision.booking_id:
            booking_ids[f.token_number] = decision.booking_id

    show_queue(engine1, "After batch 1")
    show_capacities(engine1)
    show_counters(engine1)
    verify(engine1, "step 1")

    # ── STEP 2 ────────────────────────────────────────────────────────────────
    step("Counter-A completes early → rolling average shifts DOWN")

    # Counter-A is processing PDC-001 (paddy, 20qtl, est = 20*3.5 = 70min)
    # Actual = 50min (faster centre on a light day)
    assigned_bids = {
        e.farmer_request.token_number: e.booking_id
        for e in engine1.state.entries.values()
        if e.assigned_counter_id == "counter-A"
    }
    if assigned_bids:
        token, bid = next(iter(assigned_bids.items()))
        old_rate = engine1.state.crops["paddy"].avg_service_min_per_qtl
        decisions = engine1.complete_booking(bid, actual_service_minutes=50.0)
        new_rate = engine1.state.crops["paddy"].avg_service_min_per_qtl
        print(f"  Completed booking {bid[:8]}... (token {token}), actual=50min")
        print(f"  Paddy global rate: {old_rate:.3f} → {new_rate:.3f} min/qtl (↓ shift down)")
        for d in decisions:
            print(f"  → Next allocation: counter={d.assigned_counter_id} token lookup reason={d.allocation_reason}")
        show_rates(engine1)
        if decisions:
            booking_ids[f"__step2_next__{decisions[0].booking_id[:6]}"] = decisions[0].booking_id
    verify(engine1, "step 2")

    # ── STEP 3 ────────────────────────────────────────────────────────────────
    step("Counter-C runs long → rolling average shifts UP")

    assigned_c = {
        e.farmer_request.token_number: e.booking_id
        for e in engine1.state.entries.values()
        if e.assigned_counter_id == "counter-C"
        and e.status == QueueStatus.ASSIGNED
    }
    if assigned_c:
        token, bid = next(iter(assigned_c.items()))
        old_rate = engine1.state.crops["paddy"].avg_service_min_per_qtl
        decisions = engine1.complete_booking(bid, actual_service_minutes=120.0)
        new_rate = engine1.state.crops["paddy"].avg_service_min_per_qtl
        print(f"  Completed booking {bid[:8]}... (token {token}), actual=120min (ran long)")
        print(f"  Paddy global rate: {old_rate:.3f} → {new_rate:.3f} min/qtl (↑ shift up)")
        show_rates(engine1)
    verify(engine1, "step 3")

    # ── STEP 4 ────────────────────────────────────────────────────────────────
    step("No-show → retry policy applied")

    # Find a WAITING or ASSIGNED farmer
    waiting_bids = [
        (e.farmer_request.token_number, e.booking_id)
        for e in engine1.state.entries.values()
        if e.status in (QueueStatus.WAITING, QueueStatus.ASSIGNED)
    ]
    if waiting_bids:
        token, bid = waiting_bids[0]
        result = engine1.mark_no_show(bid)
        print(f"  No-show on token {token}: event={result['event']} new_status={result['new_status']}")
        print(f"  Farmer is now re-queued (RETRY_PENDING → WAITING) — they keep their reservation.")
        booking_ids["noshow_bid"] = bid
    verify(engine1, "step 4")

    # ── STEP 5 ────────────────────────────────────────────────────────────────
    step("Cancellation → positions and ETAs recompute for remaining entries")

    waiting_bids = [
        (e.farmer_request.token_number, e.booking_id)
        for e in engine1.state.entries.values()
        if e.status == QueueStatus.WAITING and e.booking_id != booking_ids.get("noshow_bid")
    ]
    if waiting_bids:
        token, bid = waiting_bids[-1]   # cancel the last waiting entry
        print(f"  Cancelling token {token} (booking {bid[:8]}...)")
        engine1.cancel_booking(bid)
        print("  → Procurement reservation released; ETAs recalculated.")
    show_queue(engine1, "After cancellation")
    show_capacities(engine1)
    verify(engine1, "step 5")

    # ── STEP 6 ────────────────────────────────────────────────────────────────
    step("New farmer arrives mid-simulation")

    late_farmer = farmer("F008", "maize", 18.0, "PDC-008", hour=10, minute=0)
    d = engine1.add_booking(late_farmer)
    print(f"  Late farmer token={late_farmer.token_number} crop=maize "
          f"accepted={d.accepted} counter={d.assigned_counter_id or 'queued'} "
          f"wait={d.estimated_wait_minutes}")
    if d.booking_id:
        booking_ids["PDC-008"] = d.booking_id
    verify(engine1, "step 6")

    # ── STEP 7 ────────────────────────────────────────────────────────────────
    step("Procurement capacity drops near zero (cotton)")

    # Simulate near-exhaustion by direct capacity manipulation (backend team would
    # call mark_procured() repeatedly; here we simulate the end-state)
    engine1.state.capacities["cotton"].procured_qtl = 490.0  # only 10 qtl left
    show_capacities(engine1)
    print("  Cotton capacity nearly exhausted: only 10 qtl remaining.")
    verify(engine1, "step 7")

    # ── STEP 8 ────────────────────────────────────────────────────────────────
    step("Request that exceeds remaining capacity → clean rejection with remaining_capacity")

    big_cotton = farmer("F009", "cotton", 50.0, "PDC-009", hour=10, minute=30)
    d = engine1.add_booking(big_cotton)
    print(f"  token=PDC-009 crop=cotton qty=50qtl (only 10 available)")
    print(f"  accepted={d.accepted}  reason={d.allocation_reason}")
    print(f"  remaining_capacity={d.procurement_capacity_remaining}qtl")
    assert not d.accepted, "Should have been rejected"
    assert d.allocation_reason == "REJECTED_PROCUREMENT_CAPACITY_EXCEEDED"
    print("  ✓ Rejection is clean and correct.")
    verify(engine1, "step 8")

    # ── STEP 9 ────────────────────────────────────────────────────────────────
    step("Cross-centre recommendation (centre-2 is better for paddy)")

    prospect = farmer("F010", "paddy", 25.0, "PDC-010", hour=10, minute=45)
    recommendations = engine1.recommend_centre(prospect, [engine2])
    print(f"  Cross-centre ranking for paddy 25qtl:")
    for rank, rec in enumerate(recommendations, 1):
        print(
            f"    #{rank} centre={rec['centre_id']:12s} "
            f"eta={rec['projected_eta_minutes']:>6.1f}min "
            f"capacity={rec['remaining_capacity']:.0f}qtl "
            f"queue={rec['queue_length']:3d} feasible={rec['processing_feasible']}"
        )
    if recommendations:
        best = recommendations[0]
        print(f"\n  Recommended: {best['centre_id']} (lowest projected ETA)")
    verify(engine1, "step 9")

    # ── STEP 10 ────────────────────────────────────────────────────────────────
    step("Counter goes offline mid-processing → farmer requeued at front; counter re-enabled")

    # Find any ASSIGNED entry and move it to PROCESSING for the demo
    assigned = [
        e for e in engine1.state.entries.values()
        if e.status == QueueStatus.ASSIGNED and e.assigned_counter_id
    ]
    if assigned:
        victim_entry = assigned[0]
        victim_entry.status = QueueStatus.PROCESSING   # simulate in-progress
        disabled_counter = victim_entry.assigned_counter_id
        print(f"  Disabling counter {disabled_counter} while processing "
              f"token={victim_entry.farmer_request.token_number}")
        requeue_decisions = engine1.disable_counter(disabled_counter)

        for d in requeue_decisions:
            print(f"  → Booking {d.booking_id[:8]}... requeued: "
                  f"status={d.status} reason={d.allocation_reason}")

        print(f"\n  Re-enabling counter {disabled_counter}...")
        next_decision = engine1.enable_counter(disabled_counter)
        if next_decision:
            print(f"  → Counter back online, immediately assigned: "
                  f"booking={next_decision.booking_id[:8]}... "
                  f"reason={next_decision.allocation_reason}")
        else:
            print("  → Counter online, queue currently empty.")

    verify(engine1, "step 10")

    # ── STEP 11 ────────────────────────────────────────────────────────────────
    step("Congestion-triggered centre transfer proposal (Consent-Based)")

    # Build up a queue on engine1 to trigger congestion wait threshold (threshold = 15.0 min)
    for i in range(5):
        engine1.add_booking(farmer(f"FC{i}", "paddy", 20.0, f"CONG-{i:02d}", hour=11, minute=i))

    print("  Engine 1 is now congested with paddy bookings.")

    # Farmer F011 arrives at congested Engine 1
    f_congested = farmer("F011", "paddy", 25.0, "PDC-CONG-ACC", hour=11, minute=10)
    decision_prop = engine1.add_booking(
        f_congested, other_centres=[engine2], congestion_wait_threshold_minutes=15.0
    )

    print(f"  Farmer PDC-CONG-ACC booking status: {decision_prop.status}")
    print(f"  Reason: {decision_prop.allocation_reason}")
    print(f"  Suggested alternate centres: {decision_prop.alternate_centres}")

    assert decision_prop.status == QueueStatus.CONGESTION_ALTERNATE_SUGGESTED.value
    assert len(decision_prop.alternate_centres) >= 1

    # --- Branch 1: Farmer ACCEPTS transfer ---
    bid_acc = decision_prop.booking_id
    print(f"\n  [BRANCH 1: ACCEPT TRANSFER]")
    print(f"  Farmer accepts transfer to centre '{engine2.centre_id}'...")
    d_target = engine1.accept_centre_transfer(bid_acc, engine2)
    print(f"  → Engine 1 status: {engine1.state.entries[bid_acc].status.value} (reason: {engine1.state.entries[bid_acc].allocation_reason})")
    print(f"  → Engine 2 allocation: accepted={d_target.accepted} counter={d_target.assigned_counter_id or 'queued'}")

    verify(engine1, "step 11 (accept)")
    verify(engine2, "step 11 (accept target)")

    # --- Branch 2: Farmer DECLINES transfer ---
    f_declined = farmer("F012", "paddy", 20.0, "PDC-CONG-DEC", hour=11, minute=15)
    decision_prop2 = engine1.add_booking(
        f_declined, other_centres=[engine2], congestion_wait_threshold_minutes=15.0
    )
    bid_dec = decision_prop2.booking_id
    print(f"\n  [BRANCH 2: DECLINE TRANSFER]")
    print(f"  Farmer declines transfer proposal at centre '{engine1.centre_id}'...")
    d_decline = engine1.decline_centre_transfer(bid_dec)
    print(f"  → Engine 1 status: {engine1.state.entries[bid_dec].status.value} (reason: {d_decline.allocation_reason})")
    print(f"  → Queue position retained: {d_decline.queue_position}")

    verify(engine1, "step 11 (decline)")

    # ── Final state ─────────────────────────────────────────────────────────
    print(f"\n{SEP}")
    print("  FINAL QUEUE STATE")
    print(SEP)
    show_queue(engine1, "Final")
    show_capacities(engine1)
    show_rates(engine1)

    # Explain one booking audit trail
    if booking_ids:
        sample_bid = next(
            (bid for bid in booking_ids.values()
             if engine1.state.entries.get(bid) is not None),
            None,
        )
        if sample_bid:
            print(f"\n{SEP}")
            print("  AUDIT TRAIL (engine.explain)")
            print(SEP)
            print(engine1.explain(sample_bid))

    print(f"\n{'═' * 72}")
    print("  Simulation complete — all 11 steps passed with invariants verified.")
    print("═" * 72 + "\n")


if __name__ == "__main__":
    run()

