"""
FastAPI application — Drug Safety Signal Detection (Mode 1).

Endpoints
---------
POST /api/v1/process-faers
    Phase 1 — data ingestion, cleaning, PRR calculation.
    Two modes: local CSV or file upload.

POST /api/v1/analyze-signals
    Phase 2 — ML clustering + Gemini AI summarization.
    Same ingest modes; returns the ML/AI-enriched JSON required by the frontend:
    {
      "summary_metrics": { "total_reports_analyzed": ..., "total_signals_detected": ... },
      "top_signals": [ { "drug_name", "reaction", "prr_score", "report_count",
                         "cluster_id", "cluster_label", "ai_summary" }, ... ]
    }

GET /api/v1/runs
    List all persisted analysis runs from PostgreSQL (newest first).

GET /api/v1/runs/{id}
    Fetch one persisted run by integer id.
"""

import os
import secrets
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

# load_dotenv() MUST run before any module that calls os.getenv() at import
# time (e.g. summarizer.py reads GEMINI_API_KEY at module level).
# Resolve the .env path from this file's location so it is found regardless
# of the working directory uvicorn is launched from.
# Search order: src/backend/mode1/.env → src/.env → cwd fallback
_ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=_ENV_FILE if _ENV_FILE.exists() else None)

from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from .cleaner import load_and_clean, load_and_clean_bytes
from .clustering import cluster_events
from .database import get_run, get_runs, init_db, save_run
from .models import (
    AnalysisRunResponse,
    AnalyzeSignalsResponse,
    ProcessFaersResponse,
    ProcessingStats,
    SummaryMetrics,
    TopSignal,
)
from .prr import calculate_prr
from .summarizer import refresh_api_key, summarize_signals_batch

