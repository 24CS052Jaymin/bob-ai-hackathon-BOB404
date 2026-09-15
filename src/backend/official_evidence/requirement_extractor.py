"""
Requirement Extraction Pipeline
================================
Reads official evidence chunks from Mode2.CTD and extracts structured
regulatory requirements into Mode2.CTD_REQUIREMENTS.

Design:
  - Deterministic parsing for: module, section_number, section_title,
    parent_section, requirement_id
  - NLP sentence extraction for: requirement_text, expected_evidence,
    applicability, requirement_type  (no external LLM — uses regex +
    obligation-sentence detection on actual source text)

Every requirement produced is grounded to at least one source_chunk_id
from Mode2.CTD.  Requirements with no substantive obligation text are
skipped (headings-only sections).

Run via:
    python -m official_evidence extract_requirements
"""

from __future__ import annotations

import hashlib
import logging
import re
from collections import defaultdict
from datetime import datetime, timezone
from itertools import islice
from typing import Any

from .config import settings
from .models import Requirement
from .repository import MongoRepository

logger = logging.getLogger(__name__)

RULES_VERSION = "ctd-extracted-v1"

# ---------------------------------------------------------------------------
# CTD module / section classification
# ---------------------------------------------------------------------------

# ICH CTD section-to-module mapping for top-level numeric prefixes
_MODULE_MAP = {
    "1": ("Module 1", "Regional administrative information"),
    "2": ("Module 2", "CTD Summaries"),
    "3": ("Module 3", "Quality"),
    "4": ("Module 4", "Nonclinical Study Reports"),
    "5": ("Module 5", "Clinical Study Reports"),
}

# Known section titles from ICH M4 family — used to normalise noisy PDF titles
_ICH_SECTION_TITLES: dict[str, str] = {
    "1.1": "Comprehensive Table of Contents",
    "1.2": "Application Form",
    "1.3": "Product Information",
    "2.1": "CTD Table of Contents",
    "2.2": "Introduction",
    "2.3": "Quality Overall Summary",
    "2.4": "Nonclinical Overview",
    "2.5": "Clinical Overview",
    "2.6": "Nonclinical Written and Tabulated Summaries",
    "2.7": "Clinical Summary",
    "2.7.1": "Summary of Biopharmaceutic Studies and Associated Analytical Methods",
    "2.7.2": "Summary of Clinical Pharmacology Studies",
    "2.7.3": "Summary of Clinical Efficacy",
    "2.7.4": "Summary of Clinical Safety",
    "2.7.5": "References",
    "2.7.6": "Synopses of Individual Studies",
    "3.1": "Table of Contents of Module 3",
    "3.2": "Body of Data",
    "3.2.S": "Drug Substance",
    "3.2.S.1": "General Information",
    "3.2.S.2": "Manufacture",
    "3.2.S.3": "Characterisation",
    "3.2.S.4": "Control of Drug Substance",
    "3.2.S.5": "Reference Standards or Materials",
    "3.2.S.6": "Container Closure System",
    "3.2.S.7": "Stability",
    "3.2.P": "Drug Product",
    "3.2.P.1": "Description and Composition of the Drug Product",
    "3.2.P.2": "Pharmaceutical Development",
    "3.2.P.3": "Manufacture",
    "3.2.P.4": "Control of Excipients",
    "3.2.P.5": "Control of Drug Product",
    "3.2.P.6": "Reference Standards or Materials",
    "3.2.P.7": "Container Closure System",
    "3.2.P.8": "Stability",
    "3.2.A": "Appendices",
    "3.2.R": "Regional Information",
    "4.1": "Table of Contents of Module 4",
    "4.2": "Study Reports",
    "4.2.1": "Pharmacology",
    "4.2.1.1": "Primary Pharmacodynamics",
    "4.2.1.2": "Secondary Pharmacodynamics",
    "4.2.1.3": "Safety Pharmacology",
    "4.2.1.4": "Pharmacodynamic Drug Interactions",
    "4.2.2": "Pharmacokinetics",
    "4.2.3": "Toxicology",
    "4.3": "Literature References",
    "5.1": "Table of Contents of Module 5",
    "5.2": "Tabular Listing of All Clinical Studies",
    "5.3": "Clinical Study Reports",
    "5.3.1": "Reports of Biopharmaceutic Studies",
    "5.3.2": "Reports of Studies Pertinent to Pharmacokinetics",
    "5.3.3": "Reports of Human Pharmacokinetic Studies",
    "5.3.4": "Reports of Human Pharmacodynamic Studies",
    "5.3.5": "Reports of Efficacy and Safety Studies",
    "5.3.6": "Reports of Post-marketing Experience",
    "5.3.7": "Case Report Forms and Individual Patient Listings",
    "5.4": "Literature References",
}

