from __future__ import annotations

import logging
from typing import Any
from urllib.parse import urlparse

import dns.resolver
from pymongo import ASCENDING, MongoClient, UpdateOne
from pymongo.errors import ConfigurationError

from .config import Settings

logger = logging.getLogger(__name__)


def _srv_dns_unavailable(uri: str) -> bool:
    if not uri.startswith("mongodb+srv://"):
        return False
    hostname = urlparse(uri).hostname
    if not hostname:
        return True
    try:
        dns.resolver.resolve(f"_mongodb._tcp.{hostname}", "SRV", lifetime=1)
        return False
    except Exception:
        return True


class MongoRepository:
    def __init__(self, settings: Settings) -> None:
        if _srv_dns_unavailable(settings.mongodb_uri):
            logger.warning("MongoDB SRV DNS is unavailable; starting in offline mode.")
            self.client = MongoClient("mongodb://127.0.0.1:27017", connect=False)
            self.db = self.client[settings.database]
            self.chunks = self.db[settings.evidence_collection]
            self.requirements = self.db[settings.requirements_collection]
            self.vector_index = settings.vector_index
            return
        try:
            self.client = MongoClient(
                settings.mongodb_uri,
                serverSelectionTimeoutMS=3000,
                # Atlas replica sets may not have an accessible primary from outside;
                # secondaryPreferred allows reads to succeed from any available member.
                readPreference="secondaryPreferred",
            )
        except ConfigurationError as exc:
            # Do not stop FastAPI if DNS/VPN access to the Atlas SRV record is unavailable.
            logger.warning("MongoDB URI could not be resolved at startup: %s", exc)
            self.client = MongoClient("mongodb://127.0.0.1:27017", connect=False)
        self.db = self.client[settings.database]
        self.chunks = self.db[settings.evidence_collection]
        self.requirements = self.db[settings.requirements_collection]
        self.vector_index = settings.vector_index


    def ensure_indexes(self) -> None:
        # chunk_id is the natural unique key — one row per chunk, period.
        # Drop the old broken compound unique index on (source_file_hash, document_version_id)
        # if it exists: every chunk in a document shares those two values, so that index
        # allowed only one chunk per document and caused a BulkWriteError on every upload.
        try:
            self.chunks.drop_index([("source_file_hash", ASCENDING), ("document_version_id", ASCENDING)])
            logger.info("Dropped legacy compound unique index (source_file_hash, document_version_id).")
        except Exception:  # noqa: BLE001 — index may not exist on a fresh deployment
            pass
        self.chunks.create_index([("chunk_id", ASCENDING)], unique=True)
        self.chunks.create_index([("document_id", ASCENDING), ("is_current", ASCENDING)])
        self.chunks.create_index([("source_file_hash", ASCENDING)])
        self.chunks.create_index([("document_version_id", ASCENDING)])
        self.chunks.create_index([("section_number", ASCENDING), ("is_current", ASCENDING)])
        self.requirements.create_index([("requirement_id", ASCENDING), ("rules_version", ASCENDING)], unique=True)
        try:
            self.chunks.create_search_index({
                "name": self.vector_index,
                "type": "vectorSearch",
                "definition": {
                    "fields": [{
                        "type": "vector",
                        "path": "embedding",
                        "numDimensions": 384,
                        "similarity": "cosine",
                    }]
                },
            })
            logger.info("Vector search index '%s' created.", self.vector_index)
        except Exception as exc:  # noqa: BLE001
            # Atlas Search index already exists, or local MongoDB does not support vectorSearch.
            logger.debug("Vector search index creation skipped: %s", exc)

    def replace_version(self, source_file_hash: str, document_version_id: str, chunks: list[dict[str, Any]]) -> str:
        existing = self.chunks.find_one({"source_file_hash": source_file_hash}, {"document_id": 1})
        document_id = (
            existing["document_id"]
            if existing
            else (chunks[0]["document_id"] if chunks else document_version_id.split(":", 1)[0])
        )
        self.chunks.update_many({"document_id": document_id}, {"$set": {"is_current": False}})
        if chunks:
            self.chunks.bulk_write(
                [UpdateOne({"chunk_id": chunk["chunk_id"]}, {"$set": chunk}, upsert=True) for chunk in chunks]
            )
            logger.info(
                "Replaced version for document_id=%s: %d chunks written (version=%s).",
                document_id, len(chunks), document_version_id,
            )
        return document_id

    def upsert_requirements(self, requirements: list[dict[str, Any]]) -> dict[str, int]:
        """Upsert requirements. Returns counts of inserted/updated/unchanged."""
        if not requirements:
            return {"inserted": 0, "updated": 0}
        inserted = updated = 0
        for item in requirements:
            key = {"requirement_id": item["requirement_id"], "rules_version": item["rules_version"]}
            existing = self.requirements.find_one(key, {"_id": 1})
            self.requirements.update_one(key, {"$set": item}, upsert=True)
            if existing:
                updated += 1
            else:
                inserted += 1
        return {"inserted": inserted, "updated": updated}

    def iter_chunks_by_section(self, current_only: bool = True):
        """Yield all chunks grouped by section_number (sorted), excluding unstructured."""
        query: dict[str, Any] = {"section_number": {"$ne": None}}
        if current_only:
            query["is_current"] = True
        return self.chunks.find(query, {"_id": 0, "embedding": 0}).sort(
            [("section_number", ASCENDING), ("source_page", ASCENDING), ("chunk_position", ASCENDING)]
        )

    def chunks_for_section(self, section_number: str, current_only: bool = True) -> list[dict[str, Any]]:
        query: dict[str, Any] = {"section_number": section_number}
        if current_only:
            query["is_current"] = True
        return list(
            self.chunks.find(query, {"_id": 0, "embedding": 0})
            .sort([("source_page", ASCENDING)])
        )

    def all_section_numbers(self, current_only: bool = True) -> list[str]:
        query: dict[str, Any] = {"section_number": {"$ne": None}}
        if current_only:
            query["is_current"] = True
        return sorted(
            [s for s in self.chunks.distinct("section_number", query) if s],
            key=lambda s: [(int(p), "") if p.isdigit() else (0, p) for p in str(s).replace(".", " ").split()],
        )

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
