"""
DQA Fairness — Bounded-Interleaving Priority Queue
====================================================
Implements a sliding-window fairness constraint on the order in which
priority-lane and normal-lane farmers are actually served.

ALGORITHM
---------
This is a constrained-interleaving scheduling problem, closely related to the
"Task Scheduler with Cooldown" class (LeetCode 621), but applied to history
rather than future slots.

The constraint is: in any consecutive window of `queue_window` *allocation
events* (not queue positions — actual serves), at most `priority_ratio` may be
priority-lane farmers. This prevents both:
- Starvation of normal farmers by a flood of priority arrivals.
- Indefinite deferral of priority farmers when priority_ratio would allow serving.

The sliding window operates over `allocation_history`, a list of
(booking_id, is_priority: bool) tuples appended each time a counter serves a
farmer. The list is bounded to `2 * queue_window` entries; older history beyond
that cannot affect the current window and is trimmed.

COMPLEXITY
----------
- `select_next_candidate`: O(1) amortized per allocation call, O(queue_window)
  worst case for the window scan.
- `can_serve_priority_now`: O(queue_window) per call.

STARVATION GUARANTEE
--------------------
By the pigeonhole principle, within any window of size `queue_window`, at most
`priority_ratio` priority farmers are served. Therefore a normal farmer is
never skipped by more than `priority_ratio` priority farmers in a row before
the window constraint forces a normal-lane pick. This bounds the maximum wait
inflation for any normal farmer to `priority_ratio * max_service_time` within
a window — a finite, deterministic upper bound.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .models import QueueEntry


def can_serve_priority_now(
    allocation_history: list[tuple[str, bool]],
    priority_ratio: int,
    queue_window: int,
) -> bool:
    """
    Return True if serving a priority farmer right now would NOT violate the
    fairness window constraint.

    Args:
        allocation_history: Ordered list of (booking_id, is_priority) for
            completed allocations (most recent last).
        priority_ratio: Max priority farmers allowed in any window of size
            `queue_window`.
        queue_window: Size of the sliding window measured in allocation events.

    Pre-condition: allocation_history entries are appended in actual served order.
    Post-condition: purely read-only, returns bool.

    Complexity: O(queue_window).
    """
    # Look at only the last (queue_window - 1) allocations; if we add one more
    # priority entry, we need the resulting window not to exceed priority_ratio.
    recent = allocation_history[-(queue_window - 1):] if len(allocation_history) >= 1 else []
    recent_priority_count = sum(1 for _, is_pri in recent if is_pri)
    return recent_priority_count < priority_ratio


def select_next_candidate(
    waiting: list["QueueEntry"],
    allocation_history: list[tuple[str, bool]],
    priority_ratio: int,
    queue_window: int,
) -> "QueueEntry | None":
    """
    Select the next QueueEntry to be served from the list of waiting candidates,
    respecting FCFS order within each lane and the bounded-interleaving fairness
    constraint.

    Decision logic:
    1. Find the first priority-lane entry in FCFS order.
    2. Find the first normal-lane entry in FCFS order.
    3. If a priority entry exists AND serving it now does NOT violate the fairness
       window → return the priority entry (PRIORITY_WITHIN_FAIRNESS_LIMIT).
    4. If a priority entry exists BUT the window is saturated → return the normal
       entry if any (PRIORITY_DEFERRED_FAIRNESS_LIMIT), and the priority entry
       will be reconsidered next time.
    5. If only a normal entry exists → return it (FCFS_ELIGIBLE).
    6. If only a priority entry exists but window is saturated AND no normal entry
       exists → return the priority entry anyway (window full but no alternative;
       the fairness guarantee only protects normal farmers from indefinite wait);
       caller annotates as PRIORITY_WITHIN_FAIRNESS_LIMIT with a note.
    7. If waiting is empty → return None.

    Args:
        waiting: List of WAITING or ASSIGNED entries eligible for this counter,
            already filtered by crop compatibility, sorted in FCFS order
            (priority_lane desc, arrival_time asc, token_number asc).
        allocation_history: Allocation event history (see module docstring).
        priority_ratio: Max priority farmers per window.
        queue_window: Window size in allocation events.

    Pre-condition: `waiting` is sorted in base deterministic order.
    Post-condition: returns a reference into `waiting` (not a copy), or None.

    Complexity: O(queue_window) for the fairness check; O(n) for the scan of
        `waiting` (n = number of waiting entries), O(1) amortized per allocation.
    """
    if not waiting:
        return None

    # Partition into lanes
    priority_candidates = [e for e in waiting if e.priority_lane]
    normal_candidates = [e for e in waiting if not e.priority_lane]

    best_priority = priority_candidates[0] if priority_candidates else None
    best_normal = normal_candidates[0] if normal_candidates else None

    if best_priority is None:
        # No priority; pure FCFS among normal farmers.
        return best_normal

    can_priority = can_serve_priority_now(allocation_history, priority_ratio, queue_window)

    if can_priority:
        # Priority allowed by fairness window.
        return best_priority
    else:
        # Priority window saturated — defer priority, serve next normal farmer.
        if best_normal is not None:
            return best_normal
        # No normal farmers waiting; serve priority anyway (starvation prevention
        # favours priority farmers when no normal farmers exist, even if window full).
        return best_priority


def sort_key(entry: "QueueEntry") -> tuple:
    """
    Deterministic sort key for queue ordering.

    Order: priority_lane (desc) → arrival_time (asc) → token_number (asc).
    The priority_lane dimension is for grouping/readability; actual interleaving
    is handled by select_next_candidate, not sort order alone.
    """
    return (
        0 if entry.priority_lane else 1,   # 0 = priority first
        entry.farmer_request.arrival_time,
        entry.farmer_request.token_number,
    )


def trim_history(
    allocation_history: list[tuple[str, bool]],
    queue_window: int,
) -> list[tuple[str, bool]]:
    """
    Trim allocation_history to the last 2 * queue_window entries.

    Pre-condition: allocation_history is ordered (oldest first).
    Post-condition: returns a new list; does not mutate the original.
    """
    max_len = 2 * queue_window
    if len(allocation_history) > max_len:
        return allocation_history[-max_len:]
    return allocation_history
