from __future__ import annotations

import logging
import re
from pathlib import Path

import pymupdf

from .models import Page, Section

logging.getLogger("MatchingPostProcessor").setLevel(logging.ERROR)

_HEADING = re.compile(r"^\s*((?:[A-Za-z0-9]+\.){1,6}[A-Za-z0-9]+|[IVX]+(?:\.[IVX]+)?)\s+(.{2,180})\s*$")


def extract_pages(path: Path) -> list[Page]:
    pages: list[Page] = []
    with pymupdf.open(path) as document:
        for index, page in enumerate(document, start=1):
            text = page.get_text("text").strip()
            tables: list[str] = []
            pages.append(Page(number=index, text=text, tables=tables))
    return pages


def _heading_level(number: str) -> int:
    return len([part for part in number.split(".") if part])


def detect_sections(pages: list[Page]) -> list[Section]:
    sections: list[Section] = []
    parents: dict[int, str] = {}
    for page in pages:
        for line in page.text.splitlines():
            match = _HEADING.match(line.strip())
            if not match:
                continue
            number, title = match.groups()
            level = _heading_level(number)
            parents[level] = number
            parent = parents.get(level - 1)
            sections.append(Section(number, title.strip(), parent, level, line.strip(), page.number))
    return sections


def section_for_page(sections: list[Section], page: int) -> Section | None:
    candidates = [section for section in sections if section.page <= page]
    return candidates[-1] if candidates else None


def structure_with_docling(path: Path, pages: list[Page], sections: list[Section]) -> list[Section]:
    """Use Docling when installed; keep PyMuPDF headings as the provenance fallback.

    Docling's output schema changes between releases, so this adapter only enriches
    when a document title is available and never fabricates CTD section numbers.
    """
    try:
        from docling.document_converter import DocumentConverter  # type: ignore

        result = DocumentConverter().convert(str(path))
        title = getattr(getattr(result, "document", None), "name", None)
        if title and sections:
            sections[0].source_heading = f"{title}: {sections[0].source_heading}"
    except Exception:  # noqa: BLE001 — Docling is optional; any failure falls back to PyMuPDF
        pass
    return sections
