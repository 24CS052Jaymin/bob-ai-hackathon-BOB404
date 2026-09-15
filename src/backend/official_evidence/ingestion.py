from __future__ import annotations

import hashlib
import logging
from pathlib import Path
from typing import Any

from .chunking import make_chunks
from .config import Settings
from .embeddings import EmbeddingProvider
from .extraction import detect_sections, extract_pages, structure_with_docling
from .models import utc_now  # noqa: F401 — kept for any future callers
from .repository import MongoRepository
from .requirements_catalog import build_requirements

logger = logging.getLogger(__name__)


def ingest_pdf(path: Path, repository: MongoRepository, settings: Settings) -> dict[str, Any]:
    logger.info("Ingestion started: %s", path.name)

    file_bytes = path.read_bytes()
    digest = hashlib.sha256(file_bytes).hexdigest()
    document_key = hashlib.sha256(path.stem.lower().encode("utf-8")).hexdigest()[:16]
    document_id = f"doc-{document_key}"
    version_id = f"{document_id}:{digest[:16]}"
    # reference_set_id groups all official evidence ingested together in a named set.
    # It defaults to the document_id so each file forms its own set unless overridden.
    reference_set_id = f"official-ctd:{document_key}"

    logger.info("Phase 1 — PDF received: %s (%d bytes, sha256=%s)", path.name, len(file_bytes), digest[:16])

    # Phase 2 — PyMuPDF text & table extraction
    pages = extract_pages(path)
    total_chars = sum(len(p.text) for p in pages)
    total_tables = sum(len(p.tables) for p in pages)
    logger.info(
        "Phase 2 — PyMuPDF: %d pages, %d characters, %d tables extracted.",
        len(pages), total_chars, total_tables,
    )

    # Phase 3 — section detection + Docling structural enrichment
    raw_sections = detect_sections(pages)
    sections = structure_with_docling(path, pages, raw_sections)
    ctd_sections_found = sorted({s.number for s in sections if s.number})
    logger.info(
        "Phase 3 — Document structure: %d sections detected, CTD sections: %s",
        len(sections), ctd_sections_found or "none",
    )

    # Phase 5 — chunking + embeddings
    embedder = EmbeddingProvider(settings.embedding_model, settings.embedding_dimensions, settings.allow_test_embeddings)
    chunks = make_chunks(
        pages,
        sections,
        document_id=document_id,
        document_version_id=version_id,
        reference_set_id=reference_set_id,
        source_file=path.name,
        source_file_hash=digest,
        embedding_model=settings.embedding_model,
        embed=embedder,
        pipeline_version=settings.pipeline_version,
    )
    embedding_dims = chunks[0].embedding_dimensions if chunks else settings.embedding_dimensions
    logger.info(
        "Phase 5 — Chunking + embeddings: %d chunks, model=%s, dims=%d",
        len(chunks), settings.embedding_model, embedding_dims,
    )

    # Phase 6 — MongoDB write
    repository.replace_version(digest, version_id, [chunk.mongo_document() for chunk in chunks])
    requirements = build_requirements(chunks)
    repository.upsert_requirements([requirement.mongo_document() for requirement in requirements])
    logger.info(
        "Phase 6 — MongoDB: %d chunks written, %d requirements upserted, %d linked.",
        len(chunks), len(requirements), sum(bool(item.source_chunk_ids) for item in requirements),
    )

    return {
        "document_id": document_id,
        "document_version_id": version_id,
        "reference_set_id": reference_set_id,
        "filename": path.name,
        "file_size_bytes": len(file_bytes),
        "source_file_hash": digest,
        "pipeline": {
            "phase1_official_pdf": {
                "filename": path.name,
                "file_size_bytes": len(file_bytes),
                "hash": digest,
            },
            "phase2_dual_engine": {
                "pymupdf": {
                    "pages_extracted": len(pages),
                    "total_characters": total_chars,
                    "tables_extracted": total_tables,
                },
                "docling": {
                    "structure_enriched": True,
                    "engine": "PyMuPDF + Docling",
                },
            },
            "phase3_document_structure": {
                "detected_sections_count": len(sections),
                "sections": [{"number": s.number, "title": s.title, "page": s.page} for s in sections[:15]],
            },
            "phase4_ctd_passages": {
                "ctd_modules": sorted({c.module for c in chunks if c.module}),
                "ctd_sections": ctd_sections_found,
            },
            "phase5_chunks_embeddings": {
                "chunks_created": len(chunks),
                "embedding_model": settings.embedding_model,
                "embedding_dimensions": embedding_dims,
            },
            "phase6_mongodb_vector": {
                "database": settings.database,
                "collection": settings.evidence_collection,
                "vector_index": settings.vector_index,
                "requirements_created": len(requirements),
                "requirements_linked": sum(bool(item.source_chunk_ids) for item in requirements),
            },
        },
        "chunks_created": len(chunks),
        "requirements_created": len(requirements),
        "requirements_linked": sum(bool(item.source_chunk_ids) for item in requirements),
    }
