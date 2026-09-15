from __future__ import annotations

from .embeddings import EmbeddingProvider
from .repository import MongoRepository


def semantic_search(repository: MongoRepository, embedder: EmbeddingProvider, query: str, limit: int = 10) -> list[dict]:
    return repository.semantic(embedder([query])[0], limit=limit)


def section_search(repository: MongoRepository, section: str) -> list[dict]:
    return repository.exact_section(section)
