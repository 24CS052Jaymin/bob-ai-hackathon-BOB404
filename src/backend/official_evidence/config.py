from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


@dataclass(frozen=True, slots=True)
class Settings:
    mongodb_uri: str
    database: str
    collection: str
    vector_index: str
    pdf_directory: Path
    embedding_model: str
    chunk_max_chars: int
    chunk_overlap_chars: int
    pipeline_version: str

    @classmethod
    def from_environment(cls) -> "Settings":
        load_dotenv()
        backend_root = Path(__file__).resolve().parents[1]
        pdf_value = os.getenv("OFFICIAL_PDFS_DIR", "../../official_pdfs")
        pdf_directory = Path(pdf_value)
        if not pdf_directory.is_absolute():
            pdf_directory = (backend_root / pdf_directory).resolve()
        settings = cls(
            mongodb_uri=os.getenv("MONGODB_URI", ""),
            database=os.getenv("MONGODB_DATABASE", "Mode2"),
            collection=os.getenv("MONGODB_COLLECTION", "CTD"),
            vector_index=os.getenv("MONGODB_VECTOR_INDEX", "vector_index"),
            pdf_directory=pdf_directory,
            embedding_model=os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"),
            chunk_max_chars=int(os.getenv("CHUNK_MAX_CHARS", "2800")),
            chunk_overlap_chars=int(os.getenv("CHUNK_OVERLAP_CHARS", "250")),
            pipeline_version=os.getenv("PIPELINE_VERSION", "official-evidence-v1"),
        )
        if settings.chunk_max_chars < 400 or not 0 <= settings.chunk_overlap_chars < settings.chunk_max_chars:
            raise ValueError("Chunk settings must have max >= 400 and overlap in [0, max).")
        return settings
