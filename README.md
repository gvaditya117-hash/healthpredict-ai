# HealthPredict AI

AI-Assisted Preliminary Assessment / Clinical Decision Support System

> ⚠️ **Medical Disclaimer:** This application provides AI-assisted preliminary assessments based on available input data. It **cannot replace professional medical diagnosis**, clinical evaluation, or laboratory testing. Always consult a qualified healthcare professional for any health concerns.

---

## Architecture

```
React (Vite) → FastAPI → ML Engine → PostgreSQL
     :5173          :8000                JSONB
```

### Assessment Engine (Modular)
```
Assessment Engine
├── ✅ Diabetes Module      ← implemented
├── ✅ Heart Disease Module ← implemented
├── ✅ Liver Disease Module ← implemented
└── ✅ Kidney Disease Module← implemented
```

---

## Quick Start

### 1. Configure PostgreSQL

Create a PostgreSQL database and copy `backend/.env.example` to `backend/.env`.
Update `DATABASE_URL` with the local database credentials. Assessment records and
all dashboard statistics are then stored in and read from PostgreSQL.

### 2. Start the Backend

```bash
# Open terminal 1
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

Or double-click **`start_backend.bat`**

### 3. Start the Frontend

```bash
# Open terminal 2
cd frontend
npm install
npm run dev
```

Or double-click **`start_frontend.bat`**

### 4. Open in Browser

- **App:** http://localhost:5173
- **API Docs:** http://localhost:8000/docs

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard — stats, charts, recent assessments |
| `/assessment` | Multi-step Assessment form |
| `/history` | Full assessment history with expandable rows |

---

## API

### POST /api/v1/assessment

```json
{
  "age": 35,
  "sex": "female",
  "height": 165,
  "weight": 70,
  "symptoms": ["fatigue", "increased_thirst"],
  "glucose": 130,
  "blood_pressure": 78,
  "bmi": 25.7
}
```

Illustrative response (the values are calculated by the model for each request):
```json
{
  "assessment_type": "AI-assisted preliminary assessment",
  "condition": "Diabetes",
  "risk_level": "Higher",
  "probability": 0.72,
  "contributing_factors": ["Blood glucose level", "Body Mass Index (BMI)"],
  "message": "The machine-learning model estimates a higher estimated risk of diabetes...",
  "recommendation": "Consider discussing these results with a qualified healthcare professional...",
  "disclaimer": "This is an AI-assisted preliminary assessment..."
}
```

### GET /api/v1/assessments
### GET /api/v1/dashboard
### GET /api/v1/health

---

## Database

Uses **PostgreSQL**. Set the connection in `backend/.env`:
```
DATABASE_URL=postgresql+psycopg2://user:password@host:5432/healthpredict
```

SQLite can be selected explicitly for isolated development checks, but it is not
the application datastore.

### Assessment Table

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| disease_module | VARCHAR | e.g. `diabetes` |
| symptoms | JSONB | Selected symptom keys |
| clinical_parameters | JSONB | Non-identifying model inputs |
| prediction | VARCHAR | Condition name |
| risk_level | VARCHAR | Low/Moderate/Higher/High |
| probability | FLOAT | Model probability [0, 1] |
| contributing_factors | JSONB | Human-readable factor list |
| created_at | TIMESTAMPTZ | UTC timestamp |

---

## Medical Safety

- **Never claims diagnosis** — uses "higher predicted risk", "estimated risk", "AI-assisted preliminary assessment"
- **Emergency symptom detection** — displays safety notice for chest pain, loss of consciousness, etc.
- **Full disclaimer** — shown on every assessment page and result
- **No PII stored** — only non-identifying demographic and model-input data is retained
- **Model limitation disclosed** — the initial diabetes model uses synthetic training data and reference values for missing optional inputs; it is not clinically validated
