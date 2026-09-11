"""
DQA Priority Eligibility
=========================
Ported from the reference engine's priority.py. The reference default rule is
age >= 60 OR land_area_acres < threshold; FarmerProc's Farmer model has no
age column, so this port uses the small/marginal-farmer rule only.
"""

from __future__ import annotations

DEFAULT_SMALL_FARMER_ACRES_THRESHOLD: float = 1.0


def is_priority(
    land_area_acres: float,
    threshold: float = DEFAULT_SMALL_FARMER_ACRES_THRESHOLD,
) -> bool:
    """Small/marginal farmers (< threshold acres) get the priority lane."""
    return land_area_acres < threshold
