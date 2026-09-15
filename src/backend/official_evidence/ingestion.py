from __future__ import annotations

import hashlib
from pathlib import Path

from .chunking import make_chunks
from .config import Settings
from .embeddings import EmbeddingProvider
from .extraction import detect_sections, extract_pages, structure_with_docling
from .models import utc_now
from .repository import MongoRepository
from .requirements_catalog import build_requirements


from typing import Any


def ingest_pdf(path: Path, repository: MongoRepository, settings: Settings) -> dict[str, Any]:
    file_bytes = path.read_bytes()
    digest = hashlib.sha256(file_bytes).hexdigest()
    document_key = hashlib.sha256(path.stem.lower().encode("utf-8")).hexdigest()[:16]
    document_id = f"doc-{document_key}"
    version_id = f"{document_id}:{digest[:16]}"
    pages = extract_pages(path)
    total_chars = sum(len(p.text) for p in pages)
    raw_sections = detect_sections(pages)
    sections = structure_with_docling(path, pages, raw_sections)
    embedder = EmbeddingProvider(settings.embedding_model, settings.embedding_dimensions, settings.allow_test_embeddings)
    chunks = make_chunks(
        pages,
        sections,
        document_id=document_id,
        document_version_id=version_id,
        source_file=path.name,
        source_file_hash=digest,
        embedding_model=settings.embedding_model,
        embed=embedder,
        pipeline_version=settings.pipeline_version,
    )
    repository.replace_version(digest, version_id, [chunk.mongo_document() for chunk in chunks])
    requirements = build_requirements(chunks)
    repository.upsert_requirements([requirement.mongo_document() for requirement in requirements])

    ctd_sections_found = sorted(list({s.number for s in sections if s.number}))

    return {
        "document_id": document_id,
        "document_version_id": version_id,
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
                "ctd_modules": sorted(list({c.module for c in chunks if c.module})),
                "ctd_sections": ctd_sections_found,
            },
            "phase5_chunks_embeddings": {
                "chunks_created": len(chunks),
                "embedding_model": settings.embedding_model,
                "embedding_dimensions": settings.embedding_dimensions,
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

