from __future__ import annotations

from typing import Any

from .embeddings import Embedder
from .repository import EvidenceRepository


def validate_collection(repository: EvidenceRepository, max_chunk_chars: int) -> dict[str, Any]:
    collection = repository.collection
    total = collection.count_documents({})
    current = collection.count_documents({"is_current": True})
    invalid_text = collection.count_documents({"$or": [{"text": {"$exists": False}}, {"text": ""}]})
    invalid_dimensions = collection.count_documents({"embedding_dimensions": {"$ne": Embedder.dimensions}})
    oversized = collection.count_documents({"$expr": {"$gt": [{"$strLenCP": "$text"}, max_chunk_chars]}})
    invalid_page = collection.count_documents({"$expr": {"$or": [{"$lt": ["$source_page", 1]}, {"$ne": ["$source_page", "$page_range.start"]}]}})
    missing_provenance = collection.count_documents({"$or": [{"source_file": {"$exists": False}}, {"document_version_id": {"$exists": False}}, {"source_heading": {"$exists": False}}]})
    return {"total_chunks": total, "current_chunks": current, "invalid_text": invalid_text, "invalid_embedding_dimensions": invalid_dimensions, "oversized_chunks": oversized, "invalid_page_references": invalid_page, "missing_provenance": missing_provenance, "valid": all(value == 0 for value in (invalid_text, invalid_dimensions, oversized, invalid_page, missing_provenance))}
