@echo off
echo ============================================================
echo   HealthPredict AI — Starting Backend (FastAPI)
echo ============================================================
cd /d "%~dp0backend"
if not defined DATABASE_URL if not exist ".env" (
  echo ERROR: PostgreSQL configuration is missing.
  echo Copy backend\.env.example to backend\.env and update DATABASE_URL.
  exit /b 1
)
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
