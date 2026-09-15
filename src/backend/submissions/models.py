"""Dataclasses for the submissions package.

All models are plain dataclasses (no Pydantic) to match the project style.
`mongo_document()` returns a plain dict suitable for MongoDB upsert.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


# ── Submission record ────────────────────────────────────────────────────────

@dataclass
class SubmissionRecord:
    submission_id: str
    product_name: str
    sponsor: str
    region: str
    submission_type: str
    target_date: str                       # ISO date string e.g. "2026-10-28"
    status: str = "Draft"                  # Draft | Processing | In review | Ready to submit
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)

    def mongo_document(self) -> dict[str, Any]:
        return asdict(self)


# ── Requirement result (per-requirement analysis output) ────────────────────

@dataclass
class RequirementResult:
    requirement_id: str
    module: str
    section_number: str
    section_title: str
    status: str                            # PRESENT | PARTIAL | MISSING | NOT_APPLICABLE
    confidence: float                      # 0.0 – 1.0
    matched_chunk_ids: list[str]
    missing_items: list[str]
    explanation: str
    official_chunk_ids: list[str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


# ── Gap record ───────────────────────────────────────────────────────────────

@dataclass
class GapRecord:
    gap_id: str
    requirement_id: str
    module: str
    section_number: str
    section_title: str
    severity: str                          # CRITICAL | MAJOR | MINOR
    status: str = "Open"                   # Open | In progress | Resolved
    finding: str = ""
    missing_items: list[str] = field(default_factory=list)
    user_evidence_refs: list[str] = field(default_factory=list)
    official_evidence_refs: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


# ── Module score ─────────────────────────────────────────────────────────────

@dataclass
class ModuleScore:
    module: str
    label: str
    score: float
    total: int
    present: int
    partial: int
    missing: int
    not_applicable: int
    status: str                            # Ready | Attention | Not started

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


# ── Submission report (full analysis result) ─────────────────────────────────

@dataclass
class SubmissionReport:
    submission_id: str
    overall_score: float
    overall_status: str                    # Ready | Attention | Not started
    module_scores: list[dict[str, Any]]
    summary: str
    requirements: list[dict[str, Any]]
    gaps: list[dict[str, Any]]
    evidence_stats: dict[str, Any]
    analysis_timestamp: datetime = field(default_factory=utc_now)
    pipeline_version: str = "mode2-official-evidence-v1"

    def mongo_document(self) -> dict[str, Any]:
        return asdict(self)
