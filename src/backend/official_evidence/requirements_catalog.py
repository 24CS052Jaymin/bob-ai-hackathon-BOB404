from __future__ import annotations

from typing import Iterable

from .models import EvidenceChunk, Requirement

RULES_VERSION = "ctd-rules-v1"

# These are curated regulatory expectations, not a conversion of every PDF heading.
# A rule is materialized only when official evidence contains its section signal.
RULES = (
    {
        "id": "REQ-3.2.P.8", "module": "Module 3", "section": "3.2.P.8",
        "title": "Stability", "text": "Provide stability information supporting the proposed drug product shelf life and storage conditions.",
        "type": "content", "status": "required", "applicability": "drug_product", "region": "ICH",
        "evidence": ["stability data", "shelf life", "storage conditions"],
    },
    {
        "id": "REQ-3.2.P.5", "module": "Module 3", "section": "3.2.P.5",
        "title": "Control of drug product", "text": "Describe the controls and specifications used to assure the quality of the drug product.",
        "type": "content", "status": "required", "applicability": "drug_product", "region": "ICH",
        "evidence": ["specifications", "analytical procedures", "control strategy"],
    },
    {
        "id": "REQ-2.7.3", "module": "Module 2", "section": "2.7.3",
        "title": "Summary of clinical efficacy", "text": "Summarize the clinical evidence supporting efficacy, including relevant study results and interpretation.",
        "type": "summary", "status": "required", "applicability": "human_medicinal_product", "region": "ICH",
        "evidence": ["clinical efficacy", "efficacy data", "clinical studies"],
    },
)


def build_requirements(chunks: Iterable[EvidenceChunk]) -> list[Requirement]:
    chunks = list(chunks)
    requirements: list[Requirement] = []
    for rule in RULES:
        # A requirement is materialized only when the official source explicitly
        # carries the curated CTD section number. Keywords alone cannot establish
        # a CTD mapping for supporting guidance.
        matches = [chunk for chunk in chunks if chunk.section_number == rule["section"]]
        if not matches:
            continue
        first = matches[0]
        refs = [{"chunk_id": chunk.chunk_id, "document_id": chunk.document_id, "document_version_id": chunk.document_version_id, "source_file": chunk.source_file, "source_page": chunk.source_page, "source_section": chunk.source_section} for chunk in matches]
        requirements.append(Requirement(
            requirement_id=rule["id"], module=rule["module"], section_number=rule["section"], section_title=rule["title"],
            parent_section=first.parent_section, requirement_text=rule["text"], requirement_type=rule["type"],
            mandatory_status=rule["status"], applicability=rule["applicability"], region=rule["region"],
            source_document=first.source_file, source_section=first.source_section, source_page=first.source_page,
            source_chunk_ids=[chunk.chunk_id for chunk in matches], official_evidence_refs=refs,
            expected_evidence=rule["evidence"], rules_version=RULES_VERSION,
        ))
    return requirements