# ---------------------------------------------------------------------------
# NLP patterns — obligation-sentence detection
# ---------------------------------------------------------------------------

# Patterns that signal a regulatory obligation sentence
_OBLIGATION_RE = re.compile(
    r"\b("
    r"shall\b|should\b|must\b|is required|are required|"
    r"(?:should|shall|must)\s+be\s+(?:provided|included|submitted|described|"
    r"discussed|presented|reported|identified|justified|established|determined)|"
    r"(?:provide|include|submit|describe|present|report|identify|justify|establish|"
    r"demonstrate|document|specify|summarize|discuss|address|contain|list)\b"
    r")",
    re.IGNORECASE,
)

# Patterns that signal supporting-evidence expectations
_EVIDENCE_SIGNALS = [
    re.compile(r"\b(stability (?:data|studies|results|testing|protocol)s?)\b", re.IGNORECASE),
    re.compile(r"\b(clinical (?:data|studies|trials|results|evidence|reports?))\b", re.IGNORECASE),
    re.compile(r"\b((?:analytical|test)\s+(?:methods?|procedures?))\b", re.IGNORECASE),
    re.compile(r"\b(specifications?)\b", re.IGNORECASE),
    re.compile(r"\b(batch (?:analyses|records?|data|results?))\b", re.IGNORECASE),
    re.compile(r"\b((?:in[- ]?vitro|in[- ]?vivo)\s+(?:data|studies|results?))\b", re.IGNORECASE),
    re.compile(r"\b(pharmacokinetic[s]?\s+(?:data|studies|results?))\b", re.IGNORECASE),
    re.compile(r"\b(toxicolog(?:y|ical)\s+(?:data|studies|results?))\b", re.IGNORECASE),
    re.compile(r"\b(efficacy\s+(?:data|studies|results?))\b", re.IGNORECASE),
    re.compile(r"\b(safety\s+(?:data|studies|results?))\b", re.IGNORECASE),
    re.compile(r"\b(validation\s+(?:data|studies|reports?))\b", re.IGNORECASE),
    re.compile(r"\b(certificates?\s+of\s+analysis)\b", re.IGNORECASE),
    re.compile(r"\b((?:flow\s+)?diagram[s]?)\b", re.IGNORECASE),
    re.compile(r"\b((?:risk\s+)?assessments?)\b", re.IGNORECASE),
    re.compile(r"\b(impurit(?:y|ies)\s+(?:data|profile|limits?))\b", re.IGNORECASE),
    re.compile(r"\b(shelf[- ]life)\b", re.IGNORECASE),
    re.compile(r"\b(storage\s+conditions?)\b", re.IGNORECASE),
    re.compile(r"\b(manufacturing\s+(?:process|procedure|description))\b", re.IGNORECASE),
    re.compile(r"\b(container[- ]closure\s+(?:system|description))\b", re.IGNORECASE),
    re.compile(r"\b(reference\s+standards?)\b", re.IGNORECASE),
]

# Patterns that classify requirement type
_TYPE_PATTERNS = [
    ("tabulated_summary", re.compile(r"\b(table[s]?|tabulated?|listing[s]?)\b", re.IGNORECASE)),
    ("written_summary", re.compile(r"\b(written\s+summary|overview|discussion)\b", re.IGNORECASE)),
    ("study_report", re.compile(r"\b(study\s+report[s]?|test\s+report[s]?|full\s+report[s]?)\b", re.IGNORECASE)),
    ("specification", re.compile(r"\b(specification[s]?|limit[s]?|criteria)\b", re.IGNORECASE)),
    ("content", re.compile(r".", re.IGNORECASE)),  # catch-all
]

# Applicability patterns
_APPLICABILITY_PATTERNS = [
    ("drug_substance", re.compile(r"\b(drug\s+substance|active\s+(?:substance|ingredient|pharmaceutical\s+ingredient)|API)\b", re.IGNORECASE)),
    ("drug_product", re.compile(r"\b(drug\s+product|finished\s+product|dosage\s+form)\b", re.IGNORECASE)),
    ("biological", re.compile(r"\b(biologic(?:al)?|biotechnology|monoclonal\s+antibody|protein)\b", re.IGNORECASE)),
    ("human_medicinal_product", re.compile(r"\b(human\s+(?:use|subjects?|pharmacology|clinical|patients?))\b", re.IGNORECASE)),
]

