from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone

from .models import EvidenceChunk, Page, Section
from .extraction import section_for_page


def _module(section_number: str | None) -> str | None:
    if not section_number:
        return None
    first = section_number.split(".", 1)[0]
    return f"Module {first}" if first.isdigit() and 1 <= int(first) <= 5 else None


def _parts(text: str, limit: int = 1800) -> list[str]:
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    result: list[str] = []
    for paragraph in paragraphs:
        if len(paragraph) <= limit:
            result.append(paragraph)
            continue
        result.extend(paragraph[index:index + limit] for index in range(0, len(paragraph), limit))
    return result


def make_chunks(
    pages: list[Page],
    sections: list[Section],
    *,
    document_id: str,
    document_version_id: str,
    reference_set_id: str,
    source_file: str,
    source_file_hash: str,
    embedding_model: str,
    embed,
    pipeline_version: str,
) -> list[EvidenceChunk]:
    chunks: list[EvidenceChunk] = []
    global_position = 0
    for page in pages:
        section = section_for_page(sections, page.number)
        if not page.text:
            continue
        section_number = section.number if section else None
        section_title = section.title if section else "Unstructured source content"
        source_heading = section.source_heading if section else "Unstructured source content"
        texts = _parts(page.text)
        vectors = embed(texts)
        for index, (text, vector) in enumerate(zip(texts, vectors, strict=True)):
            identity = f"{document_version_id}:{page.number}:{section_number or 'unstructured'}:{index}:{text}"
            chunk_id = hashlib.sha256(identity.encode("utf-8")).hexdigest()
            chunks.append(EvidenceChunk(
                chunk_id=chunk_id,
                document_id=document_id,
                document_version_id=document_version_id,
                reference_set_id=reference_set_id,
                source_file=source_file,
                source_file_hash=source_file_hash,
                source_page=page.number,
                page_range={"start": page.number, "end": page.number},
                source_heading=source_heading,
                source_section=section_number or "unstructured",
                module=_module(section_number),
                section_number=section_number,
                section_title=section_title,
                parent_section=section.parent_section if section else None,
                chunk_position=global_position,
                relationship_type="primary_guidance" if _module(section_number) else "supporting_guidance",
                text=text,
                embedding=[float(value) for value in vector],
                embedding_model=embedding_model,
                embedding_dimensions=len(vector),
                is_current=True,
                pipeline_version=pipeline_version,
                ingestion_timestamp=datetime.now(timezone.utc),
            ))
            global_position += 1
    return chunks
