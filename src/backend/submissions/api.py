"""FastAPI router for submission management and analysis.

Routes
──────
POST /api/submissions                           create submission
GET  /api/submissions                           list all
GET  /api/submissions/{id}                      get one
POST /api/submissions/{id}/documents            delegate to user_evidence ingest
POST /api/submissions/{id}/analyze              run analysis, return report
GET  /api/submissions/{id}/report               get latest saved report
GET  /api/submissions/{id}/modules              module scores from latest report
GET  /api/submissions/{id}/gaps                 gap register from latest report
GET  /api/submissions/{id}/evidence             evidence stats / document list
POST /api/submissions/{id}/gaps/{gap_id}/recommendation  gap recommendation
"""
from __future__ import annotations

import logging
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse

from official_evidence.config import settings as official_settings
from official_evidence.embeddings import EmbeddingProvider
from official_evidence.repository import MongoRepository as OfficialRepo
from user_evidence.config import user_settings
from user_evidence.ingestion import ingest_user_pdf
from user_evidence.repository import UserRepository

from .analyzer import run_analysis
from .config import submission_settings
from .gap_advisor import generate_recommendation
from .models import SubmissionRecord, utc_now
from .repository import SubmissionRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/submissions", tags=["submissions"])

# ── Singletons ────────────────────────────────────────────────────────────────

_sub_repo = SubmissionRepository(submission_settings)
_user_repo = UserRepository(user_settings)
_official_repo = OfficialRepo(official_settings)

# Lazy wrapper — the sentence-transformer model is heavy (~80 MB, 3–8 s on CPU).
# Defer loading until the first /analyze call so server startup stays fast.
class _LazyEmbedder:
    def __init__(self) -> None:
        self._inner: EmbeddingProvider | None = None

    def _load(self) -> EmbeddingProvider:
        if self._inner is None:
            logger.info("Loading embedding model (first use)…")
            self._inner = EmbeddingProvider(
                submission_settings.embedding_model,
                submission_settings.embedding_dimensions,
                submission_settings.allow_test_embeddings,
            )
            logger.info("Embedding model ready.")
        return self._inner

    def __call__(self, texts: list[str]) -> list[list[float]]:
        return self._load()(texts)


_embedder = _LazyEmbedder()


def _startup() -> None:
    _sub_repo.ensure_indexes()
    logger.info("Submissions API ready — db=%s", submission_settings.database)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _clean(doc: dict[str, Any] | None) -> dict[str, Any] | None:
    """Remove MongoDB _id (ObjectId) so FastAPI can serialise the dict."""
    if doc is None:
        return None
    doc.pop("_id", None)
    return doc


