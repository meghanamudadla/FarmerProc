"""
FarmerProc Procurement Workflow State Machine (Phase 6)
Centralizes lifecycle state transitions and prevents invalid transitions.
"""
from typing import Set, Dict
from fastapi import HTTPException


class BookingStatus:
    BOOKED = "BOOKED"
    CANCELLED = "CANCELLED"
    MISSED_WINDOW = "MISSED_WINDOW"
    NO_SHOW = "NO_SHOW"
    ARRIVED = "ARRIVED"
    WAITING = "WAITING"
    ASSIGNED = "ASSIGNED"
    WEIGHING = "WEIGHING"
    QUALITY_CHECK = "QUALITY_CHECK"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    PROCUREMENT_CREATED = "PROCUREMENT_CREATED"
    PAYMENT_INITIATED = "PAYMENT_INITIATED"
    PAYMENT_PROCESSING = "PAYMENT_PROCESSING"
    PAYMENT_COMPLETED = "PAYMENT_COMPLETED"
    PAYMENT_FAILED = "PAYMENT_FAILED"


# Valid transitions: Current State -> Set of allowed Next States
ALLOWED_TRANSITIONS: Dict[str, Set[str]] = {
    BookingStatus.BOOKED: {
        BookingStatus.ARRIVED,
        BookingStatus.WAITING,
        BookingStatus.ASSIGNED,
        BookingStatus.CANCELLED,
        BookingStatus.MISSED_WINDOW,
        BookingStatus.NO_SHOW,
    },
    BookingStatus.MISSED_WINDOW: {
        BookingStatus.BOOKED,  # Rescheduled
        BookingStatus.CANCELLED,
    },
    BookingStatus.NO_SHOW: {
        BookingStatus.BOOKED,  # Rescheduled
        BookingStatus.CANCELLED,
    },
    BookingStatus.ARRIVED: {
        BookingStatus.WAITING,
        BookingStatus.ASSIGNED,
        BookingStatus.WEIGHING,
        BookingStatus.MISSED_WINDOW,
        BookingStatus.NO_SHOW,
    },
    BookingStatus.WAITING: {
        BookingStatus.ASSIGNED,
        BookingStatus.WEIGHING,
        BookingStatus.MISSED_WINDOW,
        BookingStatus.NO_SHOW,
    },
    BookingStatus.ASSIGNED: {
        BookingStatus.WEIGHING,
        BookingStatus.QUALITY_CHECK,
        BookingStatus.MISSED_WINDOW,
        BookingStatus.NO_SHOW,
    },
    BookingStatus.WEIGHING: {
        BookingStatus.QUALITY_CHECK,
        BookingStatus.REJECTED,
    },
    BookingStatus.QUALITY_CHECK: {
        BookingStatus.ACCEPTED,
        BookingStatus.REJECTED,
    },
    BookingStatus.ACCEPTED: {
        BookingStatus.PROCUREMENT_CREATED,
        BookingStatus.PAYMENT_PROCESSING,
        BookingStatus.PAYMENT_INITIATED,
    },
    BookingStatus.REJECTED: {
        BookingStatus.BOOKED,  # Re-apply or reschedule after drying/cleaning produce
    },
    BookingStatus.PROCUREMENT_CREATED: {
        BookingStatus.PAYMENT_INITIATED,
        BookingStatus.PAYMENT_PROCESSING,
    },
    BookingStatus.PAYMENT_INITIATED: {
        BookingStatus.PAYMENT_PROCESSING,
        BookingStatus.PAYMENT_FAILED,
        BookingStatus.PAYMENT_COMPLETED,
    },
    BookingStatus.PAYMENT_PROCESSING: {
        BookingStatus.PAYMENT_COMPLETED,
        BookingStatus.PAYMENT_FAILED,
    },
    BookingStatus.PAYMENT_FAILED: {
        BookingStatus.PAYMENT_PROCESSING,  # Retry
        BookingStatus.PAYMENT_COMPLETED,
    },
    BookingStatus.PAYMENT_COMPLETED: set(),  # Terminal state
    BookingStatus.CANCELLED: set(),          # Terminal state
}


def validate_transition(current_status: str, target_status: str) -> None:
    """
    Validates whether moving from current_status to target_status is allowed.
    Raises HTTPException 400 if the transition violates the state machine.
    """
    curr = (current_status or "").strip().upper()
    tgt = (target_status or "").strip().upper()

    # Identity transition is always idempotent
    if curr == tgt:
        return

    # Normalize aliases
    if curr == "CONFIRMED":
        curr = BookingStatus.BOOKED
    if curr == "PROCESSING":
        curr = BookingStatus.ASSIGNED
    if curr == "COMPLETED":
        curr = BookingStatus.PAYMENT_COMPLETED

    allowed_targets = ALLOWED_TRANSITIONS.get(curr)

    if allowed_targets is None:
        # Unknown current state: allow target if valid known state
        return

    if tgt not in allowed_targets:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid workflow transition: cannot move booking from '{curr}' to '{tgt}'. "
                f"Allowed subsequent states: {sorted(list(allowed_targets)) if allowed_targets else 'None (Terminal)'}."
            )
        )