# Mandatory status signals
_MANDATORY_RE = re.compile(r"\b(shall|must|is\s+required|are\s+required)\b", re.IGNORECASE)
_RECOMMENDED_RE = re.compile(r"\b(should|recommended?|where\s+appropriate|if\s+applicable|when\s+relevant)\b", re.IGNORECASE)

# Sentences to skip — noise from PDFs (page numbers, TOC lines, etc.)
_NOISE_RE = re.compile(
    r"^(\d{1,4}|[A-Z]-?\d+|(?:page|table|figure)\s*\d+|©|^\s*[-–—•]\s*$|^[A-Z]{2,}\s*$)$",
    re.IGNORECASE,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _module_for_section(section_number: str) -> str:
    """Return 'Module N' for a section number, or 'Module unknown'."""
    first = section_number.split(".")[0].split("-")[0]
    if first.isdigit() and first in _MODULE_MAP:
        return _MODULE_MAP[first][0]
    return "Module unknown"


def _canonical_title(section_number: str, raw_title: str) -> str:
    """Return the ICH-canonical section title if known, else clean the raw one."""
    if section_number in _ICH_SECTION_TITLES:
        return _ICH_SECTION_TITLES[section_number]
    # Clean artefacts from PDF heading extraction (leading colons, noise chars)
    title = re.sub(r"^[\s:;,.\-–—]+", "", raw_title).strip()
    title = re.sub(r"\s{2,}", " ", title)
    return title or raw_title


def _parent_section(section_number: str) -> str | None:
    """Return the parent section number, or None for top-level sections."""
    parts = section_number.rsplit(".", 1)
    if len(parts) == 2 and parts[0]:
        return parts[0]
    return None


def _is_core_ctd_section(section_number: str) -> bool:
    """True if the section number looks like a genuine CTD section (1.x – 5.x)."""
    first = section_number.split(".")[0]
    return first.isdigit() and 1 <= int(first) <= 5


def _split_sentences(text: str) -> list[str]:
    """Split text into sentences using a simple regex splitter."""
    # Normalise whitespace
    text = re.sub(r"\s+", " ", text).strip()
    # Split on sentence-ending punctuation followed by whitespace + capital letter
    sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z\"\(])", text)
    result = []
    for s in sentences:
        s = s.strip()
        if len(s) < 20:
            continue
        if _NOISE_RE.match(s):
            continue
        result.append(s)
    return result


def _extract_evidence_terms(text: str) -> list[str]:
    """Return a deduplicated list of evidence terms found in text."""
    found: list[str] = []
    seen: set[str] = set()
    for pattern in _EVIDENCE_SIGNALS:
        for match in pattern.finditer(text):
            term = match.group(1).strip().lower()
            if term not in seen:
                seen.add(term)
                found.append(match.group(1).strip())
    return found


def _classify_type(text: str) -> str:
    for type_name, pattern in _TYPE_PATTERNS:
        if pattern.search(text):
            return type_name
    return "content"


def _classify_applicability(text: str) -> str:
    for applicability, pattern in _APPLICABILITY_PATTERNS:
        if pattern.search(text):
            return applicability
    return "unknown"


def _classify_mandatory(text: str) -> str:
    if _MANDATORY_RE.search(text):
        return "required"
    if _RECOMMENDED_RE.search(text):
        return "recommended"
    return "unknown"


def _classify_region(section_number: str, source_files: list[str]) -> str:
    """Infer regulatory region from section pattern. CTD is always ICH."""
    if _is_core_ctd_section(section_number):
        return "ICH"
    return "unknown"


def _requirement_id(section_number: str, index: int) -> str:
    """Generate a stable requirement ID for a section + position."""
    return f"REQ-{section_number}-{index:03d}"


def _section_text_hash(texts: list[str]) -> str:
    combined = "\n".join(texts)
    return hashlib.sha256(combined.encode("utf-8")).hexdigest()[:12]


# ---------------------------------------------------------------------------
# Core extraction function
# ---------------------------------------------------------------------------