def _clean_list(docs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    for d in docs:
        d.pop("_id", None)
    return docs


def _require_submission(submission_id: str) -> dict[str, Any]:
    doc = _clean(_sub_repo.get_submission(submission_id))
    if not doc:
        raise HTTPException(status_code=404, detail=f"Submission {submission_id!r} not found")
    return doc


def _require_report(submission_id: str) -> dict[str, Any]:
    report = _clean(_sub_repo.get_report(submission_id))
    if not report:
        raise HTTPException(
            status_code=404,
            detail=f"No analysis report found for submission {submission_id!r}. Run /analyze first.",
        )
    return report


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("")
def create_submission(body: dict[str, Any]) -> dict[str, Any]:
    """Create a new submission record."""
    product_name = (body.get("product_name") or body.get("product") or "").strip()
    if not product_name:
        raise HTTPException(status_code=400, detail="product_name is required")

    submission_id = (
        body.get("submission_id")
        or f"sub-{product_name.lower()[:12].replace(' ', '-')}-{uuid.uuid4().hex[:6]}"
    )

    # Check for duplicate
    if _sub_repo.get_submission(submission_id):
        raise HTTPException(status_code=409, detail=f"Submission {submission_id!r} already exists")

    now = utc_now()
    record = SubmissionRecord(
        submission_id=submission_id,
        product_name=product_name,
        sponsor=body.get("sponsor", ""),
        region=body.get("region", ""),
        submission_type=body.get("submission_type") or body.get("type", ""),
        target_date=body.get("target_date") or body.get("targetDate", ""),
        status="Draft",
        created_at=now,
        updated_at=now,
    )
    doc = record.mongo_document()
    try:
        _sub_repo.create_submission(doc)
    except Exception as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    logger.info("Created submission: %s product=%s", submission_id, product_name)
    return doc


@router.get("")
def list_submissions() -> list[dict[str, Any]]:
    return _clean_list(_sub_repo.list_submissions())


@router.get("/{submission_id}")
def get_submission(submission_id: str) -> dict[str, Any]:
    return _require_submission(submission_id)


@router.post("/{submission_id}/documents")
async def upload_documents(
    submission_id: str,
    files: list[UploadFile] = File(...),
) -> dict[str, Any]:
    """Ingest PDFs for a submission — delegates to user_evidence ingest pipeline."""
    _require_submission(submission_id)

    results = []
    for upload in files:
        if not upload.filename or not upload.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"Only PDF files accepted: {upload.filename!r}")
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(await upload.read())
            tmp_path = Path(tmp.name)
        try:
            result = ingest_user_pdf(tmp_path, submission_id, _user_repo, user_settings)
            _clean(result)  # ingest_user_pdf returns a plain dict — strip _id just in case
            results.append(result)
        except Exception as exc:
            logger.exception("Ingestion failed for %s: %s", upload.filename, exc)
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        finally:
            tmp_path.unlink(missing_ok=True)

    counts = _user_repo.counts(submission_id=submission_id)
    return {
        "submission_id": submission_id,
        "documents": results,
        "validation": {
            "current_chunks": counts["current_chunks"],
            "current_submissions": counts["current_submissions"],
        },
    }


@router.post("/{submission_id}/analyze")
def analyze_submission(submission_id: str) -> dict[str, Any]:
    """Run the full analysis pipeline. May take 10–60 seconds for large dossiers."""
    _require_submission(submission_id)
    try:
        report = run_analysis(
            submission_id,
            sub_repo=_sub_repo,
            official_repo=_official_repo,
            user_repo=_user_repo,
            embedder=_embedder,
            pipeline_version=submission_settings.pipeline_version,
        )
        return report.mongo_document()
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Analysis failed for submission=%s: %s", submission_id, exc)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}") from exc


@router.get("/{submission_id}/report")
def get_report(submission_id: str) -> dict[str, Any]:
    _require_submission(submission_id)
    return _require_report(submission_id)


@router.get("/{submission_id}/modules")
def get_modules(submission_id: str) -> list[dict[str, Any]]:
    report = _require_report(submission_id)
    return _clean_list(report.get("module_scores", []))


@router.get("/{submission_id}/gaps")
def get_gaps(
    submission_id: str,
    severity: str | None = Query(default=None),
    status: str | None = Query(default=None),
) -> list[dict[str, Any]]:
    report = _require_report(submission_id)
    gaps: list[dict[str, Any]] = report.get("gaps", [])
    if severity:
        gaps = [g for g in gaps if g.get("severity", "").upper() == severity.upper()]
    if status:
        gaps = [g for g in gaps if g.get("status", "").lower() == status.lower()]
    return _clean_list(gaps)


