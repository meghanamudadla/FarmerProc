"""
DQA Priority Eligibility
=========================
Single-responsibility module for the priority eligibility predicate.

Priority eligibility is assessed once on queue insertion and stored as
`QueueEntry.priority_lane`. The predicate is centralised here so it is
configurable and testable in isolation, rather than scattered as ad-hoc
booleans through the engine.

Default rule (per Build Spec, Section 7):
    A farmer is eligible for the priority lane if:
    - age >= 60 (senior citizen)  OR
    - land_area_acres < 1.0 (small/marginal farmer)

Both thresholds are configurable via constructor parameters. The predicate
is injected into DQAEngine at construction time so tests can supply an
alternative predicate without subclassing.
"""

from __future__ import annotations

from typing import Callable, TYPE_CHECKING

if TYPE_CHECKING:
    from .models import FarmerRequest


# Default configurable thresholds
DEFAULT_SENIOR_AGE_THRESHOLD: int = 60
DEFAULT_SMALL_FARMER_ACRES_THRESHOLD: float = 1.0


def make_priority_predicate(
    senior_age_threshold: int = DEFAULT_SENIOR_AGE_THRESHOLD,
    small_farmer_acres_threshold: float = DEFAULT_SMALL_FARMER_ACRES_THRESHOLD,
) -> Callable[["FarmerRequest"], bool]:
    """
    Factory that returns a configured is_priority predicate.

    Args:
        senior_age_threshold: Minimum age (inclusive) for senior priority.
        small_farmer_acres_threshold: Maximum land area (exclusive) for
            small-farmer priority.

    Returns:
        A callable `(FarmerRequest) -> bool` ready for injection into DQAEngine.

    Example:
        >>> is_priority = make_priority_predicate()
        >>> is_priority(farmer)   # True if age >= 60 or land_area_acres < 1.0
    """

    def is_priority(farmer: "FarmerRequest") -> bool:
        """
        Return True if the farmer qualifies for the priority lane.

        Pre-condition: farmer.age and farmer.land_area_acres are valid non-negative values.
        Post-condition: boolean, no side effects.
        """
        return farmer.age >= senior_age_threshold or farmer.land_area_acres < small_farmer_acres_threshold

    return is_priority


# Default predicate — use this unless overriding in tests or configuration.
default_is_priority: Callable[["FarmerRequest"], bool] = make_priority_predicate()
