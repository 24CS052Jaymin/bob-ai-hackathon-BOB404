from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[1] / ".env")


@dataclass(frozen=True)
class Settings:
    mongodb_uri: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    # Accept the project .env spelling as well as the earlier DATABASE name.
    database: str = os.getenv("MONGODB_DB_NAME", os.getenv("MONGODB_DATABASE", "Mode2"))
    evidence_collection: str = "CTD"
    requirements_collection: str = "CTD_REQUIREMENTS"
    vector_index: str = "vector_index"
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    embedding_dimensions: int = 384
    pipeline_version: str = os.getenv("PIPELINE_VERSION", "mode2-official-evidence-v1")
    allow_test_embeddings: bool = os.getenv("ALLOW_DETERMINISTIC_EMBEDDINGS", "false").lower() == "true"


settings = Settings()
