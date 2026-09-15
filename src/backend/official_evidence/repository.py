from __future__ import annotations

from typing import Any

from pymongo import ASCENDING, MongoClient, UpdateOne

from .config import Settings


class MongoRepository:
    def __init__(self, settings: Settings) -> None:
        self.client = MongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=3000)
        self.db = self.client[settings.database]
        self.chunks = self.db[settings.evidence_collection]
        self.requirements = self.db[settings.requirements_collection]
        self.vector_index = settings.vector_index

    def ensure_indexes(self) -> None:
        self.chunks.create_index([("source_file_hash", ASCENDING), ("document_version_id", ASCENDING)], unique=True)
        self.chunks.create_index([("document_id", ASCENDING), ("is_current", ASCENDING)])
        self.chunks.create_index([("section_number", ASCENDING), ("is_current", ASCENDING)])
        self.chunks.create_index([("chunk_id", ASCENDING)], unique=True)
        self.requirements.create_index([("requirement_id", ASCENDING), ("rules_version", ASCENDING)], unique=True)
        try:
            self.chunks.create_search_index({"name": self.vector_index, "type": "vectorSearch", "definition": {"fields": [{"type": "vector", "path": "embedding", "numDimensions": 384, "similarity": "cosine"}]}})
        except Exception:
            # Atlas may already have the index, or a local Mongo may not support Search indexes.
            pass

    def replace_version(self, source_file_hash: str, document_version_id: str, chunks: list[dict[str, Any]]) -> str:
        existing = self.chunks.find_one({"source_file_hash": source_file_hash}, {"document_id": 1})
        document_id = existing["document_id"] if existing else (chunks[0]["document_id"] if chunks else document_version_id.split(":", 1)[0])
        self.chunks.update_many({"document_id": document_id}, {"$set": {"is_current": False}})
        if chunks:
            self.chunks.bulk_write([UpdateOne({"chunk_id": chunk["chunk_id"]}, {"$set": chunk}, upsert=True) for chunk in chunks])
        return document_id

    def upsert_requirements(self, requirements: list[dict[str, Any]]) -> None:
        if requirements:
            self.requirements.bulk_write([UpdateOne({"requirement_id": item["requirement_id"], "rules_version": item["rules_version"]}, {"$set": item}, upsert=True) for item in requirements])

    def exact_section(self, section: str, current_only: bool = True) -> list[dict[str, Any]]:
        query: dict[str, Any] = {"$or": [{"section_number": section}, {"source_section": section}]}
        if current_only:
            query["is_current"] = True
        return list(self.chunks.find(query, {"_id": 0}).sort("source_page", ASCENDING))

    def semantic(self, vector: list[float], limit: int = 10, current_only: bool = True) -> list[dict[str, Any]]:
        pipeline: list[dict[str, Any]] = [{"$vectorSearch": {"index": self.vector_index, "path": "embedding", "queryVector": vector, "numCandidates": max(limit * 10, 50), "limit": limit, "filter": {"is_current": True} if current_only else {}}}, {"$project": {"_id": 0, "embedding": 0, "score": {"$meta": "vectorSearchScore"}}}]
        return list(self.chunks.aggregate(pipeline))

    def counts(self) -> dict[str, int]:
        return {"documents": len(self.chunks.distinct("document_id")), "versions": len(self.chunks.distinct("document_version_id")), "chunks": self.chunks.count_documents({}), "current_chunks": self.chunks.count_documents({"is_current": True}), "requirements": self.requirements.count_documents({})}
