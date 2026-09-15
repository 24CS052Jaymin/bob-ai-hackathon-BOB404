from __future__ import annotations

import hashlib
import logging
import re
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile, status

from .config import Settings
from .embeddings import Embedder
from .ingestion import IngestionService
from .repository import EvidenceRepository

logger = logging.getLogger(__name__)
app = FastAPI(title="Official Regulatory Evidence API", version="1.0.0")


def _safe_filename(filename: str) -> str:
    name = Path(filename).name
    return re.sub(r"[^A-Za-z0-9._-]", "_", name)


def _ingest_saved_pdf(pdf_path: Path) -> None:
    settings = Settings.from_environment()
    repository = EvidenceRepository(settings)
    try:
        repository.ensure_indexes()
        result = IngestionService(settings, repository, Embedder(settings.embedding_model)).ingest_pdf(pdf_path)
        logger.info("Official evidence ingestion complete: %s", result)
    finally:
        repository.close()


@app.post("/api/official-evidence/documents", status_code=status.HTTP_202_ACCEPTED)
async def upload_official_documents(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
) -> dict[str, object]:
    """Accept official PDFs only; this endpoint never accesses user dossier storage."""
    settings = Settings.from_environment()
    settings.pdf_directory.mkdir(parents=True, exist_ok=True)
    accepted: list[dict[str, str]] = []
    for file in files:
        if not file.filename or Path(file.filename).suffix.lower() != ".pdf":
            raise HTTPException(status_code=415, detail="Only PDF files are accepted for official evidence.")
        contents = await file.read()
        if not contents.startswith(b"%PDF"):
            raise HTTPException(status_code=422, detail=f"{file.filename} is not a valid PDF.")
        content_hash = hashlib.sha256(contents).hexdigest()
        destination = settings.pdf_directory / f"{content_hash[:12]}-{_safe_filename(file.filename)}"
        if not destination.exists():
            destination.write_bytes(contents)
        background_tasks.add_task(_ingest_saved_pdf, destination)
        accepted.append({"filename": destination.name, "source_file_hash": content_hash})
    return {"status": "queued", "documents": accepted}
