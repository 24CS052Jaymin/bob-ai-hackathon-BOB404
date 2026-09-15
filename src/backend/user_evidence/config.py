"""Settings for the user_evidence package.

Loaded from the same .env file as the official_evidence package.
All user-evidence settings are prefixed USER_ to avoid collision.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


@dataclass(frozen=True)
class UserSettings:
    # MongoDB – separate project/database from official evidence
    mongodb_uri: str = os.getenv("USER_MONGODB_URI", os.getenv("MONGODB_URI", "mongodb://localhost:27017"))
    database: str = os.getenv("USER_MONGODB_DB_NAME", os.getenv("USER_MONGODB_DATABASE", "Mode2v2"))
    user_ctd_collection: str = "UserCTD"
    submissions_collection: str = "UserSubmissions"
    vector_index: str = "vector_index1"

    # Embedding — same model as official evidence
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    embedding_dimensions: int = 384

    # Pipeline
    # v2 chunks at the actual heading boundaries rather than assigning every
    # chunk on a page to its last heading.  This also makes an existing upload
    # eligible for one safe re-ingestion after the pipeline upgrade.
    pipeline_version: str = os.getenv("USER_PIPELINE_VERSION", "mode2-user-evidence-v2")
    allow_test_embeddings: bool = os.getenv("ALLOW_DETERMINISTIC_EMBEDDINGS", "false").lower() == "true"


user_settings = UserSettings()
