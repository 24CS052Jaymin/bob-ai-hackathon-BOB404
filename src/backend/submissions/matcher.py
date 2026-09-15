"""Requirement matcher — deterministic NLP, no external LLM.

Algorithm per requirement
─────────────────────────
1. Embed the requirement_text using EmbeddingProvider.
2. Vector-search UserCTD (vector_index1) filtered to this submission_id.
3. Compute cosine similarity between the query vector and each returned chunk
   embedding (the pipeline already normalises, so dot-product == cosine sim).
4. Classify PRESENT / PARTIAL / MISSING using:
   - Top similarity score
   - Keyword overlap between requirement text and chunk text
   - Presence of obligation terms (shall, must, should, provide, include, …)
5. Return RequirementResult with matched_chunk_ids, missing_items, explanation.

No OpenAI / Anthropic / watsonx calls are made anywhere in this file.
"""
from __future__ import annotations

import logging
import math
import re
from typing import Any

from .models import RequirementResult

logger = logging.getLogger(__name__)

# ── NLP helpers ──────────────────────────────────────────────────────────────

_STOP_WORDS: frozenset[str] = frozenset(
    "a an the and or but in on at to for of with is are was were be been being "
    "have has had do does did will would could should may might shall not no its "
    "this that these those it he she we you they from by about as into through "
    "during before after above below between each other among both few more most "
    "other some such than then there when where which while who whom whose".split()
)

_OBLIGATION_TERMS: frozenset[str] = frozenset(
    "shall must should provide include contain describe demonstrate show present "
    "submit report document establish confirm identify specify state indicate "
    "assess evaluate justify support address".split()
)


def _tokenize(text: str) -> list[str]:
    """Lowercase, strip punctuation, remove stop words, return content tokens."""
    tokens = re.findall(r"[a-z]{3,}", text.lower())
    return [t for t in tokens if t not in _STOP_WORDS]


def _keyword_overlap(req_tokens: list[str], chunk_text: str) -> float:
    """Fraction of requirement keywords found in the chunk text."""
    if not req_tokens:
        return 0.0
    chunk_lower = chunk_text.lower()
    hits = sum(1 for t in req_tokens if t in chunk_lower)
    return hits / len(req_tokens)


def _obligation_presence(req_tokens: list[str]) -> bool:
    """True if the requirement contains at least one obligation term."""
    return bool(set(req_tokens) & _OBLIGATION_TERMS)


def _dot(a: list[float], b: list[float]) -> float:
    """Dot product (equals cosine similarity for L2-normalised vectors)."""
    return sum(x * y for x, y in zip(a, b))


def _cosine_sim(a: list[float], b: list[float]) -> float:
    """Safe cosine similarity even if vectors are not normalised."""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a)) or 1.0
    norm_b = math.sqrt(x * x for x in b) if False else math.sqrt(sum(x * x for x in b)) or 1.0
    return dot / (norm_a * norm_b)


def _section_match(requirement_section: str, chunk_section: str) -> float:
    """Score a CTD section match without treating a nearby section as proof."""
    required = (requirement_section or "").strip().lower()
    actual = (chunk_section or "").strip().lower()
    if not required or not actual:
        return 0.0
    if required == actual:
        return 1.0
    if actual.startswith(required + ".") or required.startswith(actual + "."):
        return 0.65
    return 0.0


def _local_rank(
    req_vector: list[float], req_tokens: list[str], requirement_section: str, chunks: list[dict[str, Any]], limit: int
) -> list[dict[str, Any]]:
    """Hybrid, in-process ranking used for a dossier's own evidence.

    Atlas vector retrieval remains useful at scale, but analysis must not turn
    into a 0/367 report merely because its remote index is warming up.  We rank
    the submitted chunks directly using the same embeddings plus CTD-section
    and lexical signals, then retain the score shape expected by the classifier.
    """
    ranked: list[dict[str, Any]] = []
    for chunk in chunks:
        vector = chunk.get("embedding") or []
        semantic = _cosine_sim(req_vector, vector) if req_vector and vector else 0.0
        lexical = _keyword_overlap(req_tokens, chunk.get("text", ""))
        section = _section_match(requirement_section, chunk.get("section_number", ""))
        # Section metadata narrows retrieval; semantic/lexical evidence still
        # determines whether the requirement is PRESENT or PARTIAL.
        score = max(0.0, semantic) + lexical * 0.16 + section * 0.08
        ranked.append({**chunk, "score": min(1.0, score)})
    return sorted(ranked, key=lambda chunk: float(chunk["score"]), reverse=True)[:limit]


# ── Status classification ────────────────────────────────────────────────────

# Thresholds calibrated for all-MiniLM-L6-v2 against CTD dossier prose.
# Typical cosine similarity range for requirement↔dossier-chunk: 0.25–0.48.
_THRESHOLD_PRESENT = 0.38   # top cosine sim needed for PRESENT
_THRESHOLD_PARTIAL = 0.22   # top cosine sim needed for PARTIAL
_KEYWORD_BOOST = 0.08       # keyword overlap bonus applied to effective score


