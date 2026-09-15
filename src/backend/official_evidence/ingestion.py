from __future__ import annotations

import hashlib
import logging
import re
from datetime import datetime, timezone
from pathlib import Path

from .chunking import section_aware_chunks
from .config import Settings
from .embeddings import Embedder
from .extraction import PdfExtractor
from .models import EvidenceChunk
from .repository import EvidenceRepository
from .structure import module_for, sectionize

logger = logging.getLogger(__name__)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def document_identity(path: Path, file_hash: str, pipeline_version: str) -> tuple[str, str, str]:
    # Stable across re-ingestion, while a changed source remains an auditable new version.
    document_id = _slug(path.stem)
    configuration = f"{file_hash}:{pipeline_version}"
    version_id = f"{document_id}:{hashlib.sha256(configuration.encode()).hexdigest()[:16]}"
    return document_id, version_id, "official-regulatory-evidence"


def classify_document(filename: str) -> tuple[str, str]:
    normalized = filename.lower()
    if "m4" in normalized or "ctd" in normalized:
        return "CTD_structure", "ICH" if "ich" in normalized else "FDA"
    if "fda" in normalized:
        return "regional_regulatory_guidance", "FDA"
    return "official_regulatory_guidance", "Unknown"


class IngestionService:
    def __init__(self, settings: Settings, repository: EvidenceRepository, embedder: Embedder):
        self.settings, self.repository, self.embedder = settings, repository, embedder
        self.extractor = PdfExtractor()

    def ingest_directory(self) -> dict[str, object]:
        pdfs = sorted(self.settings.pdf_directory.glob("*.pdf"))
        if not pdfs:
            raise FileNotFoundError(f"No PDFs found in {self.settings.pdf_directory}")
        report: dict[str, object] = {"processed": 0, "skipped_duplicates": 0, "failed": 0, "documents": []}
        self.repository.ensure_indexes()
        for pdf in pdfs:
            try:
                item = self.ingest_pdf(pdf)
                report["documents"].append(item)
                report["skipped_duplicates" if item["status"] == "duplicate" else "processed"] += 1
            except Exception as error:
                logger.exception("Ingestion failed for %s", pdf.name)
                report["failed"] += 1
                report["documents"].append({"document": pdf.name, "status": "failed", "error": str(error)})
        return report

    def ingest_pdf(self, pdf: Path) -> dict[str, object]:
        file_hash = sha256_file(pdf)
        if self.repository.active_version_exists(file_hash):
            return {"document": pdf.name, "status": "duplicate", "chunks": 0}
        document_id, version_id, reference_set_id = document_identity(pdf, file_hash, self.settings.pipeline_version)
        relationship_type, publisher = classify_document(pdf.name)
        pages = self.extractor.extract(pdf)
        pieces = sectionize(pages)
        material: list[tuple[object, int, str]] = []
        for section, page, text in pieces:
            material.extend((section, page, chunk) for chunk in section_aware_chunks(section, text, self.settings.chunk_max_chars, self.settings.chunk_overlap_chars))
        embeddings = self.embedder.encode([chunk for _, _, chunk in material])
        now = datetime.now(timezone.utc)
        records = []
        for index, ((section, page, text), embedding) in enumerate(zip(material, embeddings, strict=True)):
            source = {"title": pdf.stem, "publisher": publisher, "guideline": pdf.stem, "revision": None}
            chunk_hash = hashlib.sha256(f"{version_id}:{index}:{text}".encode()).hexdigest()[:20]
            records.append(EvidenceChunk(chunk_id=f"{version_id}:{chunk_hash}", document_id=document_id, document_version_id=version_id, reference_set_id=reference_set_id, source_document=source, guideline=pdf.stem, source_file=pdf.name, source_file_hash=file_hash, source_page=page, page_range={"start": page, "end": page}, source_heading=section.source_heading, section_number=section.number, section_title=section.title, parent_section=section.parent_number, module=module_for(section.number), heading_level=section.heading_level, ctd_sections=[section.number] if section.number else [], relationship_type=relationship_type, text=text, embedding=embedding, embedding_model=self.settings.embedding_model, embedding_dimensions=Embedder.dimensions, pipeline_version=self.settings.pipeline_version, ingestion_timestamp=now).mongo_document())
        inserted = self.repository.replace_version(document_id, file_hash, records)
        return {"document": pdf.name, "status": "ingested", "pages": len(pages), "sections": sum(1 for section, _, _ in pieces if section.number), "tables": sum(len(page.tables) for page in pages), "chunks": len(records), "embedded_chunks": len(embeddings), "inserted": inserted}
