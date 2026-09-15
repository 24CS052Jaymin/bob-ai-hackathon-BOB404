"""MongoDB repository for user evidence (BOB2 / Mode2v2 / UserCTD)."""
from __future__ import annotations

import logging
from typing import Any
from urllib.parse import urlparse

import dns.resolver
from pymongo import ASCENDING, MongoClient, UpdateOne
from pymongo.errors import ConfigurationError

from .config import UserSettings

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


class UserRepository:
    def __init__(self, settings: UserSettings) -> None:
        if _srv_dns_unavailable(settings.mongodb_uri):
            logger.warning("MongoDB SRV DNS is unavailable; starting in offline mode.")
            self.client = MongoClient("mongodb://127.0.0.1:27017", connect=False)
            self.db = self.client[settings.database]
            self.chunks = self.db[settings.user_ctd_collection]
            self.submissions = self.db[settings.submissions_collection]
            self.vector_index = settings.vector_index
            return
        try:
            self.client = MongoClient(
                settings.mongodb_uri,
                serverSelectionTimeoutMS=3000,
                readPreference="secondaryPreferred",
            )
        except ConfigurationError as exc:
            logger.warning("MongoDB URI could not be resolved at startup: %s", exc)
            self.client = MongoClient("mongodb://127.0.0.1:27017", connect=False)
        self.db = self.client[settings.database]
        self.chunks = self.db[settings.user_ctd_collection]
        self.submissions = self.db[settings.submissions_collection]
        self.vector_index = settings.vector_index


    # ── Index management ────────────────────────────────────────────────────

    def ensure_indexes(self) -> None:
        """Create required indexes. Logs a warning on auth/connection failure instead of crashing."""
        try:
            self.chunks.create_index([("chunk_id", ASCENDING)], unique=True)
            self.chunks.create_index([("document_id", ASCENDING), ("is_current", ASCENDING)])
            self.chunks.create_index([("submission_id", ASCENDING), ("is_current", ASCENDING)])
            self.chunks.create_index([("source_file_hash", ASCENDING)])
            self.chunks.create_index([("document_version_id", ASCENDING)])
            self.chunks.create_index([("section_number", ASCENDING), ("is_current", ASCENDING)])
            self.submissions.create_index(
                [("submission_id", ASCENDING), ("source_file_hash", ASCENDING)], unique=True
            )
            logger.info("UserCTD indexes ensured.")
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "UserCTD ensure_indexes failed — check USER_MONGODB_URI credentials in .env. "
                "Indexes will be created on first successful connection. Error: %s", exc,
            )
            return
        # Atlas vector search index — skipped silently on local MongoDB or auth error
        try:
            self.chunks.create_search_index({
                "name": self.vector_index,
                "type": "vectorSearch",
                "definition": {
                    "fields": [
                        {
                            "type": "vector",
                            "path": "embedding",
                            "numDimensions": 384,
                            "similarity": "cosine",
                        },
                        # Filterable fields required for $vectorSearch pre-filter
                        {"type": "filter", "path": "submission_id"},
                        {"type": "filter", "path": "is_current"},
                        {"type": "filter", "path": "document_id"},
                        {"type": "filter", "path": "section_number"},
                    ]
                },
            })
            logger.info("UserCTD vector search index '%s' created.", self.vector_index)
        except Exception as exc:  # noqa: BLE001
            logger.debug("UserCTD vector search index creation skipped: %s", exc)

    # ── Duplicate detection ──────────────────────────────────────────────────

    def is_duplicate(
        self, submission_id: str, source_file_hash: str, pipeline_version: str | None = None
    ) -> bool:
        """Return True if this exact file is already ingested and current for this submission."""
        query: dict[str, Any] = {
            "submission_id": submission_id, "source_file_hash": source_file_hash, "is_current": True,
        }
        if pipeline_version:
            query["pipeline_version"] = pipeline_version
        return bool(self.submissions.find_one(
            query,
            {"_id": 1},
        ))

    # ── Write ────────────────────────────────────────────────────────────────

    def replace_version(
        self,
        submission_id: str,
        document_id: str,
        source_file_hash: str,
        document_version_id: str,
        chunks: list[dict[str, Any]],
    ) -> None:
        """Mark previous versions as not-current, then upsert all new chunks."""
        # Retire previous chunks for this document within this submission
        self.chunks.update_many(
            {"submission_id": submission_id, "document_id": document_id},
            {"$set": {"is_current": False}},
        )
        if chunks:
            self.chunks.bulk_write(
                [UpdateOne({"chunk_id": c["chunk_id"]}, {"$set": c}, upsert=True) for c in chunks]
            )
        logger.info(
            "UserCTD: wrote %d chunks for document_id=%s submission=%s version=%s",
            len(chunks), document_id, submission_id, document_version_id,
        )

    def upsert_submission(self, record: dict[str, Any]) -> None:
        # Mark any previous submission record for this submission+file as not-current
        self.submissions.update_many(
            {"submission_id": record["submission_id"], "document_id": record["document_id"]},
            {"$set": {"is_current": False}},
        )
        self.submissions.update_one(
            {
                "submission_id": record["submission_id"],
                "source_file_hash": record["source_file_hash"],
            },
            {"$set": record},
            upsert=True,
        )

    # ── Read ─────────────────────────────────────────────────────────────────

    def semantic_search(
        self,
        vector: list[float],
        *,
        submission_id: str | None = None,
        document_id: str | None = None,
        section_number: str | None = None,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        match_filter: dict[str, Any] = {"is_current": True}
        if submission_id:
            match_filter["submission_id"] = submission_id
        if document_id:
            match_filter["document_id"] = document_id
        if section_number:
            match_filter["section_number"] = section_number

        pipeline: list[dict[str, Any]] = [
            {
                "$vectorSearch": {
                    "index": self.vector_index,
                    "path": "embedding",
                    "queryVector": vector,
                    "numCandidates": max(limit * 10, 50),
                    "limit": limit,
                    "filter": match_filter,
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "embedding": 0,
                    "score": {"$meta": "vectorSearchScore"},
                }
            },
        ]
        return list(self.chunks.aggregate(pipeline))

    def current_chunks(self, submission_id: str) -> list[dict[str, Any]]:
        """Load a submission's evidence for deterministic local re-ranking.

        This deliberately does not depend on an Atlas Search index being built
        or available.  Dossiers are modest in size and this is also a useful
        audited fallback when vector search is temporarily unavailable.
        """
        return list(self.chunks.find(
            {"submission_id": submission_id, "is_current": True},
            {"_id": 0},
        ))

    def list_submissions(self, submission_id: str | None = None) -> list[dict[str, Any]]:
        query: dict[str, Any] = {"is_current": True}
        if submission_id:
            query["submission_id"] = submission_id
        return list(self.submissions.find(query, {"_id": 0}).sort("ingestion_timestamp", -1))

    def counts(self, submission_id: str | None = None) -> dict[str, int]:
        base: dict[str, Any] = {}
        if submission_id:
            base["submission_id"] = submission_id
        current = {**base, "is_current": True}
        return {
            "total_chunks": self.chunks.count_documents(base),
            "current_chunks": self.chunks.count_documents(current),
            "total_submissions": self.submissions.count_documents(base),
            "current_submissions": self.submissions.count_documents({**base, "is_current": True}),
        }
