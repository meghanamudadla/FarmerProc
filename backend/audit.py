"""
Centralised audit-event recorder.

Every place in the codebase that needs to log a lifecycle event calls
`record_audit_event` — no ad-hoc inserts elsewhere.

The function only does `db.add()`; it does NOT commit.  The caller's
existing `db.commit()` flushes the entry together with the rest of
its transaction, keeping everything atomic.
"""

from sqlalchemy.orm import Session
from models import AuditLogEntry


def record_audit_event(
    db: Session,
    event_type: str,
    *,
    booking_id: int | None = None,
    center_id: int | None = None,
    actor: str = "system",
    previous_status: str | None = None,
    new_status: str | None = None,
    reason: str | None = None,
) -> AuditLogEntry:
    """Insert a single append-only audit row (without committing)."""
    entry = AuditLogEntry(
        booking_id=booking_id,
        center_id=center_id,
        event_type=event_type,
        actor=actor,
        previous_status=previous_status,
        new_status=new_status,
        reason=reason,
    )
    db.add(entry)
    return entry
