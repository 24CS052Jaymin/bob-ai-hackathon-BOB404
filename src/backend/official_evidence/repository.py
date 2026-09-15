from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from pymongo import ASCENDING, MongoClient, UpdateOne
from pymongo.collection import Collection

from .config import Settings


class EvidenceRepository:
    def __init__(self, settings: Settings):
        if not settings.mongodb_uri:
            raise ValueError("MONGODB_URI is required for MongoDB operations.")
        self.settings = settings
        self.client = MongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=10_000)
        self.collection: Collection[dict[str, Any]] = self.client[settings.database][settings.collection]

    def ensure_indexes(self) -> None:
        self.collection.create_index([("document_version_id", ASCENDING), ("chunk_id", ASCENDING)], unique=True)
        self.collection.create_index([("is_current", ASCENDING), ("section_number", ASCENDING)])
        self.collection.create_index([("is_current", ASCENDING), ("guideline", ASCENDING)])

    def active_version_exists(self, source_hash: str) -> bool:
        return self.collection.find_one({"source_file_hash": source_hash, "is_current": True}, {"_id": 1}) is not None

    def replace_version(self, document_id: str, source_hash: str, records: Iterable[dict[str, Any]]) -> int:
        records = list(records)
        if not records:
            return 0
        version_id = records[0]["document_version_id"]
        self.collection.update_many(
            {"document_id": document_id, "is_current": True, "source_file_hash": {"$ne": source_hash}},
            {"$set": {"is_current": False}},
        )
        operations = [
            UpdateOne(
                {"document_version_id": version_id, "chunk_id": record["chunk_id"]},
                {"$set": record},
                upsert=True,
            )
            for record in records
        ]
        return self.collection.bulk_write(operations, ordered=False).upserted_count

    def exact_section(self, section: str, limit: int) -> list[dict[str, Any]]:
        return list(self.collection.find({"is_current": True, "section_number": section}, {"embedding": 0}).limit(limit))

    def exact_title(self, title: str, limit: int) -> list[dict[str, Any]]:
        return list(self.collection.find({"is_current": True, "section_title": {"$regex": f"^{title}$", "$options": "i"}}, {"embedding": 0}).limit(limit))

    def vector_search(self, embedding: list[float], limit: int, filter_: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        filter_clause = {"is_current": True, **(filter_ or {})}
        pipeline = [
            {"$vectorSearch": {"index": self.settings.vector_index, "path": "embedding", "queryVector": embedding, "numCandidates": max(limit * 20, 100), "limit": limit, "filter": filter_clause}},
            {"$project": {"embedding": 0, "score": {"$meta": "vectorSearchScore"}}},
        ]
        return list(self.collection.aggregate(pipeline))

    def close(self) -> None:
        self.client.close()
