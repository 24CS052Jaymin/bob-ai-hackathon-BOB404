"""Gap advisor — deterministic NLP recommendation engine.

generate_recommendation(gap, requirement, official_chunks, user_chunks) → dict

Builds a structured recommendation purely from:
- The gap record (severity, section, missing items)
- The requirement text (what is needed)
- Official CTD chunks (what the reference says)
- User evidence chunks (what was found so far)

No external LLM API is used.
"""
from __future__ import annotations

import re
from typing import Any


# ── Sentence extraction helpers ──────────────────────────────────────────────

def _sentences(text: str, max_sentences: int = 3) -> list[str]:
    """Return up to max_sentences from text, each stripped."""
    raw = re.split(r"(?<=[.!?])\s+", text.strip())
    return [s.strip() for s in raw if len(s.strip()) > 20][:max_sentences]


def _truncate(text: str, max_chars: int = 400) -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rsplit(" ", 1)[0] + "…"


# ── Action verb library ──────────────────────────────────────────────────────

_SECTION_ACTIONS: dict[str, str] = {
    "1": "Prepare and submit the required administrative forms and regional information.",
    "2": "Provide a complete CTD summary section including quality overall summary and clinical/nonclinical overviews.",
    "3": "Submit quality documentation covering drug substance, drug product, and stability data.",
    "4": "Include nonclinical pharmacology, pharmacokinetics, and toxicology study reports.",
    "5": "Provide clinical study reports including Phase I, II, and III trial data.",
}


def _action_for_module(module_key: str, req_text: str) -> str:
    base = _SECTION_ACTIONS.get(module_key, "Provide the required evidence as described in the ICH M4 guideline.")
    # Personalise with first obligation phrase from requirement text
    obligation_match = re.search(
        r"(shall|must|should)\s+([a-z][^.]{10,60})\.", req_text, re.IGNORECASE
    )
    if obligation_match:
        return f"The submission {obligation_match.group(0).strip()}"
    return base


# ── Public API ───────────────────────────────────────────────────────────────

def generate_recommendation(
    gap: dict[str, Any],
    requirement: dict[str, Any],
    official_chunks: list[dict[str, Any]],
    user_chunks: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Returns a structured recommendation dict:
    {
        "problem": str,
        "what_is_missing": list[str],
        "recommended_action": str,
        "why_it_matters": str,
        "reference_evidence": str,
        "current_evidence_summary": str,
    }
    """
    req_text: str = requirement.get("requirement_text", "") or requirement.get("section_title", "")
    section = gap.get("section_number", "")
    section_title = gap.get("section_title", gap.get("title", ""))
    severity = gap.get("severity", "MAJOR")
    missing_items: list[str] = gap.get("missing_items", [])
    module_key = str(gap.get("module", "")).replace("Module ", "").strip()[:1] or "0"

    # Problem statement
    problem = (
        f"Section {section} — {section_title} — is {severity.lower()} gap. "
        f"The requirement states: {_truncate(req_text, 250)}"
    )

    # What is missing
    what_missing = missing_items if missing_items else [
        f"Evidence for section {section} ({section_title}) is absent or insufficient."
    ]

    # Recommended action
    action = _action_for_module(module_key, req_text)

    # Why it matters — pull first sentences from official chunks
    why_parts: list[str] = []
    for chunk in official_chunks[:2]:
        chunk_text = chunk.get("text", "")
        sentences = _sentences(chunk_text, 2)
        why_parts.extend(sentences)
    why_it_matters = (
        " ".join(why_parts[:4]) if why_parts
        else (
            f"This requirement is classified as {severity.lower()} severity under ICH M4. "
            "Missing this section may result in a Refuse to File or a Major Amendment request from the agency."
        )
    )

    # Reference evidence summary
    if official_chunks:
        ref_chunk = official_chunks[0]
        ref_text = _truncate(ref_chunk.get("text", ""), 300)
        ref_section = ref_chunk.get("section_number", ref_chunk.get("source_section", section))
        reference_evidence = f"Official CTD section {ref_section}: {ref_text}"
    else:
        reference_evidence = f"See ICH M4 section {section} for the full requirement specification."

    # Current evidence summary
    if user_chunks:
        top = user_chunks[0]
        current_summary = (
            f"Closest uploaded evidence (similarity {float(top.get('score', 0)):.2f}): "
            f"{_truncate(top.get('text', ''), 200)}"
        )
    else:
        current_summary = "No matching evidence chunks were found in the uploaded dossier documents."

    return {
        "problem": problem,
        "what_is_missing": what_missing,
        "recommended_action": action,
        "why_it_matters": _truncate(why_it_matters, 500),
        "reference_evidence": reference_evidence,
        "current_evidence_summary": current_summary,
    }
