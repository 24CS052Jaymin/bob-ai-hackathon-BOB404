"""Deterministic scoring from RequirementResult list.

PRESENT      → 100 points
PARTIAL      → 50  points
MISSING      → 0   points
NOT_APPLICABLE → excluded from denominator

Module label mapping from section_number prefix or module field.
"""
from __future__ import annotations

from collections import defaultdict
from typing import Any

from .models import ModuleScore, RequirementResult

# ── Module label map ─────────────────────────────────────────────────────────

_MODULE_LABELS: dict[str, str] = {
    "1": "Administrative and regional information",
    "2": "Common technical document summaries",
    "3": "Quality",
    "4": "Nonclinical study reports",
    "5": "Clinical study reports",
}

_POINT_MAP: dict[str, int] = {
    "PRESENT": 100,
    "PARTIAL": 50,
    "MISSING": 0,
    "NOT_APPLICABLE": -1,   # sentinel — excluded
}


def _module_key(result: RequirementResult) -> str:
    """Return the top-level module number as a string ('1'–'5')."""
    # Prefer the explicit module field if it looks like 'Module 3' or just '3'
    if result.module:
        m = result.module.strip()
        # e.g. 'Module 3' or 'M3' or '3'
        import re
        match = re.search(r"(\d)", m)
        if match:
            return match.group(1)
    # Fall back to section_number prefix
    if result.section_number:
        return result.section_number.split(".")[0]
    return "0"


def calculate_scores(
    results: list[RequirementResult],
) -> tuple[float, list[ModuleScore]]:
    """
    Returns (overall_score, module_scores).

    overall_score ∈ [0, 100] — weighted average across all applicable requirements.
    """
    by_module: dict[str, list[RequirementResult]] = defaultdict(list)
    for r in results:
        by_module[_module_key(r)].append(r)

    module_scores: list[ModuleScore] = []
    total_points = 0
    total_max = 0

    for key in sorted(by_module):
        group = by_module[key]
        pts = 0
        mx = 0
        present = partial = missing = na = 0
        for r in group:
            if r.status == "NOT_APPLICABLE":
                na += 1
                continue
            points = _POINT_MAP.get(r.status, 0)
            pts += points
            mx += 100
            if r.status == "PRESENT":
                present += 1
            elif r.status == "PARTIAL":
                partial += 1
            else:
                missing += 1

        score = (pts / mx * 100) if mx > 0 else 0.0

        # Determine status label
        if mx == 0:
            status = "Not started"
        elif score >= 75:
            status = "Ready"
        else:
            status = "Attention"

        label = _MODULE_LABELS.get(key, f"Module {key}")

        module_scores.append(ModuleScore(
            module=key,
            label=label,
            score=round(score, 1),
            total=len(group),
            present=present,
            partial=partial,
            missing=missing,
            not_applicable=na,
            status=status,
        ))
        total_points += pts
        total_max += mx

    overall = (total_points / total_max * 100) if total_max > 0 else 0.0
    return round(overall, 1), module_scores


def overall_status(score: float) -> str:
    if score >= 80:
        return "Ready"
    if score >= 50:
        return "Attention"
    return "Not started"
