"""
Assessment Engine
==================
Modular orchestrator for disease-specific ML prediction models.

Architecture:
    AssessmentEngine
    ├── DiabetesModule      ← implemented
    ├── HeartDiseaseModule  ← implemented
    ├── LiverDiseaseModule  ← implemented
    └── KidneyDiseaseModule ← implemented
    └── ...

Each module must implement a `predict(**kwargs) -> dict` function.
The engine routes requests to the appropriate module based on the
requested disease/module identifier.
"""

import logging
from typing import Dict, Any, Optional, List

from app.ml_models import diabetes_model, heart_disease_model, liver_disease_model, kidney_disease_model

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Module registry — register only implemented, validated integrations
# ---------------------------------------------------------------------------

MODULES: Dict[str, Any] = {
    "diabetes":      diabetes_model,
    "heart_disease": heart_disease_model,
    "liver_disease": liver_disease_model,
    "kidney_disease":kidney_disease_model,
}


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

class AssessmentEngine:
    """
    Routes assessment requests to the appropriate disease-specific model
    and wraps the result in a standardised response structure.
    """

    SUPPORTED_MODULES = list(MODULES.keys())

    def run(
        self,
        module: str,
        age: int,
        sex: str,
        height: float,
        weight: float,
        symptoms: List[str],
        glucose: Optional[float] = None,
        blood_pressure: Optional[float] = None,
        skin_thickness: Optional[float] = None,
        insulin: Optional[float] = None,
        bmi: Optional[float] = None,
        **extra_params,
    ) -> Dict[str, Any]:
        """
        Run assessment for the given disease module.

        Returns a standardised dict ready to be serialised into AssessmentResponse.
        """
        if module not in MODULES:
            raise ValueError(
                f"Unknown assessment module: '{module}'. "
                f"Available: {self.SUPPORTED_MODULES}"
            )

        mod = MODULES[module]
        logger.info("Running assessment engine → module='%s'", module)

        result = mod.predict(
            age=age,
            sex=sex,
            height=height,
            weight=weight,
            symptoms=symptoms,
            glucose=glucose,
            blood_pressure=blood_pressure,
            skin_thickness=skin_thickness,
            insulin=insulin,
            bmi=bmi,
            **extra_params,
        )

        # Standardise condition name
        condition_labels = {
            "diabetes":      "Diabetes",
            "heart_disease": "Heart Disease",
            "liver_disease": "Liver Disease",
            "kidney_disease":"Kidney Disease",
        }
        condition = condition_labels.get(module, module.replace("_", " ").title())

        return {
            "assessment_type": "AI-assisted preliminary assessment",
            "condition": condition,
            "risk_level": result["risk_level"],
            "probability": result.get("probability"),
            "contributing_factors": result.get("contributing_factors", []),
            "message": result.get("message", ""),
            "recommendation": result.get("recommendation", ""),
            "emergency_notice": result.get("emergency_notice"),
            "bmi_computed": result.get("bmi_computed"),
        }


# Global singleton
assessment_engine = AssessmentEngine()
