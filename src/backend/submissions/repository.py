"""MongoDB repository for submission metadata and analysis reports.

Uses MONGODB_URI (BOB / Mode2 cluster) — collections: Submissions, SubmissionReports.
Mirrors the pattern of official_evidence/repository.py.
"""
from __future__ import annotations

import logging
from typing import Any
from urllib.parse import urlparse

import dns.resolver
from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.errors import ConfigurationError

from .config import SubmissionSettings

logger = logging.getLogger(__name__)


def _srv_dns_unavailable(uri: str) -> bool:
    """Avoid PyMongo's 20-second SRV DNS timeout when working offline."""
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


class SubmissionRepository:
    def __init__(self, settings: SubmissionSettings) -> None:
        self._memory_mode = False
        self._memory_submissions: dict[str, dict[str, Any]] = {}
        self._memory_reports: dict[str, dict[str, Any]] = {}
        if _srv_dns_unavailable(settings.mongodb_uri):
            self._memory_mode = True
            self.client = self.db = self.submissions = self.reports = None
            logger.warning("MongoDB SRV DNS is unavailable; using temporary in-memory submissions.")
            return
        try:
            self.client = MongoClient(
                settings.mongodb_uri,
                serverSelectionTimeoutMS=3000,
                readPreference="secondaryPreferred",
            )
            self.db = self.client[settings.database]
            self.submissions = self.db[settings.submissions_collection]
            self.reports = self.db[settings.reports_collection]
        except ConfigurationError as exc:
            # A mongodb+srv URI resolves during construction. Keep the local UI
            # usable when DNS/VPN access to Atlas is unavailable.
            self._memory_mode = True
            self.client = self.db = self.submissions = self.reports = None
            logger.warning("MongoDB unavailable; using temporary in-memory submissions: %s", exc)


    # ── Index management ────────────────────────────────────────────────────

    def ensure_indexes(self) -> None:
        if self._memory_mode:
            return
        try:
            self.submissions.create_index([("submission_id", ASCENDING)], unique=True)
            self.submissions.create_index([("status", ASCENDING)])
            self.submissions.create_index([("created_at", DESCENDING)])
            self.reports.create_index([("submission_id", ASCENDING)])
            self.reports.create_index([("analysis_timestamp", DESCENDING)])
            logger.info("Submissions indexes ensured.")
        except Exception as exc:  # noqa: BLE001
            logger.warning("ensure_indexes failed: %s", exc)

    # ── Submission CRUD ──────────────────────────────────────────────────────

    def create_submission(self, doc: dict[str, Any]) -> None:
        """Insert a new submission record. Raises on duplicate submission_id.

        NOTE: insert_one mutates the dict in-place by adding _id.
        We always pass a copy so callers can safely return the original dict.
        """
        if self._memory_mode:
            submission_id = doc["submission_id"]
            if submission_id in self._memory_submissions:
                raise ValueError(f"Submission {submission_id!r} already exists")
            self._memory_submissions[submission_id] = dict(doc)
            return
        self.submissions.insert_one(dict(doc))

    def get_submission(self, submission_id: str) -> dict[str, Any] | None:
        if self._memory_mode:
            doc = self._memory_submissions.get(submission_id)
            return dict(doc) if doc else None
        return self.submissions.find_one({"submission_id": submission_id}, {"_id": 0})

    def list_submissions(self) -> list[dict[str, Any]]:
        if self._memory_mode:
            return sorted(
                (dict(doc) for doc in self._memory_submissions.values()),
                key=lambda doc: doc.get("created_at", ""),
                reverse=True,
            )
        return list(self.submissions.find({}, {"_id": 0}).sort("created_at", DESCENDING))

    def update_submission_status(self, submission_id: str, status: str) -> None:
        from datetime import datetime, timezone
        if self._memory_mode:
            if submission_id in self._memory_submissions:
                self._memory_submissions[submission_id].update({"status": status, "updated_at": datetime.now(timezone.utc)})
            return
        self.submissions.update_one(
            {"submission_id": submission_id},
            {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}},
        )

    def update_submission(self, submission_id: str, fields: dict[str, Any]) -> None:
        from datetime import datetime, timezone
        fields["updated_at"] = datetime.now(timezone.utc)
        if self._memory_mode:
            if submission_id in self._memory_submissions:
                self._memory_submissions[submission_id].update(fields)
            return
        self.submissions.update_one(
            {"submission_id": submission_id},
            {"$set": fields},
        )

    # ── Report CRUD ──────────────────────────────────────────────────────────

    def upsert_report(self, doc: dict[str, Any]) -> None:
        """Upsert by submission_id — always overwrites with the latest analysis."""
        if self._memory_mode:
            self._memory_reports[doc["submission_id"]] = dict(doc)
            return
        self.reports.update_one(
            {"submission_id": doc["submission_id"]},
            {"$set": doc},
            upsert=True,
        )

    def get_report(self, submission_id: str) -> dict[str, Any] | None:
        if self._memory_mode:
            report = self._memory_reports.get(submission_id)
            return dict(report) if report else None
        return self.reports.find_one(
            {"submission_id": submission_id},
            {"_id": 0},
            sort=[("analysis_timestamp", DESCENDING)],  # type: ignore[call-overload]
        )
