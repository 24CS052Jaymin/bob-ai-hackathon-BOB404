"""
User PDF ingestion pipeline.

PDF → PyMuPDF (text + pages) → Docling (structure) → section-aware chunks
→ all-MiniLM-L6-v2 embeddings → Mode2v2.UserCTD

Key rules:
  - Never invent CTD section numbers; null when not reliably detected.
  - content_type is "table" when the chunk comes from an extracted table,
    "heading" for a bare heading line, "text" otherwise.
  - Duplicate prevention: if the same (submission_id, sha256) already exists
    and is_current, skip and return the existing submission record.
"""
from __future__ import annotations

import hashlib
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import UserSettings
from .models import UserChunk, UserSubmission
from .repository import UserRepository

# Reuse the proven extraction primitives from the official_evidence package
from official_evidence.embeddings import EmbeddingProvider
from official_evidence.extraction import detect_sections, extract_pages, section_for_page, structure_with_docling

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Section-aware chunking (specialised for user dossiers)
# ---------------------------------------------------------------------------

_MODULE_RE = re.compile(r"^([1-5])\b")
_CHUNK_LIMIT = 1800   # characters — safely within all-MiniLM-L6-v2's 512-token window
_TABLE_LINE_MIN = 3   # minimum pipe-separated cells to call a block a table


def _module_label(section_number: str | None) -> str | None:
    if not section_number:
        return None
    m = _MODULE_RE.match(section_number.split(".")[0])
    return f"Module {m.group(1)}" if m else None


