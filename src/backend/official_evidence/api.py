from __future__ import annotations

import logging
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .embeddings import EmbeddingProvider
from .ingestion import ingest_pdf
from .repository import MongoRepository
from .retrieval import section_search, semantic_search
from .validation import validate

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s  %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Mode 2 Official Evidence API", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
repository = MongoRepository(settings)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Log FastAPI/Pydantic request-validation failures so the 422 detail is always visible in the server log."""
    logger.error(
        "Request validation error on %s %s — errors: %s",
        request.method, request.url.path, exc.errors(),
    )
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


@app.on_event("startup")
def startup() -> None:
    # Index creation requires an Atlas primary. A temporary replica-set
    # failover must not prevent the read-only API from starting.
    try:
        repository.ensure_indexes()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Official Evidence index setup skipped: %s", exc)
    logger.info(
        "Official Evidence API ready — database=%s collection=%s vector_index=%s",
        settings.database, settings.evidence_collection, settings.vector_index,
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "database": settings.database,
        "evidence_collection": settings.evidence_collection,
        "requirements_collection": settings.requirements_collection,
    }


@app.post("/api/official-evidence/documents")
async def upload_documents(files: list[UploadFile] = File(...)) -> dict:
    results = []
    for upload in files:
        if not upload.filename or not upload.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are accepted")
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temporary:
            temporary.write(await upload.read())
            temporary_path = Path(temporary.name)
        try:
            result = ingest_pdf(temporary_path, repository, settings)
            results.append(result)
            logger.info(
                "Ingestion complete: file=%s chunks=%d dims=%d",
                upload.filename,
                result["chunks_created"],
                result["pipeline"]["phase5_chunks_embeddings"]["embedding_dimensions"],
            )
        except Exception as error:
            import traceback
            tb = traceback.format_exc()
            logger.error(
                "Ingestion failed for %s\n%s", upload.filename, tb,
            )
            raise HTTPException(status_code=500, detail=str(error)) from error
        finally:
            temporary_path.unlink(missing_ok=True)
    return {"documents": results}


@app.get("/api/official-evidence/sections/{section}")
def get_section(section: str) -> dict:
    return {"section": section, "chunks": section_search(repository, section)}


@app.get("/api/official-evidence/search")
def search_evidence(query: str, limit: int = 10) -> dict:
    if not query.strip():
        raise HTTPException(status_code=400, detail="query is required")
    embedder = EmbeddingProvider(settings.embedding_model, settings.embedding_dimensions, settings.allow_test_embeddings)
    return {"query": query, "chunks": semantic_search(repository, embedder, query, max(1, min(limit, 50)))}


@app.get("/api/official-evidence/requirements")
def get_requirements() -> list[dict]:
    return list(repository.requirements.find({}, {"_id": 0}).sort("requirement_id", 1))


@app.get("/api/official-evidence/validation")
def get_validation() -> dict:
    return validate(repository)