def _classify(
    req_tokens: list[str],
    chunks: list[dict[str, Any]],
    req_vectors: list[float],
) -> tuple[str, float, list[str], str]:
    """
    Returns (status, confidence, missing_items, explanation).

    chunks: list of dicts returned by UserRepository.semantic_search;
            each has 'text', 'chunk_id', 'score' (vectorSearchScore).
    """
    if not chunks:
        return (
            "MISSING",
            0.0,
            ["No evidence uploaded for this requirement"],
            "No user evidence chunks were retrieved for this requirement.",
        )

    # Use the pre-computed vectorSearchScore (0–1) from Atlas $vectorSearch
    top_score: float = max(float(c.get("score", 0.0)) for c in chunks)
    top_chunk = max(chunks, key=lambda c: float(c.get("score", 0.0)))
    top_text: str = top_chunk.get("text", "")

    # Keyword overlap bonus
    kw_overlap = _keyword_overlap(req_tokens, top_text)
    effective_score = min(1.0, top_score + kw_overlap * _KEYWORD_BOOST)

    has_obligation = _obligation_presence(req_tokens)

    # PRESENT: strong semantic match OR (decent match + meaningful keyword overlap)
    if effective_score >= _THRESHOLD_PRESENT and (kw_overlap >= 0.15 or top_score >= 0.42):
        status = "PRESENT"
        confidence = min(0.97, effective_score)
        explanation = (
            f"Evidence found with similarity {top_score:.2f} and "
            f"{kw_overlap:.0%} keyword overlap. Requirement appears satisfied."
        )
        missing: list[str] = []
    elif effective_score >= _THRESHOLD_PARTIAL or kw_overlap >= 0.12:
        status = "PARTIAL"
        confidence = effective_score * 0.75
        explanation = (
            f"Partial evidence found (similarity {top_score:.2f}, "
            f"keyword overlap {kw_overlap:.0%}). "
            f"{'Obligation terms present but coverage may be incomplete.' if has_obligation else 'Coverage appears incomplete.'}"
        )
        missing = ["Complete coverage of all requirement sub-items required"]
    else:
        status = "MISSING"
        confidence = 0.0
        explanation = (
            f"Insufficient evidence (similarity {top_score:.2f}, "
            f"keyword overlap {kw_overlap:.0%}). "
            "No substantive content matching this requirement was found."
        )
        missing = [
            "Evidence addressing this requirement must be provided",
            "Upload relevant CTD section documents",
        ]

    return status, confidence, missing, explanation


# ── Public API ───────────────────────────────────────────────────────────────

def match_requirements(
    submission_id: str,
    official_repo: Any,      # official_evidence.repository.MongoRepository
    user_repo: Any,           # user_evidence.repository.UserRepository
    embedder: Any,            # official_evidence.embeddings.EmbeddingProvider
    top_k: int = 5,
) -> list[RequirementResult]:
    """
    For every requirement in CTD_REQUIREMENTS, search UserCTD for evidence
    from this submission and classify coverage deterministically.
    """
    requirements: list[dict[str, Any]] = list(
        official_repo.requirements.find({"is_current": True}, {"_id": 0})
    )
    if not requirements:
        # Fall back to all requirements if is_current flag is not set
        requirements = list(official_repo.requirements.find({}, {"_id": 0}))

    logger.info(
        "match_requirements: submission=%s requirements=%d",
        submission_id, len(requirements),
    )

    # Read evidence once.  Direct local ranking is deterministic and avoids a
    # hard dependency on the Atlas vector index during report generation.
    try:
        local_chunks = user_repo.current_chunks(submission_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not load local evidence for %s: %s", submission_id, exc)
        local_chunks = []

    # Filter to requirements that have text, then batch-embed all at once
    # (one model inference for N requirements instead of N inferences).
    valid_reqs = [
        req for req in requirements
        if (req.get("requirement_text", "") or req.get("section_title", "")).strip()
    ]
    req_texts = [
        req.get("requirement_text", "") or req.get("section_title", "")
        for req in valid_reqs
    ]

    try:
        all_vectors: list[list[float]] = embedder(req_texts)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Batch embedding failed, falling back to empty vectors: %s", exc)
        all_vectors = [[] for _ in valid_reqs]

    results: list[RequirementResult] = []
    for req, req_text, req_vector in zip(valid_reqs, req_texts, all_vectors):
        req_tokens = _tokenize(req_text)

        if local_chunks:
            chunks = _local_rank(
                req_vector, req_tokens, req.get("section_number", ""), local_chunks, top_k
            )
        else:
            # Compatibility fallback for repositories created before
            # ``current_chunks`` existed.
            try:
                chunks = user_repo.semantic_search(req_vector, submission_id=submission_id, limit=top_k)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Search failed for req %s: %s", req.get("requirement_id"), exc)
                chunks = []
                req_vector = []

        status, confidence, missing_items, explanation = _classify(
            req_tokens, chunks, req_vector
        )

        matched_ids = [c.get("chunk_id", "") for c in chunks if float(c.get("score", 0)) >= _THRESHOLD_PARTIAL]
        official_ids: list[str] = req.get("source_chunk_ids", []) or []

        results.append(RequirementResult(
            requirement_id=req.get("requirement_id", ""),
            module=req.get("module", ""),
            section_number=req.get("section_number", ""),
            section_title=req.get("section_title", ""),
            status=status,
            confidence=confidence,
            matched_chunk_ids=matched_ids,
            missing_items=missing_items,
            explanation=explanation,
            official_chunk_ids=official_ids,
        ))

    logger.info(
        "match_requirements: done — PRESENT=%d PARTIAL=%d MISSING=%d",
        sum(1 for r in results if r.status == "PRESENT"),
        sum(1 for r in results if r.status == "PARTIAL"),
        sum(1 for r in results if r.status == "MISSING"),
    )
    return results