@router.get("/{submission_id}/evidence")
def get_evidence(submission_id: str) -> dict[str, Any]:
    """Return ingested document list + evidence stats from the latest report.

    When a report exists, also returns per-requirement traceability:
    each requirement shows which user chunks matched it and what its status is.
    """
    _require_submission(submission_id)
    docs = _clean_list(_user_repo.list_submissions(submission_id=submission_id))
    counts = _user_repo.counts(submission_id=submission_id)
    report = _clean(_sub_repo.get_report(submission_id))
    evidence_stats = report.get("evidence_stats", {}) if report else {}

    # Per-requirement traceability — only available when a report exists
    requirement_trace: list[dict[str, Any]] = []
    if report:
        for req in report.get("requirements", []):
            requirement_trace.append({
                "requirement_id": req.get("requirement_id"),
                "section_number": req.get("section_number"),
                "section_title": req.get("section_title"),
                "module": req.get("module"),
                "status": req.get("status"),
                "confidence": req.get("confidence"),
                "matched_chunk_count": len(req.get("matched_chunk_ids", [])),
                "matched_chunk_ids": req.get("matched_chunk_ids", [])[:5],  # first 5 only
            })

    return {
        "submission_id": submission_id,
        "documents": docs,
        "counts": counts,
        "evidence_stats": evidence_stats,
        "requirement_trace": requirement_trace,
    }


@router.post("/{submission_id}/gaps/{gap_id}/recommendation")
def gap_recommendation(submission_id: str, gap_id: str) -> dict[str, Any]:
    """Generate a structured gap recommendation from official + user evidence."""
    _require_submission(submission_id)
    report = _require_report(submission_id)

    # Find the gap
    gap = next((g for g in report.get("gaps", []) if g.get("gap_id") == gap_id), None)
    if not gap:
        raise HTTPException(status_code=404, detail=f"Gap {gap_id!r} not found in latest report")

    # Load requirement metadata
    req_id = gap.get("requirement_id", "")
    requirement = _official_repo.requirements.find_one({"requirement_id": req_id}, {"_id": 0}) or {}

    # Load official chunks from source_chunk_ids
    official_chunk_ids: list[str] = requirement.get("source_chunk_ids", [])
    official_chunks: list[dict[str, Any]] = []
    if official_chunk_ids:
        official_chunks = list(
            _official_repo.chunks.find(
                {"chunk_id": {"$in": official_chunk_ids[:3]}},
                {"_id": 0, "embedding": 0},
            )
        )

    # Load user evidence chunks
    user_chunk_ids: list[str] = gap.get("user_evidence_refs", [])
    user_chunks: list[dict[str, Any]] = []
    if user_chunk_ids:
        user_chunks = list(
            _user_repo.chunks.find(
                {"chunk_id": {"$in": user_chunk_ids[:3]}},
                {"_id": 0, "embedding": 0},
            )
        )

    recommendation = generate_recommendation(gap, requirement, official_chunks, user_chunks)
    return {"gap_id": gap_id, "submission_id": submission_id, "recommendation": recommendation}


@router.delete("/{submission_id}")
def delete_submission(submission_id: str) -> dict[str, Any]:
    """
    Delete a submission and all its associated data.

    Removes:
    - The submission record from Submissions
    - The analysis report from SubmissionReports
    - All user evidence chunks from UserCTD (Mode2v2)
    - All user submission records from UserSubmissions (Mode2v2)
    """
    _require_submission(submission_id)

    # Delete user evidence chunks
    chunks_deleted = _user_repo.chunks.delete_many({"submission_id": submission_id}).deleted_count
    # Delete user submission records
    submissions_deleted = _user_repo.submissions.delete_many({"submission_id": submission_id}).deleted_count
    # Delete analysis report
    reports_deleted = _sub_repo.reports.delete_many({"submission_id": submission_id}).deleted_count
    # Delete the submission record itself
    _sub_repo.submissions.delete_one({"submission_id": submission_id})

    logger.info(
        "Deleted submission=%s: chunks=%d submissions=%d reports=%d",
        submission_id, chunks_deleted, submissions_deleted, reports_deleted,
    )
    return {
        "submission_id": submission_id,
        "deleted": True,
        "chunks_deleted": chunks_deleted,
        "evidence_documents_deleted": submissions_deleted,
        "reports_deleted": reports_deleted,
    }
