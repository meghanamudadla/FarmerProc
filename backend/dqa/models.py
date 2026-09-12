"""
DQA data models — plain dataclasses, no ORM.

Mirrors the shape of the reference engine's FarmerRequest/QueueEntry, trimmed
to what FarmerProc's schema actually tracks (no age field on Farmer, so
priority is small/marginal-farmer only — see priority.py).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class FarmerRequest:
    """The new request being previewed/allocated."""
    farmer_id: int
    crop_name: str
    quantity_qtl: float
    land_area_acres: float
    arrival_time: str  # ISO-8601; lexicographic sort is correct
    token_number: str = "PENDING"

    def __post_init__(self) -> None:
        if self.quantity_qtl <= 0:
            raise ValueError("quantity_qtl must be greater than zero.")
        if self.land_area_acres < 0:
            raise ValueError("land_area_acres cannot be negative.")


@dataclass
class ExistingEntry:
    """A real, already-placed booking counted as existing queue load."""
    booking_id: int
    crop_name: str
    quantity_qtl: float
    land_area_acres: float
    arrival_time: str
    token_number: str


@dataclass
class DynamicEtaResult:
    """Preview result returned to the API layer — flat, JSON-ready."""
    queue_position: int
    estimated_wait_minutes: float
    estimated_service_minutes: float
    estimated_total_minutes: float
    eta_timestamp: Optional[str]
    priority_lane: bool
    counters_considered: int
    ahead_in_queue: int
    allocation_reason: str