def _content_type(text: str) -> str:
    """Heuristic: classify a chunk as table, heading, or text."""
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if not lines:
        return "text"
    pipe_lines = sum(1 for ln in lines if ln.count("|") >= _TABLE_LINE_MIN)
    if pipe_lines >= max(2, len(lines) // 3):
        return "table"
    if len(lines) == 1 and len(lines[0]) < 120:
        return "heading"
    return "text"


def _split_text(text: str, limit: int = _CHUNK_LIMIT) -> list[str]:
    """Split on blank lines first; hard-slice oversized paragraphs."""
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    result: list[str] = []
    for para in paragraphs:
        if len(para) <= limit:
            result.append(para)
        else:
            result.extend(para[i:i + limit] for i in range(0, len(para), limit))
    return result


def _page_sections(page, sections):
    """Return text blocks on a page with the heading that owns each block.

    ``section_for_page`` is useful for a page containing one section, but a CTD
    table of contents or summary page commonly contains many headings.  Using
    its last heading for the entire page loses the evidence-to-section link.
    """
    page_sections = [section for section in sections if section.page == page.number]
    if not page_sections:
        return [(section_for_page(sections, page.number), page.text)]

    lines = page.text.splitlines()
    starts: list[tuple[int, Any]] = []
    cursor = 0
    for section in page_sections:
        for index in range(cursor, len(lines)):
            if lines[index].strip() == section.source_heading.strip():
                starts.append((index, section))
                cursor = index + 1
                break

    if not starts:
        return [(section_for_page(sections, page.number), page.text)]

    blocks = []
    # Preserve an unheaded preamble, such as the document title on page one.
    if starts[0][0] > 0:
        blocks.append((section_for_page(sections, page.number - 1), "\n".join(lines[:starts[0][0]])))
    for position, (start, section) in enumerate(starts):
        end = starts[position + 1][0] if position + 1 < len(starts) else len(lines)
        block = "\n".join(lines[start:end]).strip()
        if block:
            blocks.append((section, block))
    return blocks


def make_user_chunks(
    pages,
    sections,
    *,
    document_id: str,
    document_version_id: str,
    submission_id: str,
    source_file: str,
    source_file_hash: str,
    embedding_model: str,
    embed: EmbeddingProvider,
    pipeline_version: str,
) -> list[UserChunk]:

    chunks: list[UserChunk] = []
    position = 0

    for page in pages:
        if not page.text:
            continue
        for section, block in _page_sections(page, sections):
            section_number = section.number if section else None
            section_title = section.title if section else "Unstructured"
            source_heading = section.source_heading if section else "Unstructured"
            parent = section.parent_section if section else None
            module = _module_label(section_number)
            parts = _split_text(block)
            if not parts:
                continue
            vectors = embed(parts)

            for idx, (text, vector) in enumerate(zip(parts, vectors, strict=True)):
                identity = f"{document_version_id}:{page.number}:{section_number or 'none'}:{idx}:{text}"
                chunk_id = hashlib.sha256(identity.encode()).hexdigest()
                chunks.append(UserChunk(
                    chunk_id=chunk_id,
                    document_id=document_id,
                    document_version_id=document_version_id,
                    submission_id=submission_id,
                    source_file=source_file,
                    source_file_hash=source_file_hash,
                    source_page=page.number,
                    page_range={"start": page.number, "end": page.number},
                    source_heading=source_heading,
                    section_number=section_number,
                    section_title=section_title,
                    parent_section=parent,
                    module=module,
                    content_type=_content_type(text),
                    text=text,
                    embedding=[float(v) for v in vector],
                    embedding_model=embedding_model,
                    embedding_dimensions=len(vector),
                    chunk_position=position,
                    pipeline_version=pipeline_version,
                    ingestion_timestamp=datetime.now(timezone.utc),
                    is_current=True,
                ))
                position += 1

    return chunks


# ---------------------------------------------------------------------------
# Top-level ingest function
# ---------------------------------------------------------------------------

def ingest_user_pdf(
    path: Path,
    submission_id: str,
    repository: UserRepository,
    settings: UserSettings,
) -> dict[str, Any]:
    """
    Ingest a user-uploaded PDF for a given submission_id.

    Returns a result dict with ingestion stats.
    Raises RuntimeError on unrecoverable failures (empty PDF, embedding error).
    """
    now = datetime.now(timezone.utc)
    file_bytes = path.read_bytes()
    file_hash = hashlib.sha256(file_bytes).hexdigest()
    doc_key = hashlib.sha256(path.stem.lower().encode()).hexdigest()[:16]
    document_id = f"userdoc-{doc_key}"
    version_id = f"{document_id}:{file_hash[:16]}"

    logger.info("[UserEvidence] Ingestion start: submission=%s file=%s hash=%s",
                submission_id, path.name, file_hash[:16])

    # ── Duplicate guard ──────────────────────────────────────────────────────
    if repository.is_duplicate(submission_id, file_hash, settings.pipeline_version):
        logger.info("[UserEvidence] Duplicate detected — skipping re-ingestion.")
        existing = repository.submissions.find_one(
            {"submission_id": submission_id, "source_file_hash": file_hash, "is_current": True},
            {"_id": 0},
        )
        return {**existing, "duplicate": True} if existing else {"duplicate": True, "source_file_hash": file_hash}

    # ── Phase 1: PyMuPDF extraction ──────────────────────────────────────────
    pages = extract_pages(path)
    if not pages:
        raise RuntimeError(f"PyMuPDF extracted zero pages from {path.name}")
    total_chars = sum(len(p.text) for p in pages)
    total_tables = sum(len(p.tables) for p in pages)
    logger.info("[UserEvidence] Phase 1 — PyMuPDF: %d pages, %d chars, %d tables",
                len(pages), total_chars, total_tables)

    # ── Phase 2: Docling structural enrichment ───────────────────────────────
    raw_sections = detect_sections(pages)
    sections = structure_with_docling(path, pages, raw_sections)
    logger.info("[UserEvidence] Phase 2 — Docling: %d sections detected", len(sections))

    # ── Phase 3: Section-aware chunking + embeddings ─────────────────────────
    embedder = EmbeddingProvider(
        settings.embedding_model,
        settings.embedding_dimensions,
        settings.allow_test_embeddings,
    )
    chunks = make_user_chunks(
        pages,
        sections,
        document_id=document_id,
        document_version_id=version_id,
        submission_id=submission_id,
        source_file=path.name,
        source_file_hash=file_hash,
        embedding_model=settings.embedding_model,
        embed=embedder,
        pipeline_version=settings.pipeline_version,
    )
    if not chunks:
        raise RuntimeError(f"No chunks produced from {path.name} — PDF may be image-only or empty.")

    embedding_dims = chunks[0].embedding_dimensions
    logger.info("[UserEvidence] Phase 3 — %d chunks, dims=%d", len(chunks), embedding_dims)

    # ── Phase 4: MongoDB write ────────────────────────────────────────────────
    repository.replace_version(
        submission_id=submission_id,
        document_id=document_id,
        source_file_hash=file_hash,
        document_version_id=version_id,
        chunks=[c.mongo_document() for c in chunks],
    )

    submission_record = UserSubmission(
        submission_id=submission_id,
        document_id=document_id,
        document_version_id=version_id,
        source_file=path.name,
        source_file_hash=file_hash,
        file_size_bytes=len(file_bytes),
        pages_extracted=len(pages),
        sections_detected=len(sections),
        tables_detected=total_tables,
        chunks_created=len(chunks),
        embedding_dimensions=embedding_dims,
        embedding_model=settings.embedding_model,
        pipeline_version=settings.pipeline_version,
        ingestion_timestamp=now,
        is_current=True,
        status="ok",
        error_detail=None,
    )
    repository.upsert_submission(submission_record.mongo_document())
    logger.info("[UserEvidence] Phase 4 — MongoDB write complete.")

    return {
        "submission_id": submission_id,
        "document_id": document_id,
        "document_version_id": version_id,
        "source_file": path.name,
        "source_file_hash": file_hash,
        "file_size_bytes": len(file_bytes),
        "duplicate": False,
        "ingestion": {
            "pages_extracted": len(pages),
            "sections_detected": len(sections),
            "tables_detected": total_tables,
            "chunks_created": len(chunks),
            "embedding_model": settings.embedding_model,
            "embedding_dimensions": embedding_dims,
            "pipeline_version": settings.pipeline_version,
        },
    }
