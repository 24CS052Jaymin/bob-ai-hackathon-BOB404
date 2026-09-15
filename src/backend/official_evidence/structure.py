from __future__ import annotations

import re
from collections.abc import Iterable

from .models import Page, Section

_HEADING = re.compile(
    r"^\s*(?P<number>(?:[1-5](?:\.\d+){1,5}|\d+(?:\.\d+){1,5}))\s+(?P<title>.{3,160})\s*$"
)
_MODULE = re.compile(r"^([1-5])(?:\.|$)")


def normalized_text(value: str) -> str:
    return re.sub(r"[ \t]+", " ", value.replace("\u00ad", "")).strip()


def detect_heading(line: str) -> tuple[str | None, str | None, int | None]:
    match = _HEADING.match(line)
    if not match:
        return None, None, None
    number = match.group("number")
    return number, normalized_text(match.group("title")), number.count(".") + 1


def parent_section(number: str | None) -> str | None:
    if not number or "." not in number:
        return None
    return number.rsplit(".", 1)[0]


def module_for(number: str | None) -> str | None:
    if not number:
        return None
    match = _MODULE.match(number)
    return match.group(1) if match else None


def sectionize(pages: Iterable[Page]) -> list[tuple[Section, int, str]]:
    """Assign page text to locally observed headings without fabricating CTD mappings."""
    result: list[tuple[Section, int, str]] = []
    current = Section(None, None, None, None, None)
    for page in pages:
        buffer: list[str] = []
        for raw_line in page.text.splitlines():
            line = normalized_text(raw_line)
            number, title, level = detect_heading(line)
            if number and title:
                if buffer:
                    result.append((current, page.number, "\n".join(buffer)))
                    buffer = []
                current = Section(number, title, parent_section(number), level, line)
            if line:
                buffer.append(line)
        if page.tables:
            buffer.extend(page.tables)
        if buffer:
            result.append((current, page.number, "\n".join(buffer)))
    return result
