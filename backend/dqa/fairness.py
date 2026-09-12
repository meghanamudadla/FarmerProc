"""
DQA Fairness — Bounded-Interleaving Priority Queue
====================================================
Ported from the reference engine's fairness.py. The reference operates on a
persisted `allocation_history` of already-served entries to decide who is
served next. FarmerProc's preview endpoint is stateless (no long-lived queue
process), so `simulate_serving_order` below repeatedly applies the same
per-event decision rule to reconstruct a full fair serving order from
scratch on every call — same algorithm, one-shot instead of incremental.

At most `priority_ratio` priority-lane entries may be served within any
`queue_window` consecutive serves, bounding how long a normal-lane farmer can
be skipped by priority arrivals.
"""

from __future__ import annotations

from typing import Any

DEFAULT_PRIORITY_RATIO = 1
DEFAULT_QUEUE_WINDOW = 5


def sort_key(entry: dict) -> tuple:
    """Order: priority_lane (desc) -> arrival_time (asc) -> token_number (asc)."""
    return (
        0 if entry["priority_lane"] else 1,
        entry["arrival_time"],
        entry["token_number"],
    )


def can_serve_priority_now(
    allocation_history: list[bool],
    priority_ratio: int,
    queue_window: int,
) -> bool:
    """True if serving a priority entry now would not violate the fairness window."""
    recent = allocation_history[-(queue_window - 1):] if allocation_history else []
    recent_priority_count = sum(1 for is_pri in recent if is_pri)
    return recent_priority_count < priority_ratio


def select_next_candidate(
    waiting: list[dict],
    allocation_history: list[bool],
    priority_ratio: int,
    queue_window: int,
) -> dict | None:
    """Pick the next entry to serve, respecting FCFS-per-lane + fairness window."""
    if not waiting:
        return None

    priority_candidates = [e for e in waiting if e["priority_lane"]]
    normal_candidates = [e for e in waiting if not e["priority_lane"]]

    best_priority = priority_candidates[0] if priority_candidates else None
    best_normal = normal_candidates[0] if normal_candidates else None

    if best_priority is None:
        return best_normal

    if can_serve_priority_now(allocation_history, priority_ratio, queue_window):
        return best_priority

    return best_normal if best_normal is not None else best_priority


def simulate_serving_order(
    entries: list[dict],
    priority_ratio: int = DEFAULT_PRIORITY_RATIO,
    queue_window: int = DEFAULT_QUEUE_WINDOW,
) -> list[dict]:
    """
    Reconstruct the full fair serving order for a one-shot list of entries.

    Each entry needs: priority_lane (bool), arrival_time (str), token_number (str),
    plus any extra keys the caller wants preserved (e.g. booking_id, is_new).

    Repeatedly applies select_next_candidate — same rule as the reference
    engine's per-allocation-event decision — to a shrinking pool sorted by
    sort_key each round.
    """
    pool = sorted(entries, key=sort_key)
    history: list[bool] = []
    ordered: list[dict] = []

    while pool:
        chosen = select_next_candidate(pool, history, priority_ratio, queue_window)
        if chosen is None:
            break
        ordered.append(chosen)
        history.append(bool(chosen["priority_lane"]))
        pool = [e for e in pool if e is not chosen]

    return ordered
