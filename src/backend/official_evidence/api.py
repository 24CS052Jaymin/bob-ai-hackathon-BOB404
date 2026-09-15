from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .embeddings import EmbeddingProvider
from .ingestion import ingest_pdf
from .repository import MongoRepository
from .retrieval import section_search, semantic_search
from .validation import validate

app = FastAPI(title="Mode 2 Official Evidence API", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
repository = MongoRepository(settings)


@app.on_event("startup")
def startup() -> None:
    repository.ensure_indexes()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "database": settings.database, "evidence_collection": settings.evidence_collection, "requirements_collection": settings.requirements_collection}


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
            results.append(ingest_pdf(temporary_path, repository, settings))
        except Exception as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
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
