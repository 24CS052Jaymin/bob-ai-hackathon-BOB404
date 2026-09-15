"""Vector and section search for user evidence."""
from __future__ import annotations

from typing import Any

from official_evidence.embeddings import EmbeddingProvider

from .repository import UserRepository


def search_user_ctd(
    query: str,
    repository: UserRepository,
    embedder: EmbeddingProvider,
    *,
    submission_id: str | None = None,
    document_id: str | None = None,
    section_number: str | None = None,
    top_k: int = 5,
) -> list[dict[str, Any]]:
    """
    Embed query, search vector_index1 in UserCTD, return ranked results.

    Each result contains:
        chunk_id, document_id, submission_id,
        source_file (document), section_number (section), source_page (page),
        section_title, text, score (similarity_score)
    """
    vector = embedder([query])[0]
    raw = repository.semantic_search(
        vector,
        submission_id=submission_id,
        document_id=document_id,
        section_number=section_number,
        limit=max(1, min(top_k, 50)),
    )
    return [
        {
            "chunk_id": hit.get("chunk_id"),
            "document_id": hit.get("document_id"),
            "submission_id": hit.get("submission_id"),
            "document": hit.get("source_file"),
            "section": hit.get("section_number"),
            "section_title": hit.get("section_title"),
            "page": hit.get("source_page"),
            "text": hit.get("text"),
            "similarity_score": hit.get("score"),
        }
        for hit in raw
    ]
