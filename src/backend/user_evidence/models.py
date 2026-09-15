"""Data models for user-submitted CTD evidence (UserCTD collection)."""
from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(slots=True)
class UserChunk:
    """One section-aware chunk extracted from a user-uploaded dossier PDF."""

    # Identity
    chunk_id: str                    # SHA-256 of (version_id + page + section + position + text)
    document_id: str                 # stable per unique filename stem
    document_version_id: str         # stable per (document_id + sha256 of file bytes)
    submission_id: str               # frontend submission identifier (e.g. "sub-2408")

    # Provenance
    source_file: str                 # original uploaded filename
    source_file_hash: str            # SHA-256 of the uploaded PDF bytes
    source_page: int                 # 1-based page number
    page_range: dict[str, int]       # {"start": N, "end": N}

    # Structure — null when not reliably detected
    source_heading: str              # raw heading line as extracted
    section_number: str | None       # CTD section number if detected (never invented)
    section_title: str               # heading title; "Unstructured" when unknown
    parent_section: str | None       # immediate parent section number
    module: str | None               # "Module N" when section_number starts with 1-5
    content_type: str                # "text" | "table" | "heading"

    # Content
    text: str

    # Embedding
    embedding: list[float]
    embedding_model: str
    embedding_dimensions: int

    # Metadata
    chunk_position: int              # 0-based global position within the document
    pipeline_version: str
    ingestion_timestamp: datetime
    is_current: bool                 # False when superseded by a re-upload

    def mongo_document(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class UserSubmission:
    """Lightweight submission record — one per uploaded dossier."""

    submission_id: str               # from the frontend (e.g. "sub-2408")
    document_id: str
    document_version_id: str
    source_file: str
    source_file_hash: str
    file_size_bytes: int
    pages_extracted: int
    sections_detected: int
    tables_detected: int
    chunks_created: int
    embedding_dimensions: int
    embedding_model: str
    pipeline_version: str
    ingestion_timestamp: datetime
    is_current: bool
    status: str                      # "ok" | "error"
    error_detail: str | None

    def mongo_document(self) -> dict[str, Any]:
        return asdict(self)
