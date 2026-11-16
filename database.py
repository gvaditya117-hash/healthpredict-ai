"""Database configuration for HealthPredict AI."""

import os
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import JSON, Column, DateTime, Float, Integer, String, create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

_DB_PATH = Path(__file__).resolve().parents[1] / "healthpredict.db"
DEFAULT_SQLITE_URL = f"sqlite:///{_DB_PATH.as_posix()}"
DATABASE_URL = os.getenv("DATABASE_URL") or DEFAULT_SQLITE_URL

# SQLite remains usable only when explicitly selected for isolated development tests.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Uses native JSONB on PostgreSQL and SQLAlchemy's portable JSON type for
# local SQLite development and automated checks.
StructuredJSON = JSON().with_variant(JSONB(), "postgresql")


# ---------------------------------------------------------------------------
# ORM Models
# ---------------------------------------------------------------------------

class AssessmentRecord(Base):
    """Stores non-identifying inputs and preliminary assessment results."""

    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    disease_module = Column(String(64), nullable=False, default="diabetes", index=True)
    symptoms = Column(StructuredJSON, nullable=False, default=list)
    clinical_parameters = Column(StructuredJSON, nullable=False, default=dict)
    prediction = Column(String(64), nullable=False)
    risk_level = Column(String(32), nullable=False, index=True)
    probability = Column(Float, nullable=True)
    contributing_factors = Column(StructuredJSON, nullable=False, default=list)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )


def get_db():
    """FastAPI dependency: yield a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables on startup."""
    Base.metadata.create_all(bind=engine)
