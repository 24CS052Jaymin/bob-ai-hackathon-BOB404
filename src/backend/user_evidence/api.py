"""
FastAPI application for user evidence — Phase 3 of Mode 2.

Endpoints:
  POST  /api/user-evidence/submissions/{submission_id}/documents
        Upload one or more PDFs for a submission. Returns ingestion stats.

  GET   /api/user-evidence/submissions/{submission_id}/documents
        List all ingested documents for a submission.

  GET   /api/user-evidence/submissions/{submission_id}/search?query=...&top_k=5
        Vector search within a specific submission.

  GET   /api/user-evidence/search?query=...&top_k=5
        Vector search across all user evidence.

  GET   /api/user-evidence/submissions/{submission_id}/validate
        Ingestion validation report for a submission.

  GET   /api/user-evidence/health
        Liveness probe.
"""
from __future__ import annotations

import logging
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from official_evidence.embeddings import EmbeddingProvider

from .config import user_settings
from .ingestion import ingest_user_pdf
from .repository import UserRepository
from .retrieval import search_user_ctd

logger = logging.getLogger(__name__)

app = FastAPI(title="Mode 2 User Evidence API", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_repository = UserRepository(user_settings)


@app.exception_handler(RequestValidationError)
async def _validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    logger.error("Validation error %s %s — %s", request.method, request.url.path, exc.errors())
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


@app.on_event("startup")
def _startup() -> None:
    _repository.ensure_indexes()
    logger.info(
        "User Evidence API ready — db=%s collection=%s vector_index=%s",
        user_settings.database, user_settings.user_ctd_collection, user_settings.vector_index,
    )


# ── Health ───────────────────────────────────────────────────────────────────

@app.get("/api/user-evidence/health")
def health() -> dict:
    return {
        "status": "ok",
        "database": user_settings.database,
        "collection": user_settings.user_ctd_collection,
        "vector_index": user_settings.vector_index,
    }


# ── Upload ───────────────────────────────────────────────────────────────────

@app.post("/api/user-evidence/submissions/{submission_id}/documents")
async def upload_documents(
    submission_id: str,
    files: list[UploadFile] = File(...),
) -> dict:
    """
    Ingest one or more PDFs for a submission.

    - Validates each file is a PDF.
    - Runs duplicate detection before processing.
    - Returns per-file ingestion stats plus a validation summary.
    """
    if not submission_id.strip():
        raise HTTPException(status_code=400, detail="submission_id is required")

    results = []
    for upload in files:
        if not upload.filename or not upload.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"Only PDF files are accepted, got: {upload.filename!r}")

        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(await upload.read())
            tmp_path = Path(tmp.name)

        try:
            result = ingest_user_pdf(tmp_path, submission_id, _repository, user_settings)
            results.append(result)
            if result.get("duplicate"):
                logger.info("Duplicate upload skipped: %s submission=%s", upload.filename, submission_id)
            else:
                logger.info(
                    "Ingestion complete: file=%s submission=%s chunks=%d dims=%d",
                    upload.filename, submission_id,
                    result["ingestion"]["chunks_created"],
                    result["ingestion"]["embedding_dimensions"],
                )
        except Exception as error:
            import traceback
            logger.error(
                "Ingestion failed for %s submission=%s\n%s",
                upload.filename, submission_id, traceback.format_exc(),
            )
            raise HTTPException(status_code=500, detail=str(error)) from error
        finally:
            tmp_path.unlink(missing_ok=True)

    # Validation summary
    counts = _repository.counts(submission_id=submission_id)
    return {
        "submission_id": submission_id,
        "documents": results,
        "validation": {
            "current_chunks": counts["current_chunks"],
            "current_submissions": counts["current_submissions"],
            "embedding_dimensions": user_settings.embedding_dimensions,
            "vector_index": user_settings.vector_index,
        },
    }


# ── List documents ────────────────────────────────────────────────────────────

@app.get("/api/user-evidence/submissions/{submission_id}/documents")
def list_documents(submission_id: str) -> dict:
    docs = _repository.list_submissions(submission_id=submission_id)
    return {"submission_id": submission_id, "documents": docs}


# ── Search ────────────────────────────────────────────────────────────────────

@app.get("/api/user-evidence/submissions/{submission_id}/search")
def search_in_submission(
    submission_id: str,
    query: str = Query(..., min_length=1),
    top_k: int = Query(default=5, ge=1, le=50),
    section_number: str | None = Query(default=None),
) -> dict:
    embedder = EmbeddingProvider(
        user_settings.embedding_model,
        user_settings.embedding_dimensions,
        user_settings.allow_test_embeddings,
    )
    hits = search_user_ctd(
        query, _repository, embedder,
        submission_id=submission_id,
        section_number=section_number,
        top_k=top_k,
    )
    return {"submission_id": submission_id, "query": query, "results": hits}


@app.get("/api/user-evidence/search")
def search_all(
    query: str = Query(..., min_length=1),
    top_k: int = Query(default=5, ge=1, le=50),
) -> dict:
    embedder = EmbeddingProvider(
        user_settings.embedding_model,
        user_settings.embedding_dimensions,
        user_settings.allow_test_embeddings,
    )
    hits = search_user_ctd(query, _repository, embedder, top_k=top_k)
    return {"query": query, "results": hits}


# ── Validation report ─────────────────────────────────────────────────────────

@app.get("/api/user-evidence/submissions/{submission_id}/validate")
def validate_submission(submission_id: str) -> dict:
    counts = _repository.counts(submission_id=submission_id)
    bad_dims = _repository.chunks.count_documents({
        "submission_id": submission_id,
        "is_current": True,
        "embedding_dimensions": {"$ne": 384},
    })
    missing_text = _repository.chunks.count_documents({
        "submission_id": submission_id,
        "is_current": True,
        "$or": [{"text": {"$in": [None, ""]}}, {"text": {"$exists": False}}],
    })
    missing_page = _repository.chunks.count_documents({
        "submission_id": submission_id,
        "is_current": True,
        "$or": [{"source_page": {"$exists": False}}, {"source_page": None}],
    })
    docs = _repository.list_submissions(submission_id=submission_id)
    return {
        "submission_id": submission_id,
        "counts": counts,
        "embeddings_are_384": bad_dims == 0,
        "no_missing_text": missing_text == 0,
        "page_numbers_preserved": missing_page == 0,
        "invalid_embedding_chunks": bad_dims,
        "missing_text_chunks": missing_text,
        "missing_page_chunks": missing_page,
        "documents": [
            {
                "source_file": d.get("source_file"),
                "pages_extracted": d.get("pages_extracted"),
                "sections_detected": d.get("sections_detected"),
                "chunks_created": d.get("chunks_created"),
                "embedding_dimensions": d.get("embedding_dimensions"),
                "ingestion_timestamp": d.get("ingestion_timestamp"),
            }
            for d in docs
        ],
    }
