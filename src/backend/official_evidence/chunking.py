from __future__ import annotations

import re
from collections.abc import Iterable

from .models import Section


def _paragraphs(text: str) -> list[str]:
    return [item.strip() for item in re.split(r"\n\s*\n+", text) if item.strip()]


def _sentences(text: str) -> list[str]:
    return [item.strip() for item in re.split(r"(?<=[.!?])\s+", text) if item.strip()]


def _split_oversized(text: str, limit: int) -> Iterable[str]:
    for sentence in _sentences(text):
        if len(sentence) <= limit:
            yield sentence
        else:
            yield from (sentence[i : i + limit] for i in range(0, len(sentence), limit))


def section_aware_chunks(section: Section, body: str, max_chars: int, overlap_chars: int) -> list[str]:
    """Chunk by paragraph then sentence, preserving section context in every chunk."""
    context = "\n".join(
        value for value in (
            f"Section: {section.number} {section.title}" if section.number else None,
            f"Source heading: {section.source_heading}" if section.source_heading else None,
        ) if value
    )
    available = max_chars - len(context) - 2
    if available < 100:
        raise ValueError("Chunk limit is too small for section context.")
    units: list[str] = []
    for paragraph in _paragraphs(body):
        units.extend(_split_oversized(paragraph, available))
    chunks: list[str] = []
    current = ""
    for unit in units:
        candidate = f"{current}\n\n{unit}".strip()
        if current and len(candidate) > available:
            chunks.append(f"{context}\n\n{current}".strip())
            current = current[-overlap_chars:] + "\n\n" + unit if overlap_chars else unit
        else:
            current = candidate
    if current:
        chunks.append(f"{context}\n\n{current}".strip())
    return chunks
