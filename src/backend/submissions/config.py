"""Settings for the submissions package.

Uses MONGODB_URI (BOB cluster / Mode2 DB) for submission metadata + reports.
Mirrors the pattern of official_evidence/config.py.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


@dataclass(frozen=True)
class SubmissionSettings:
    # Primary MongoDB cluster (BOB / Mode2) — same as official_evidence
    mongodb_uri: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    database: str = os.getenv("MONGODB_DATABASE", "Mode2")
    submissions_collection: str = "Submissions"
    reports_collection: str = "SubmissionReports"

    # Embedding — same model as other packages
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    embedding_dimensions: int = 384
    allow_test_embeddings: bool = os.getenv("ALLOW_DETERMINISTIC_EMBEDDINGS", "false").lower() == "true"

    # Pipeline
    pipeline_version: str = os.getenv("PIPELINE_VERSION", "mode2-official-evidence-v1")


submission_settings = SubmissionSettings()
