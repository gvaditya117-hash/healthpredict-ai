"""
Pydantic schemas for request/response validation.
"""

from pydantic import BaseModel, ConfigDict, Field
from typing import Any, Dict, List, Optional
from datetime import datetime
from enum import Enum


class SexEnum(str, Enum):
    male = "male"
    female = "female"
    other = "other"


class RiskLevel(str, Enum):
    low = "Low"
    moderate = "Moderate"
    higher = "Higher"
    high = "High"


# ---------------------------------------------------------------------------
# Assessment Request
# ---------------------------------------------------------------------------

class AssessmentRequest(BaseModel):
    # Patient info (non-identifying)
    age: int = Field(..., ge=1, le=120, description="Patient age in years")
    sex: SexEnum
    height: float = Field(..., ge=50, le=300, description="Height in centimetres")
    weight: float = Field(..., gt=0, le=600, description="Weight in kilograms")

    # Symptoms (list of non-identifying string keys)
    symptoms: List[str] = Field(default_factory=list, description="Selected symptom identifiers")

    # Only measurements consumed by the diabetes model are accepted.
    glucose: Optional[float] = Field(None, gt=0, le=1000, description="Blood glucose mg/dL")
    blood_pressure: Optional[float] = Field(None, gt=0, le=250, description="Diastolic BP mmHg")
    skin_thickness: Optional[float] = Field(None, gt=0, le=100, description="Triceps skinfold thickness mm")
    insulin: Optional[float] = Field(None, gt=0, le=1000, description="2-Hour serum insulin mu U/ml")
    bmi: Optional[float] = Field(None, ge=10, le=100, description="Body Mass Index")

    model_config = ConfigDict(
        extra="allow",
        json_schema_extra={
            "example": {
                "age": 35,
                "sex": "female",
                "height": 165,
                "weight": 70,
                "symptoms": ["fatigue", "increased_thirst"],
                "glucose": 130,
                "blood_pressure": 78,
                "bmi": 25.7,
            }
        }
    )


# ---------------------------------------------------------------------------
# Assessment Response
# ---------------------------------------------------------------------------

class AssessmentResponse(BaseModel):
    assessment_type: str = "AI-assisted preliminary assessment"
    condition: str
    risk_level: str
    probability: Optional[float]
    contributing_factors: List[str]
    message: str
    recommendation: str
    emergency_notice: Optional[str] = None
    disclaimer: str = (
        "This is an AI-assisted preliminary assessment and does NOT constitute a "
        "medical diagnosis. Always consult a qualified healthcare professional for "
        "any health concerns."
    )


# ---------------------------------------------------------------------------
# Assessment History
# ---------------------------------------------------------------------------

class AssessmentHistoryItem(BaseModel):
    id: int
    disease_module: str
    risk_level: str
    probability: Optional[float]
    contributing_factors: List[str]
    symptoms: List[str]
    clinical_parameters: Dict[str, Any]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Dashboard Statistics
# ---------------------------------------------------------------------------

class DailyAssessmentCount(BaseModel):
    date: str
    count: int


class DashboardStats(BaseModel):
    total_assessments: int
    risk_distribution: Dict[str, int]
    module_distribution: Dict[str, int]
    recent_assessments: List[AssessmentHistoryItem]
    daily_assessments: List[DailyAssessmentCount]
