from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(slots=True)
class Section:
    number: str | None
    title: str
    parent_section: str | None
    heading_level: int
    source_heading: str
    page: int


@dataclass(slots=True)
class Page:
    number: int
    text: str
    tables: list[str]


@dataclass(slots=True)
class EvidenceChunk:
    chunk_id: str
    document_id: str
    document_version_id: str
    source_file: str
    source_file_hash: str
    source_page: int
    page_range: dict[str, int]
    source_heading: str
    source_section: str
    module: str | None
    section_number: str | None
    section_title: str
    parent_section: str | None
    relationship_type: str
    text: str
    embedding: list[float]
    embedding_model: str
    embedding_dimensions: int
    is_current: bool
    pipeline_version: str
    ingestion_timestamp: datetime

    def mongo_document(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class Requirement:
    requirement_id: str
    module: str
    section_number: str
    section_title: str
    parent_section: str | None
    requirement_text: str
    requirement_type: str
    mandatory_status: str
    applicability: str
    region: str
    source_document: str
    source_section: str
    source_page: int
    source_chunk_ids: list[str]
    official_evidence_refs: list[dict[str, Any]]
    expected_evidence: list[str]
    rules_version: str

    def mongo_document(self) -> dict[str, Any]:
        return asdict(self)
