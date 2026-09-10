"""
Dynamic Queue Allocation (DQA) Engine
======================================
Standalone, backend-agnostic decision engine for real-time queue management
at agricultural procurement centres.

Public interface is exposed through DQAEngine in engine.py.
"""

from .engine import DQAEngine
from .models import (
    Crop,
    ProcurementCapacity,
    Counter,
    CounterStatus,
    FarmerRequest,
    QueueEntry,
    QueueStatus,
    AllocationDecision,
    AllocationReason,
    QueueState,
    CongestionSignal,
)
from .exceptions import (
    CapacityExceededError,
    UnknownBookingError,
    UnknownCounterError,
    InvalidStateTransitionError,
    InvalidTransferRequestError,
    TransferTargetRejectedError,
    DQAError,
)
from .congestion import detect_congestion

__all__ = [
    "DQAEngine",
    "Crop",
    "ProcurementCapacity",
    "Counter",
    "CounterStatus",
    "FarmerRequest",
    "QueueEntry",
    "QueueStatus",
    "AllocationDecision",
    "AllocationReason",
    "QueueState",
    "CongestionSignal",
    "detect_congestion",
    "CapacityExceededError",
    "UnknownBookingError",
    "UnknownCounterError",
    "InvalidStateTransitionError",
    "InvalidTransferRequestError",
    "TransferTargetRejectedError",
    "DQAError",
]
