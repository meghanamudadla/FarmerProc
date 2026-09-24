"""
Quality Check Pydantic Schemas (Phase 8)
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class QualityCheckCreate(BaseModel):
    moisture_percent: float = Field(..., ge=0.0, le=100.0, description="Moisture percentage (0-100)")
    foreign_matter_percent: float = Field(..., ge=0.0, le=100.0, description="Foreign matter percentage (0-100)")
    damaged_grains_percent: float = Field(..., ge=0.0, le=100.0, description="Damaged grains percentage (0-100)")
    slightly_damaged_percent: float = Field(default=0.0, ge=0.0, le=100.0)
    shrivelled_broken_percent: float = Field(default=0.0, ge=0.0, le=100.0)
    other_grains_percent: float = Field(default=0.0, ge=0.0, le=100.0)
    weevilled_grains_percent: float = Field(default=0.0, ge=0.0, le=100.0)


class QualityCheckResponse(BaseModel):
    id: int
    booking_id: int
    moisture_percent: float
    foreign_matter_percent: float
    damaged_grains_percent: float
    slightly_damaged_percent: float
    shrivelled_broken_percent: float
    other_grains_percent: float
    weevilled_grains_percent: float
    grade: Optional[str] = None
    result: str
    rejection_reason: Optional[str] = None
    recommendation: Optional[str] = None
    quality_deduction: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
