from __future__ import annotations

import logging
from pathlib import Path

import fitz

from .models import Page

logger = logging.getLogger(__name__)


class PdfExtractor:
    """PyMuPDF is authoritative for page provenance; Docling enriches tables when installed."""

    def extract(self, pdf_path: Path) -> list[Page]:
        with fitz.open(pdf_path) as document:
            pages = [
                Page(number=index + 1, text=page.get_text("text"), tables=[])
                for index, page in enumerate(document)
            ]
        self._enrich_tables_with_docling(pdf_path, pages)
        return pages

    def _enrich_tables_with_docling(self, pdf_path: Path, pages: list[Page]) -> None:
        try:
            from docling.document_converter import DocumentConverter
        except ImportError:
            logger.info("Docling not installed; retaining PyMuPDF page text and provenance.")
            return
        try:
            result = DocumentConverter().convert(str(pdf_path))
            markdown = result.document.export_to_markdown()
            # Docling does not guarantee stable page attribution across versions. Keep it as
            # document-level supplemental evidence rather than inventing a page reference.
            tables = [block.strip() for block in markdown.split("\n\n") if "|" in block and len(block) > 20]
            if tables and pages:
                pages[0].tables.extend(f"Table (Docling; page attribution unavailable):\n{table}" for table in tables)
        except Exception:  # Structural enrichment must never make provenance extraction fail.
            logger.exception("Docling table enrichment failed for %s; continuing with PyMuPDF.", pdf_path.name)
