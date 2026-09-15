"""
Read-only audit-log endpoint for the government portal.

No create / update / delete routes — creation only ever happens
via `record_audit_event()` internally.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from auth.dependencies import require_role
from database import get_db
from models import AuditLogEntry, User


router = APIRouter(
    prefix="/audit-log",
    tags=["Audit Log"],
)


@router.get("/")
def get_audit_log(
    booking_id: Optional[int] = Query(None),
    center_id: Optional[int] = Query(None),
    event_type: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    current_admin: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db),
):
    """Return audit entries filtered by optional params, newest first."""
    q = db.query(AuditLogEntry)

    if booking_id is not None:
        q = q.filter(AuditLogEntry.booking_id == booking_id)
    if center_id is not None:
        q = q.filter(AuditLogEntry.center_id == center_id)
    if event_type is not None:
        q = q.filter(AuditLogEntry.event_type == event_type)

    entries = (
        q.order_by(AuditLogEntry.created_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": e.id,
            "booking_id": e.booking_id,
            "center_id": e.center_id,
            "event_type": e.event_type,
            "actor": e.actor,
            "previous_status": e.previous_status,
            "new_status": e.new_status,
            "reason": e.reason,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in entries
    ]
