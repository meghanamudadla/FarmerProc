"""
DQA Congestion Detection Module
===============================
Pure function to detect whether a centre is congested for a given farmer request.

Design principles:
- Pure function, zero side-effects.
- Single source of truth for congestion criteria.
- Returns CongestionSignal dataclass explaining trigger, or None if not congested.
"""

from __future__ import annotations

from typing import Optional

from .models import CongestionSignal, FarmerRequest, QueueState
from .capacity import (
    check_processing_capacity,
    estimate_service_minutes,
)


def detect_congestion(
    queue_state: QueueState,
    farmer: FarmerRequest,
    congestion_wait_threshold_minutes: float = 90.0,
    estimated_wait_minutes: Optional[float] = None,
) -> Optional[CongestionSignal]:
    """
    Detect whether this centre is congested for the given farmer request.

    Triggers (any of):
    1. estimated_wait_minutes > congestion_wait_threshold_minutes
    2. available_qtl for farmer.crop < quantity_qtl (procurement shortfall)
    3. Compatible counters cannot serve within operating window (processing capacity exhaustion)

    Args:
        queue_state: The current centre QueueState.
        farmer: The incoming FarmerRequest.
        congestion_wait_threshold_minutes: Threshold in minutes (default 90.0).
        estimated_wait_minutes: Precomputed wait minutes if available.

    Returns:
        CongestionSignal if congested, None otherwise.
    """
    # 1. Procurement capacity shortfall check
    cap = queue_state.capacities.get(farmer.crop)
    if cap is not None and cap.available_qtl < farmer.quantity_qtl:
        shortfall = farmer.quantity_qtl - cap.available_qtl
        return CongestionSignal(
            reason="PROCUREMENT_SHORTFALL",
            procurement_shortfall_qtl=shortfall,
        )

    # 2. Processing capacity check (operating window feasibility)
    est_service = estimate_service_minutes(farmer, queue_state)
    eligible = [
        c for c in queue_state.counters.values()
        if c.can_serve_crop(farmer.crop)
    ]
    processing_ok = check_processing_capacity(est_service, eligible)
    if not processing_ok:
        return CongestionSignal(
            reason="PROCESSING_EXHAUSTED",
            processing_feasible=False,
        )

    # 3. Wait time threshold check
    if estimated_wait_minutes is not None and estimated_wait_minutes > congestion_wait_threshold_minutes:
        exceeded_by = estimated_wait_minutes - congestion_wait_threshold_minutes
        return CongestionSignal(
            reason="WAIT_THRESHOLD_EXCEEDED",
            wait_exceeded_by=exceeded_by,
        )

    return None
