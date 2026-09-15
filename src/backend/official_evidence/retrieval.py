from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from .embeddings import Embedder
from .repository import EvidenceRepository

_CTD_IDENTIFIER = re.compile(r"\b[1-5](?:\.\d+){1,5}\b")


@dataclass(slots=True)
class RetrievalResult:
    strategy: str
    passages: list[dict[str, Any]]


class EvidenceRetriever:
    """Returns source passages only; this component makes no compliance determination."""
    def __init__(self, repository: EvidenceRepository, embedder: Embedder):
        self.repository, self.embedder = repository, embedder

    def search(self, query: str, limit: int = 5, filters: dict[str, Any] | None = None) -> RetrievalResult:
        section = _CTD_IDENTIFIER.search(query)
        if section:
            exact = self.repository.exact_section(section.group(0), limit)
            if exact:
                return RetrievalResult("exact_section", exact)
        # A title lookup is intentionally exact. Free-form concepts use semantic search.
        exact_title = self.repository.exact_title(query.strip(), limit)
        if exact_title:
            return RetrievalResult("exact_title", exact_title)
        vector = self.embedder.encode([query])[0]
        return RetrievalResult("semantic", self.repository.vector_search(vector, limit, filters))
