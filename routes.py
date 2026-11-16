"""
API Routes — v1
"""

import logging
from datetime import datetime, time, timedelta, timezone
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db, AssessmentRecord
from app.schemas import (
    AssessmentRequest,
    AssessmentResponse,
    AssessmentHistoryItem,
    DashboardStats,
)
from app.assessment_engine import assessment_engine

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["Assessment"])


def _structured_value(value: Any, fallback: Any) -> Any:
    """Read both native JSON/JSONB values and legacy JSON text rows."""
    if value is None:
        return fallback
    if isinstance(value, str):
        import json

        try:
            return json.loads(value)
        except (TypeError, ValueError):
            logger.warning("Ignoring malformed legacy assessment JSON")
            return fallback
    return value


def _history_item(record: AssessmentRecord) -> AssessmentHistoryItem:
    return AssessmentHistoryItem(
        id=record.id,
        disease_module=record.disease_module,
        risk_level=record.risk_level,
        probability=record.probability,
        contributing_factors=_structured_value(record.contributing_factors, []),
        symptoms=_structured_value(record.symptoms, []),
        clinical_parameters=_structured_value(record.clinical_parameters, {}),
        created_at=record.created_at,
    )


# ---------------------------------------------------------------------------
# POST /api/v1/assessment
# ---------------------------------------------------------------------------

@router.post("/assessment", response_model=AssessmentResponse)
async def create_assessment(
    payload: AssessmentRequest,
    module: str = Query("diabetes", description="Disease module to use"),
    db: Session = Depends(get_db),
):
    """
    Run an AI-assisted preliminary assessment using the specified disease module.

    This endpoint does NOT provide a medical diagnosis. The result is an
    estimated risk category derived from a machine-learning model and should
    be interpreted by a qualified healthcare professional.
    """
    module = module.strip().lower()
    try:
        # Collect any extra module-specific parameters sent alongside the core fields
        extra_params = payload.model_extra or {}
        result = assessment_engine.run(
            module=module,
            age=payload.age,
            sex=payload.sex.value,
            height=payload.height,
            weight=payload.weight,
            symptoms=payload.symptoms,
            glucose=payload.glucose,
            blood_pressure=payload.blood_pressure,
            skin_thickness=payload.skin_thickness,
            insulin=payload.insulin,
            bmi=payload.bmi,
            **extra_params,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except NotImplementedError as exc:
        raise HTTPException(status_code=501, detail=str(exc))
    except Exception as exc:
        logger.exception("Assessment engine error")
        raise HTTPException(status_code=500, detail="Internal assessment error.")

    # Persist all model inputs needed for an auditable result, without names,
    # contact details, addresses, or other direct identifiers.
    clinical_params = {
        "age": payload.age,
        "sex": payload.sex.value,
        "height": payload.height,
        "weight": payload.weight,
        "bmi": result.get("bmi_computed", payload.bmi),
        "glucose": payload.glucose,
        "blood_pressure": payload.blood_pressure,
        "skin_thickness": payload.skin_thickness,
        "insulin": payload.insulin,
        **extra_params,
    }
    record = AssessmentRecord(
        disease_module=module,
        symptoms=payload.symptoms,
        clinical_parameters=clinical_params,
        prediction=result["condition"],
        risk_level=result["risk_level"],
        probability=result.get("probability"),
        contributing_factors=result.get("contributing_factors", []),
        created_at=datetime.now(timezone.utc),
    )
    try:
        db.add(record)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Could not persist assessment")
        raise HTTPException(status_code=503, detail="Assessment storage is temporarily unavailable.") from exc

    return AssessmentResponse(**result)


# ---------------------------------------------------------------------------
# GET /api/v1/assessments  — history
# ---------------------------------------------------------------------------

@router.get("/assessments", response_model=List[AssessmentHistoryItem])
async def list_assessments(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    module: Optional[str] = Query(None, description="Filter by disease module"),
    db: Session = Depends(get_db),
):
    """Return stored assessment history (most recent first)."""
    query = db.query(AssessmentRecord)
    if module:
        query = query.filter(AssessmentRecord.disease_module == module)
    records = query.order_by(AssessmentRecord.created_at.desc()).offset(offset).limit(limit).all()

    return [_history_item(record) for record in records]


# ---------------------------------------------------------------------------
# GET /api/v1/dashboard — statistics
# ---------------------------------------------------------------------------

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(db: Session = Depends(get_db)):
    """Return aggregated assessment statistics for the dashboard."""
    total = db.query(func.count(AssessmentRecord.id)).scalar() or 0

    # Risk distribution
    risk_rows = (
        db.query(AssessmentRecord.risk_level, func.count(AssessmentRecord.id))
        .group_by(AssessmentRecord.risk_level)
        .all()
    )
    risk_distribution = {row[0]: row[1] for row in risk_rows}

    # Module distribution
    module_rows = (
        db.query(AssessmentRecord.disease_module, func.count(AssessmentRecord.id))
        .group_by(AssessmentRecord.disease_module)
        .all()
    )
    module_distribution = {row[0]: row[1] for row in module_rows}

    # Recent assessments
    recent_records = (
        db.query(AssessmentRecord)
        .order_by(AssessmentRecord.created_at.desc())
        .limit(5)
        .all()
    )
    recent = [_history_item(record) for record in recent_records]

    # Actual assessment volume for the last 30 UTC calendar days.
    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=29)
    start_at = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
    timestamps = (
        db.query(AssessmentRecord.created_at)
        .filter(AssessmentRecord.created_at >= start_at)
        .all()
    )
    daily_counts = {
        (start_date + timedelta(days=offset)).isoformat(): 0
        for offset in range(30)
    }
    for (created_at,) in timestamps:
        date_key = created_at.date().isoformat() if created_at is not None else None
        if date_key in daily_counts:
            daily_counts[date_key] += 1

    return DashboardStats(
        total_assessments=total,
        risk_distribution=risk_distribution,
        module_distribution=module_distribution,
        recent_assessments=recent,
        daily_assessments=[
            {"date": date_value, "count": count}
            for date_value, count in daily_counts.items()
        ],
    )


# ---------------------------------------------------------------------------
# GET /api/v1/health
# ---------------------------------------------------------------------------

@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "HealthPredict AI API"}
