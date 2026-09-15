from __future__ import annotations

from typing import Any

from .repository import MongoRepository


def validate(repository: MongoRepository) -> dict[str, Any]:
    counts = repository.counts()
    bad_dimensions = repository.chunks.count_documents({"embedding_dimensions": {"$ne": 384}})
    missing_provenance = repository.chunks.count_documents({"$or": [{"source_file": {"$in": [None, ""]}}, {"source_page": {"$exists": False}}, {"source_section": {"$in": [None, ""]}}]})
    unlinked = repository.requirements.count_documents({"$or": [{"source_chunk_ids": {"$exists": False}}, {"source_chunk_ids": {"$size": 0}}]})
    return {"counts": counts, "embeddings_are_384": bad_dimensions == 0, "provenance_complete": missing_provenance == 0, "requirements_linked_to_evidence": unlinked == 0, "invalid_embedding_documents": bad_dimensions, "missing_provenance_documents": missing_provenance, "unlinked_requirements": unlinked}
