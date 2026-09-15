"""Orchestrates the full analysis pipeline for a single submission.

run_analysis(submission_id, ...) → SubmissionReport
  1. Validate submission exists
  2. Run matcher.match_requirements()
  3. Run scorer.calculate_scores()
  4. Build gap register
  5. Build deterministic summary text (no LLM API)
  6. Build evidence_stats
  7. Upsert SubmissionReport to MongoDB
  8. Return report
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from .models import GapRecord, RequirementResult, SubmissionReport, utc_now
from .matcher import match_requirements
from .scorer import calculate_scores, overall_status

logger = logging.getLogger(__name__)

# ── Gap severity heuristic ───────────────────────────────────────────────────

def _gap_severity(result: RequirementResult, mandatory_status: str = "") -> str:
    """
    MISSING → CRITICAL if mandatory_status contains 'mandatory' or 'required',
              else MAJOR.
    PARTIAL → MINOR if mandatory_status is 'recommended', else MAJOR.
    """
    ms = mandatory_status.lower()
    if result.status == "MISSING":
        if "mandatory" in ms or "required" in ms or ms == "":
            return "CRITICAL"
        return "MAJOR"
    # PARTIAL
    if "recommended" in ms:
        return "MINOR"
    return "MAJOR"


def _build_gaps(
    results: list[RequirementResult],
    requirements_by_id: dict[str, dict[str, Any]],
) -> list[GapRecord]:
    gaps: list[GapRecord] = []
    for r in results:
        if r.status not in ("MISSING", "PARTIAL"):
            continue
        req_meta = requirements_by_id.get(r.requirement_id, {})
        mandatory_status = req_meta.get("mandatory_status", "")
        severity = _gap_severity(r, mandatory_status)
        gaps.append(GapRecord(
            gap_id=f"gap-{uuid.uuid4().hex[:8]}",
            requirement_id=r.requirement_id,
            module=f"Module {r.module}" if r.module and not r.module.lower().startswith("module") else r.module,
            section_number=r.section_number,
            section_title=r.section_title,
            severity=severity,
            status="Open",
            finding=r.explanation,
            missing_items=r.missing_items,
            user_evidence_refs=r.matched_chunk_ids,
            official_evidence_refs=r.official_chunk_ids,
        ))
    return gaps


def _build_summary(
    overall_score: float,
    results: list[RequirementResult],
    gaps: list[GapRecord],
) -> str:
    present = sum(1 for r in results if r.status == "PRESENT")
    partial = sum(1 for r in results if r.status == "PARTIAL")
    missing = sum(1 for r in results if r.status == "MISSING")
    critical = sum(1 for g in gaps if g.severity == "CRITICAL")
    major = sum(1 for g in gaps if g.severity == "MAJOR")

    readiness_label = "good shape" if overall_score >= 75 else ("moderate" if overall_score >= 50 else "early stage")

    lines = [
        f"Overall readiness score: {overall_score:.0f}/100 — {readiness_label}.",
        f"{present} of {len(results)} requirements are fully satisfied; "
        f"{partial} have partial coverage; {missing} are missing evidence.",
    ]
    if critical > 0:
        lines.append(
            f"{critical} critical gap{'s' if critical != 1 else ''} require immediate attention before submission."
        )
    if major > 0:
        lines.append(
            f"{major} major gap{'s' if major != 1 else ''} should be addressed to improve readiness."
        )
    if overall_score >= 80:
        lines.append("The dossier is approaching filing readiness. Close remaining gaps to proceed.")
    elif overall_score >= 50:
        lines.append(
            "The dossier has reasonable coverage. Focus on missing critical sections to increase the score."
        )
    else:
        lines.append(
            "Significant evidence is missing. Upload the relevant CTD module documents and re-run the analysis."
        )
    return " ".join(lines)


def _build_evidence_stats(
    results: list[RequirementResult],
    user_repo: Any,
    submission_id: str,
) -> dict[str, Any]:
    try:
        counts = user_repo.counts(submission_id=submission_id)
    except Exception:  # noqa: BLE001
        counts = {}

    total_matched = sum(len(r.matched_chunk_ids) for r in results)
    return {
        "total_chunks": counts.get("current_chunks", 0),
        "total_documents": counts.get("current_submissions", 0),
        "total_matched_chunks": total_matched,
        "requirements_with_evidence": sum(1 for r in results if r.matched_chunk_ids),
    }


# ── Public API ───────────────────────────────────────────────────────────────

def run_analysis(
    submission_id: str,
    sub_repo: Any,       # SubmissionRepository
    official_repo: Any,  # official_evidence.repository.MongoRepository
    user_repo: Any,      # user_evidence.repository.UserRepository
    embedder: Any,       # EmbeddingProvider
    pipeline_version: str = "mode2-official-evidence-v1",
) -> SubmissionReport:
    logger.info("run_analysis: starting for submission=%s", submission_id)

    # 1. Load submission
    submission = sub_repo.get_submission(submission_id)
    if not submission:
        raise ValueError(f"Submission {submission_id!r} not found")

    # Mark as processing
    sub_repo.update_submission_status(submission_id, "Processing")

    try:
        # 2. Match requirements
        results: list[RequirementResult] = match_requirements(
            submission_id, official_repo, user_repo, embedder
        )

        # 3. Score
        overall_score, module_scores = calculate_scores(results)
        o_status = overall_status(overall_score)

        # 4. Build gap register
        reqs_by_id: dict[str, dict[str, Any]] = {
            r.get("requirement_id", ""): r
            for r in official_repo.requirements.find({}, {"_id": 0})
        }
        gaps = _build_gaps(results, reqs_by_id)

        # 5. Summary text
        summary = _build_summary(overall_score, results, gaps)

        # 6. Evidence stats
        evidence_stats = _build_evidence_stats(results, user_repo, submission_id)

        # 7. Build & upsert report
        report = SubmissionReport(
            submission_id=submission_id,
            overall_score=overall_score,
            overall_status=o_status,
            module_scores=[ms.to_dict() for ms in module_scores],
            summary=summary,
            requirements=[r.to_dict() for r in results],
            gaps=[g.to_dict() for g in gaps],
            evidence_stats=evidence_stats,
            analysis_timestamp=utc_now(),
            pipeline_version=pipeline_version,
        )
        sub_repo.upsert_report(report.mongo_document())

        # Update submission status
        critical_count = sum(1 for g in gaps if g.severity == "CRITICAL")
        new_status = "Ready to submit" if overall_score >= 80 and critical_count == 0 else "In review"
        sub_repo.update_submission(submission_id, {
            "status": new_status,
            "readiness_score": overall_score,
            "critical_gaps": critical_count,
        })

        logger.info(
            "run_analysis: done submission=%s score=%.1f status=%s gaps=%d",
            submission_id, overall_score, o_status, len(gaps),
        )
        return report

    except Exception:
        sub_repo.update_submission_status(submission_id, "In review")
        raise
