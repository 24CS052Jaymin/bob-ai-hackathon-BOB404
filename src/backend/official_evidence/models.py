from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(slots=True)
class Section:
    number: str | None
    title: str | None
    parent_number: str | None
    heading_level: int | None
    source_heading: str | None


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
    reference_set_id: str
    source_document: dict[str, str | None]
    guideline: str
    source_file: str
    source_file_hash: str
    source_page: int
    page_range: dict[str, int]
    source_heading: str | None
    section_number: str | None
    section_title: str | None
    parent_section: str | None
    module: str | None
    heading_level: int | None
    ctd_sections: list[str]
    relationship_type: str
    text: str
    embedding: list[float]
    embedding_model: str
    embedding_dimensions: int
    pipeline_version: str
    ingestion_timestamp: datetime
    status: str = "active"
    is_current: bool = True

    def mongo_document(self) -> dict[str, Any]:
        return asdict(self)
