"""
HealthPredict AI — FastAPI Application Entry Point
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="HealthPredict AI",
    description=(
        "AI-Assisted Preliminary Assessment / Clinical Decision Support API. "
        "Results are estimated risk indicators and do NOT constitute medical diagnoses."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
async def on_startup():
    logger.info("Initialising database…")
    init_db()
    logger.info("HealthPredict AI API ready.")


@app.get("/")
async def root():
    return {
        "service": "HealthPredict AI",
        "version": "1.0.0",
        "docs": "/docs",
        "disclaimer": (
            "This service provides AI-assisted preliminary assessments only. "
            "It does not constitute medical advice or diagnosis."
        ),
    }