# ---------------------------------------------------------------------------
# Lifespan — replaces the deprecated @app.on_event("startup")
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup tasks, yield control to the app, then run shutdown tasks."""
    # Startup: create SQLite schema and (re-)initialise Gemini with the key
    # that load_dotenv() just made available.
    init_db()
    refresh_api_key()
    # Log resolved paths so mis-configuration is immediately visible in the console
    import logging
    log = logging.getLogger("uvicorn.error")
    log.info("FAERS CSV  : %s  (exists=%s)", FAERS_CSV_PATH, os.path.isfile(FAERS_CSV_PATH))
    log.info("DB path    : %s", os.getenv("DB_PATH", "<default>"))
    log.info(".env loaded: %s", str(_ENV_FILE))
    yield
    # Shutdown: nothing to clean up for now

# ---------------------------------------------------------------------------
# HTTP Basic Auth — credentials loaded from .env (API_USERNAME / API_PASSWORD)
# ---------------------------------------------------------------------------
_security = HTTPBasic()
_API_USERNAME: str = os.getenv("API_USERNAME", "admin")
_API_PASSWORD: str = os.getenv("API_PASSWORD", "regulens2024")


def _require_auth(credentials: HTTPBasicCredentials = Depends(_security)) -> str:
    """Verify username + password from .env; raise 401 if wrong."""
    ok_user = secrets.compare_digest(
        credentials.username.encode(), _API_USERNAME.encode()
    )
    ok_pass = secrets.compare_digest(
        credentials.password.encode(), _API_PASSWORD.encode()
    )
    if not (ok_user and ok_pass):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Check API_USERNAME / API_PASSWORD in your .env file.",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Drug Safety Signal Detection API — Mode 1",
    description=(
        "Phase 1: POST /api/v1/process-faers — PRR signal detection.\n"
        "Phase 2: POST /api/v1/analyze-signals — ML clustering + AI summarization.\n"
        "DB:      GET  /api/v1/runs            — list persisted analysis runs.\n"
        "DB:      GET  /api/v1/runs/{id}       — fetch one run by id."
    ),
    version="3.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS — allow all origins so the frontend (any dev port / production domain)
# can call the API. Restrict allow_origins to specific domains in production.
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # replace with ["http://localhost:5173"] etc. in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Dataset and DB paths — resolved to absolute at import time so they are
# correct regardless of cwd or whether the .env contains a relative path.
#
# Resolution order for FAERS_CSV_PATH:
#   1. FAERS_CSV_PATH env var (absolute)       ← set this in .env
#   2. FAERS_CSV_PATH env var (relative)       ← resolved against src/
#   3. <src>/data/FAERS_data.csv               ← automatic fallback
# ---------------------------------------------------------------------------
_HERE: Path = Path(__file__).resolve().parent           # …/src/backend/mode1
_SRC:  Path = _HERE.parent.parent                       # …/src

def _resolve_path(env_key: str, default: Path) -> str:
    """Return an absolute path for *env_key*, resolving relative values against _SRC."""
    raw = os.getenv(env_key, "")
    if not raw:
        return str(default)
    p = Path(raw)
    if p.is_absolute():
        return str(p)
    # Relative path in .env — resolve against src/ so "data/FAERS_data.csv" works
    return str((_SRC / p).resolve())

_DEFAULT_CSV: Path = _SRC / "data" / "FAERS_data.csv"
_DEFAULT_DB:  Path = _HERE / "regulens.db"

FAERS_CSV_PATH: str = _resolve_path("FAERS_CSV_PATH", _DEFAULT_CSV)


# ---------------------------------------------------------------------------
# Shared ingest helper — avoids duplicating the dual-mode logic
# ---------------------------------------------------------------------------
async def _ingest(file: UploadFile | None):
    """Load and clean a FAERS DataFrame from an upload or the local file.

    Raises HTTPException on any failure so callers don't need to repeat guards.
    """
    if file is not None:
        raw_bytes = await file.read()
        if not raw_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty.",
            )
        try:
            return load_and_clean_bytes(raw_bytes)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(exc),
            ) from exc
    else:
        if not os.path.isfile(FAERS_CSV_PATH):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"Local FAERS dataset not found at: {FAERS_CSV_PATH}. "
                    "Set FAERS_CSV_PATH env var or upload a file."
                ),
            )
        try:
            return load_and_clean(FAERS_CSV_PATH)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(exc),
            ) from exc


# ---------------------------------------------------------------------------
# POST /api/v1/process-faers  (Phase 1)
# ---------------------------------------------------------------------------
@app.post(
    "/api/v1/process-faers",
    response_model=ProcessFaersResponse,
    summary="Phase 1 — Process FAERS data and detect drug-event safety signals",
    response_description=(
        "Processing stats + full signals list with PRR ≥ 2.0 and report_count ≥ 3"
    ),
)
async def process_faers(
    _user: str = Depends(_require_auth),
    file: UploadFile | None = File(
        default=None,
        description=(
            "Optional FAERS-formatted CSV upload (columns: report_id, suspect_drug, reactions). "
            "If omitted, the local dataset at src/data/FAERS_data.csv is used."
        ),
    ),
) -> ProcessFaersResponse:
    """Detect potential drug-event safety signals from FAERS data (Phase 1).

    ### Processing pipeline
    1. **Ingest** — load `report_id`, `suspect_drug`, `reactions` columns.
    2. **Clean** — drop nulls, explode semicolons, lowercase + strip text.
    3. **PRR** — 2×2 contingency table per pair; compute `PRR = (a/(a+b)) / (c/(c+d))`.
    4. **Filter** — keep pairs where `PRR ≥ 2.0` and `report_count ≥ 3`.
    5. **Enrich** — add 95% CI, trend, priority, cluster label, backgroundReports,
       monthlyReports; format to match the frontend `Signal` TypeScript type exactly.
    """
    df_clean = await _ingest(file)

    if df_clean.empty:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No valid drug-event rows remain after cleaning.",
        )

    signals = calculate_prr(df_clean)

    stats = ProcessingStats(
        total_reports=len(df_clean),
        unique_drugs=int(df_clean["drug"].nunique()),
        unique_events=int(df_clean["event"].nunique()),
        total_pairs=int(df_clean.groupby(["drug", "event"]).ngroups),
        signals_detected=len(signals),
    )

    return ProcessFaersResponse(status="success", stats=stats, signals=signals)


# ---------------------------------------------------------------------------
# POST /api/v1/analyze-signals  (Phase 2 — ML + AI)
# ---------------------------------------------------------------------------
@app.post(
    "/api/v1/analyze-signals",
    response_model=AnalyzeSignalsResponse,
    summary="Phase 2 — ML clustering + AI summarization of top FAERS signals",
    response_description=(
        "summary_metrics block + top_signals list, each with cluster_id, "
        "cluster_label, and a Gemini-generated pharmacovigilance summary"
    ),
)
async def analyze_signals(
    _user: str = Depends(_require_auth),
    file: UploadFile | None = File(
        default=None,
        description=(
            "Optional FAERS-formatted CSV upload "
            "(columns: report_id, suspect_drug, reactions). "
            "If omitted, the local dataset at src/data/FAERS_data.csv is used."
        ),
    ),
    top_n: int = Query(
        default=20,
        ge=1,
        le=200,
        description="How many top signals (by PRR) to enrich with ML + AI. Default 20.",
    ),
    n_clusters: int = Query(
        default=20,
        ge=2,
        le=100,
        description="Number of MiniBatchKMeans clusters for adverse event grouping. Default 20.",
    ),
) -> AnalyzeSignalsResponse:
    """Run the full ML + AI signal analysis pipeline (Phase 2).

    ### Processing pipeline
    1. **Ingest** — load `report_id`, `suspect_drug`, `reactions` (local file or upload).
    2. **Clean** — drop nulls, explode semicolons, lowercase + strip text.
    3. **PRR** — compute 2×2 contingency tables; filter PRR ≥ 2.0, count ≥ 3.
    4. **ML Clustering** — TF-IDF vectorise all unique reactions; MiniBatchKMeans
       groups them into `n_clusters` thematic clusters with SOC-level labels.
    5. **AI Summarization** — Gemini generates a 2–3 sentence clinical summary
       for each of the top `top_n` signals. Runs concurrently (max 5 at a time)
       via `asyncio.gather` so the FastAPI event loop is never blocked.
    6. **Respond** — return `summary_metrics` + `top_signals` in the exact
       JSON shape required by the frontend.

    ### Clinical disclaimer
    All AI summaries emphasise that PRR is a screening metric and NOT proof of
    causation. Each summary recommends further clinical / pharmacovigilance review.
    """
    # ------------------------------------------------------------------
    # Steps 1–2: Ingest and clean
    # ------------------------------------------------------------------
    df_clean = await _ingest(file)

    if df_clean.empty:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No valid drug-event rows remain after cleaning.",
        )

    # ------------------------------------------------------------------
    # Step 3: PRR calculation — full list, then slice to top_n
    # ------------------------------------------------------------------
    all_signals = calculate_prr(df_clean)      # list[Signal], sorted PRR desc
    slice_signals = all_signals[:top_n]

    # ------------------------------------------------------------------
    # Step 4: ML Clustering
    # Cluster ALL unique reactions from the cleaned frame so the model
    # has full vocabulary coverage, then look up each signal's reaction.
    # ------------------------------------------------------------------
    unique_reactions: list[str] = df_clean["event"].unique().tolist()
    cluster_map = cluster_events(unique_reactions, n_clusters=n_clusters)

    # ------------------------------------------------------------------
    # Step 5: Build per-signal dicts for the AI batch call
    # ------------------------------------------------------------------
    signal_dicts = []
    for sig in slice_signals:
        info = cluster_map.get(sig.event)
        signal_dicts.append({
            "drug_name":     sig.drug,
            "reaction":      sig.event,
            "prr_score":     sig.prr,
            "report_count":  sig.reports,
            "cluster_id":    info.cluster_id if info else 0,
            "cluster_label": info.cluster_label if info else "Other Adverse Events",
        })

    # ------------------------------------------------------------------
    # Step 6: Async Gemini summarization (rate-limited concurrency)
    # ------------------------------------------------------------------
    summaries: list[str] = await summarize_signals_batch(signal_dicts, concurrency=5)

    # ------------------------------------------------------------------
    # Step 7: Assemble and return response
    # ------------------------------------------------------------------
    top_signals = [
        TopSignal(
            drug_name=sd["drug_name"],
            reaction=sd["reaction"],
            prr_score=round(sd["prr_score"], 4),
            report_count=sd["report_count"],
            cluster_id=sd["cluster_id"],
            cluster_label=sd["cluster_label"],
            ai_summary=summary,
        )
        for sd, summary in zip(signal_dicts, summaries)
    ]

    response = AnalyzeSignalsResponse(
        summary_metrics=SummaryMetrics(
            total_reports_analyzed=len(df_clean),
            total_signals_detected=len(all_signals),
        ),
        top_signals=top_signals,
    )

    # ------------------------------------------------------------------
    # Step 8: Persist the run to SQLite
    # ------------------------------------------------------------------
    save_run(
        total_reports=len(df_clean),
        total_signals=len(all_signals),
        top_n=top_n,
        n_clusters=n_clusters,
        top_signals=[s.model_dump() for s in top_signals],
    )

    return response


# ---------------------------------------------------------------------------
# GET /api/v1/runs — list persisted analysis runs
# ---------------------------------------------------------------------------
@app.get(
    "/api/v1/runs",
    response_model=list[AnalysisRunResponse],
    summary="List all saved analysis runs (newest first)",
)
def list_runs(
    limit: int = 50,
    _user: str = Depends(_require_auth),
) -> list[AnalysisRunResponse]:
    """Return the *limit* most recent analysis runs stored in SQLite."""
    rows = get_runs(limit=limit)
    return [AnalysisRunResponse(**r) for r in rows]


# ---------------------------------------------------------------------------
# GET /api/v1/runs/{run_id} — fetch one run
# ---------------------------------------------------------------------------
@app.get(
    "/api/v1/runs/{run_id}",
    response_model=AnalysisRunResponse,
    summary="Fetch a single saved analysis run by ID",
)
def fetch_run(
    run_id: int,
    _user: str = Depends(_require_auth),
) -> AnalysisRunResponse:
    """Return one analysis run by its integer id."""
    row = get_run(run_id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis run {run_id} not found.",
        )
    return AnalysisRunResponse(**row)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", summary="Health check", include_in_schema=False)
def health() -> dict:
    return {"status": "ok"}