def _extract_requirements_from_section(
    section_number: str,
    chunks: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Given all chunks for a single section_number, extract structured requirements.
    Returns a list of raw requirement dicts (not yet Requirement dataclass).
    """
    if not chunks:
        return []

    # Deterministic fields from first chunk (all share the same section)
    first = chunks[0]
    raw_title = first.get("section_title") or section_number
    section_title = _canonical_title(section_number, raw_title)
    module = _module_for_section(section_number)
    parent = _parent_section(section_number)
    source_files = list({c["source_file"] for c in chunks})
    region = _classify_region(section_number, source_files)

    # Build the combined text corpus for this section
    all_text = " ".join(c.get("text", "") for c in chunks if c.get("text"))
    chunk_ids = [c["chunk_id"] for c in chunks]

    # Build official_evidence_refs
    refs = [
        {
            "chunk_id": c["chunk_id"],
            "document_id": c.get("document_id"),
            "document_version_id": c.get("document_version_id"),
            "source_file": c.get("source_file"),
            "source_page": c.get("source_page"),
            "source_section": c.get("source_section"),
        }
        for c in chunks
    ]

    # --- NLP extraction: find obligation sentences ---
    sentences = _split_sentences(all_text)
    obligation_sentences = [s for s in sentences if _OBLIGATION_RE.search(s)]

    if not obligation_sentences:
        # No obligation language found — skip this section
        logger.debug("Section %s: no obligation sentences found, skipping.", section_number)
        return []

    # Group obligation sentences into logical requirements (max 3 sentences each
    # to keep requirement_text focused and useful).  Each group shares the same
    # section metadata, so we emit one requirement per 3-sentence block.
    BATCH = 3
    requirements: list[dict[str, Any]] = []
    now = datetime.now(timezone.utc)

    batches = [obligation_sentences[i:i + BATCH] for i in range(0, len(obligation_sentences), BATCH)]

    for idx, batch in enumerate(batches):
        req_text = " ".join(batch)

        # Skip if the extracted text is too short to be meaningful
        if len(req_text) < 40:
            continue

        expected = _extract_evidence_terms(all_text)
        req_type = _classify_type(req_text)
        applicability = _classify_applicability(all_text)
        mandatory = _classify_mandatory(req_text)

        req_id = _requirement_id(section_number, idx)

        # Use the page of the first chunk that contributed text; fall back to first chunk
        source_page = first.get("source_page", 0)

        requirements.append({
            "requirement_id": req_id,
            "module": module,
            "section_number": section_number,
            "section_title": section_title,
            "parent_section": parent,
            "requirement_text": req_text,
            "requirement_type": req_type,
            "mandatory_status": mandatory,
            "applicability": applicability,
            "region": region,
            "source_document": first.get("source_file", "unknown"),
            "source_section": first.get("source_section", section_number),
            "source_page": source_page,
            "source_chunk_ids": chunk_ids,
            "official_evidence_refs": refs,
            "expected_evidence": expected,
            "rules_version": RULES_VERSION,
            "created_at": now,
            "updated_at": now,
            "is_current": True,
        })

    return requirements


# ---------------------------------------------------------------------------
# Main seeding function
# ---------------------------------------------------------------------------

def seed_ctd_requirements(
    repository: MongoRepository | None = None,
    current_only: bool = True,
    core_ctd_only: bool = True,
    dry_run: bool = False,
) -> dict[str, int]:
    """
    Read Mode2.CTD, extract structured requirements, write to Mode2.CTD_REQUIREMENTS.

    Args:
        repository: MongoRepository instance. Created from settings if None.
        current_only: Only process is_current=True chunks.
        core_ctd_only: Only process sections 1.x – 5.x (skip malformed section IDs).
        dry_run: Extract but do not write to MongoDB.

    Returns:
        Dict with extraction statistics.
    """
    if repository is None:
        repository = MongoRepository(settings)

    stats: dict[str, int] = {
        "documents_examined": 0,
        "sections_examined": 0,
        "requirements_extracted": 0,
        "requirements_inserted": 0,
        "requirements_updated": 0,
        "requirements_skipped": 0,
        "requirements_without_evidence": 0,
    }

    logger.info("Starting CTD requirement extraction (current_only=%s, core_ctd_only=%s, dry_run=%s)",
                current_only, core_ctd_only, dry_run)

    # ── Step 1: get all section numbers present in Mode2.CTD ─────────────────
    all_sections = repository.all_section_numbers(current_only=current_only)
    if core_ctd_only:
        all_sections = [s for s in all_sections if _is_core_ctd_section(s)]

    logger.info("Sections to examine: %d", len(all_sections))

    # Track distinct source documents
    all_doc_ids: set[str] = set()

    # ── Step 2: process section by section ───────────────────────────────────
    all_requirements: list[dict[str, Any]] = []

    for section_number in all_sections:
        chunks = repository.chunks_for_section(section_number, current_only=current_only)
        if not chunks:
            continue

        # Track documents
        for c in chunks:
            if c.get("document_id"):
                all_doc_ids.add(c["document_id"])

        stats["sections_examined"] += 1

        reqs = _extract_requirements_from_section(section_number, chunks)

        if not reqs:
            stats["requirements_skipped"] += 1
            continue

        for req in reqs:
            if not req.get("source_chunk_ids"):
                stats["requirements_without_evidence"] += 1
                logger.warning("Requirement %s has no source_chunk_ids — skipping.", req.get("requirement_id"))
                continue
            if not req.get("expected_evidence"):
                stats["requirements_without_evidence"] += 1
            all_requirements.append(req)

        logger.debug("Section %s → %d requirement(s)", section_number, len(reqs))

    stats["documents_examined"] = len(all_doc_ids)
    stats["requirements_extracted"] = len(all_requirements)

    logger.info("Extraction complete: %d requirements from %d sections.",
                len(all_requirements), stats["sections_examined"])

    if not all_requirements:
        logger.error(
            "Zero requirements extracted. Diagnostic info:\n"
            "  Sections examined: %d\n"
            "  Sections skipped (no obligations): %d\n"
            "  Check that Mode2.CTD chunks contain substantive text (not just headings).",
            stats["sections_examined"],
            stats["requirements_skipped"],
        )
        return stats

    # ── Step 3: write to MongoDB ──────────────────────────────────────────────
    if dry_run:
        logger.info("Dry run — skipping MongoDB write.")
        stats["requirements_inserted"] = len(all_requirements)
        return stats

    logger.info("Writing %d requirements to Mode2.CTD_REQUIREMENTS ...", len(all_requirements))

    upsert_counts = repository.upsert_requirements(all_requirements)
    stats["requirements_inserted"] = upsert_counts.get("inserted", 0)
    stats["requirements_updated"] = upsert_counts.get("updated", 0)

    # ── Step 4: post-write verification ──────────────────────────────────────
    total_in_db = repository.requirements.count_documents({})
    logger.info("CTD_REQUIREMENTS.count_documents({}) = %d", total_in_db)
    if total_in_db == 0:
        logger.error("Verification FAILED: CTD_REQUIREMENTS is still empty after write!")
    else:
        logger.info("Verification OK: %d documents in CTD_REQUIREMENTS.", total_in_db)

    return stats


# ---------------------------------------------------------------------------
# Reporting helpers (used by CLI)
# ---------------------------------------------------------------------------

def print_extraction_report(stats: dict[str, int], repository: MongoRepository) -> None:
    """Print the standardised validation report."""
    print("\n" + "=" * 60)
    print("CTD REQUIREMENT EXTRACTION REPORT")
    print("=" * 60)
    print(f"Documents examined:          {stats['documents_examined']}")
    print(f"Sections examined:           {stats['sections_examined']}")
    print(f"Requirements extracted:      {stats['requirements_extracted']}")
    print(f"Requirements inserted:       {stats['requirements_inserted']}")
    print(f"Requirements updated:        {stats['requirements_updated']}")
    print(f"Requirements skipped:        {stats['requirements_skipped']}")
    print(f"Requirements without evid.:  {stats['requirements_without_evidence']}")

    total = repository.requirements.count_documents({})
    print(f"\nCTD_REQUIREMENTS.count_documents({{}}): {total}")
    if total == 0:
        print("WARNING: Collection is still empty!")
    else:
        print("OK: Collection is non-empty.")

    print("\n--- 10 Sample Requirements ---")
    samples = list(repository.requirements.find(
        {},
        {
            "_id": 0,
            "requirement_id": 1,
            "section_number": 1,
            "section_title": 1,
            "requirement_text": 1,
            "source_document": 1,
            "source_page": 1,
            "source_chunk_ids": 1,
            "expected_evidence": 1,
        },
    ).limit(10))

    for i, req in enumerate(samples, 1):
        print(f"\n[{i}] {req.get('requirement_id')} — {req.get('section_number')} {req.get('section_title')}")
        text = req.get("requirement_text", "")
        print(f"     requirement_text: {text[:200]}{'...' if len(text) > 200 else ''}")
        print(f"     source_document:  {req.get('source_document')}")
        print(f"     source_page:      {req.get('source_page')}")
        ids = req.get("source_chunk_ids", [])
        print(f"     source_chunk_ids: [{ids[0][:16]}...] ({len(ids)} chunk(s))" if ids else "     source_chunk_ids: []")
        evid = req.get("expected_evidence", [])
        print(f"     expected_evidence: {evid[:5]}")

    print("=" * 60 + "\n")
