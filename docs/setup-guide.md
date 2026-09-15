# Setup Guide

> **This file is read by the automated evaluation pipeline. Be precise and complete.**

## Prerequisites

Before you begin, ensure you have the following installed:

- [ ] Python 3.11+
- [ ] Node.js 18+ and npm
- [ ] PostgreSQL, if running Mode 1 persistence locally
- [ ] MongoDB or MongoDB Atlas access, if running Mode 2 evidence storage
- [ ] A Hugging Face token only if the embedding model download requires authentication
- [ ] A Gemini API key only when using Mode 1 AI summaries

## Environment Variables

Mode 1 and Mode 2 use separate environment templates. Copy the template for the mode you plan to run and fill in real values; do not commit either `.env` file.

```bash
# Mode 1
cp src/.env.example src/.env

# Mode 2 backend
cp src/backend/.env.example src/backend/.env

# Mode 2 frontend
cp src/frontend/mode2/.env.example src/frontend/mode2/.env.local
```

| Variable | Description | Required |
|---|---|---|
| `API_USERNAME`, `API_PASSWORD` | Mode 1 HTTP Basic API credentials | Yes for Mode 1 |
| `DATABASE_URL` | Mode 1 PostgreSQL connection string | Yes for Mode 1 |
| `GEMINI_API_KEY` | Enables optional Mode 1 AI signal summaries | No |
| `MONGODB_URI`, `MONGODB_DATABASE` | Mode 2 official CTD and requirements store | Yes for Mode 2 |
| `USER_MONGODB_URI`, `USER_MONGODB_DATABASE` | Mode 2 applicant UserCTD store; uses the official URI if unset | Yes for a separate user-evidence store |
| `HF_TOKEN` | Optional token for downloading the SentenceTransformers model | No |
| `VITE_API_URL` | Mode 2 frontend URL for the FastAPI backend; default `http://localhost:8001` | Yes for Mode 2 frontend |

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/24CS052Jaymin/bob-ai-hackathon-BOB404.git
cd bob-ai-hackathon-BOB404

# 2. Install backend dependencies
# Mode 2 dependencies
cd src/backend
python -m pip install -r requirements.txt

# Mode 1 dependencies, if you will run Mode 1
python -m pip install -r mode1/requirements.txt
cd ../..

# 3. Install frontend dependencies (if applicable)
npm install --prefix src/frontend/mode1
npm install --prefix src/frontend/mode2

# 4. Set up the database (if applicable)
# Create the Mode 1 PostgreSQL database named in src/.env before starting Mode 1.
# Mode 2 creates its required MongoDB collection indexes during startup.
```

## Running the Application

```bash
# Mode 2 API: terminal 1
cd src/backend
python main.py

# Mode 2 frontend: terminal 2
cd src/frontend/mode2
npm run dev

# Mode 1 API: terminal 3, if running Mode 1
cd src
uvicorn backend.mode1.main:app --reload --port 8000

# Mode 1 frontend: terminal 4, if running Mode 1
cd src/frontend/mode1
npm run dev
```

Mode 2 is available at `http://localhost:5173` with its API on `http://localhost:8001`. Mode 1 also uses frontend port `5173`, so run the two frontends separately; its API is `http://localhost:8000`.

## Running Tests

```bash
# Backend syntax check
python -m compileall -q src/backend

# Frontend checks
npm run typecheck --prefix src/frontend/mode1
npm run typecheck --prefix src/frontend/mode2

# Mode 1 API system test (requires the Mode 1 API and PostgreSQL)
python src/demo/test_system.py
```

## Quick Demo (Optional)

If you have a demo script or sample data to showcase the project quickly:

```bash
# With Mode 1 running, upload one of the supplied demo CSV files through the UI:
# src/demo/faers_demo_1_cardio.csv

# With Mode 2 running, create a submission, upload a CTD PDF, and select Run analysis.
```

## Troubleshooting

| Issue | Solution |
|---|---|
| `ModuleNotFoundError` or missing package | Re-run the relevant `python -m pip install -r ...` command from Installation. |
| Mode 1 cannot connect to PostgreSQL | Check `DATABASE_URL` in `src/.env`, confirm PostgreSQL is running, and create the target database. |
| Mode 2 cannot connect to MongoDB | Check `MONGODB_URI` and optional `USER_MONGODB_URI` in `src/backend/.env`. |
| Frontend cannot reach the Mode 2 API | Start `python main.py` from `src/backend` and confirm `VITE_API_URL=http://localhost:8001` in `src/frontend/mode2/.env.local`. |
