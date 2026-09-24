"""
Crop-Specific Quality Standards & Thresholds (Phase 8)
Defines official grading parameters, rejection limits, and deduction rules per crop.
"""
from dataclasses import dataclass
from typing import Dict, Optional


@dataclass
class CropQualityStandard:
    crop_name: str
    max_moisture_percent: float
    moisture_deduction_threshold: float
    moisture_deduction_rate_per_percent: float
    max_foreign_matter_percent: float
    foreign_matter_deduction_threshold: float
    foreign_matter_deduction_rate: float
    max_damaged_grains_percent: float
    max_slightly_damaged_percent: float
    max_shrivelled_broken_percent: float
    max_other_grains_percent: float
    max_weevilled_grains_percent: float


# Official MSP Fair Average Quality (FAQ) Standards
QUALITY_STANDARDS: Dict[str, CropQualityStandard] = {
    "paddy": CropQualityStandard(
        crop_name="paddy",
        max_moisture_percent=17.0,
        moisture_deduction_threshold=14.0,
        moisture_deduction_rate_per_percent=20.0,
        max_foreign_matter_percent=2.0,
        foreign_matter_deduction_threshold=1.0,
        foreign_matter_deduction_rate=15.0,
        max_damaged_grains_percent=4.0,
        max_slightly_damaged_percent=4.0,
        max_shrivelled_broken_percent=6.0,
        max_other_grains_percent=2.0,
        max_weevilled_grains_percent=1.0,
    ),
    "wheat": CropQualityStandard(
        crop_name="wheat",
        max_moisture_percent=14.0,
        moisture_deduction_threshold=12.0,
        moisture_deduction_rate_per_percent=25.0,
        max_foreign_matter_percent=1.5,
        foreign_matter_deduction_threshold=0.75,
        foreign_matter_deduction_rate=20.0,
        max_damaged_grains_percent=3.0,
        max_slightly_damaged_percent=4.0,
        max_shrivelled_broken_percent=5.0,
        max_other_grains_percent=2.0,
        max_weevilled_grains_percent=1.0,
    ),
    "cotton": CropQualityStandard(
        crop_name="cotton",
        max_moisture_percent=12.0,
        moisture_deduction_threshold=9.0,
        moisture_deduction_rate_per_percent=30.0,
        max_foreign_matter_percent=3.0,
        foreign_matter_deduction_threshold=1.5,
        foreign_matter_deduction_rate=25.0,
        max_damaged_grains_percent=5.0,
        max_slightly_damaged_percent=5.0,
        max_shrivelled_broken_percent=7.0,
        max_other_grains_percent=3.0,
        max_weevilled_grains_percent=1.5,
    ),
    "maize": CropQualityStandard(
        crop_name="maize",
        max_moisture_percent=15.0,
        moisture_deduction_threshold=13.0,
        moisture_deduction_rate_per_percent=20.0,
        max_foreign_matter_percent=2.5,
        foreign_matter_deduction_threshold=1.0,
        foreign_matter_deduction_rate=15.0,
        max_damaged_grains_percent=4.5,
        max_slightly_damaged_percent=4.5,
        max_shrivelled_broken_percent=6.0,
        max_other_grains_percent=2.0,
        max_weevilled_grains_percent=1.0,
    ),
}

# Generic Standard for unspecified commodities
DEFAULT_STANDARD = CropQualityStandard(
    crop_name="default",
    max_moisture_percent=14.0,
    moisture_deduction_threshold=12.0,
    moisture_deduction_rate_per_percent=20.0,
    max_foreign_matter_percent=2.0,
    foreign_matter_deduction_threshold=1.0,
    foreign_matter_deduction_rate=15.0,
    max_damaged_grains_percent=4.0,
    max_slightly_damaged_percent=4.0,
    max_shrivelled_broken_percent=6.0,
    max_other_grains_percent=2.0,
    max_weevilled_grains_percent=1.0,
)


def get_standard_for_crop(crop_name: Optional[str]) -> CropQualityStandard:
    if not crop_name:
        return DEFAULT_STANDARD
    clean = crop_name.lower().strip()
    for key, standard in QUALITY_STANDARDS.items():
        if key in clean:
            return standard
    return DEFAULT_STANDARD
