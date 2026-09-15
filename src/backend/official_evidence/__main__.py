"""
CLI entrypoint for the official_evidence package.

Usage:
    python -m official_evidence extract_requirements [--dry-run] [--all-sections] [--debug]
"""

from __future__ import annotations

import argparse
import logging
import sys


def _cmd_extract(args: argparse.Namespace) -> None:
    from .config import settings
    from .repository import MongoRepository
    from .requirement_extractor import print_extraction_report, seed_ctd_requirements

    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.INFO,
        format="%(asctime)s %(name)-40s %(levelname)-8s %(message)s",
        stream=sys.stdout,
    )

    repository = MongoRepository(settings)

    print(f"Connected to: {settings.database}.{settings.requirements_collection}")
    print(f"Evidence source: {settings.database}.{settings.evidence_collection}")
    print(f"Rules version: ctd-extracted-v1")
    print(f"Dry run: {args.dry_run}")
    print(f"Core CTD sections only: {not args.all_sections}")
    print()

    stats = seed_ctd_requirements(
        repository=repository,
        current_only=True,
        core_ctd_only=not args.all_sections,
        dry_run=args.dry_run,
    )

    print_extraction_report(stats, repository)

    if stats["requirements_extracted"] == 0:
        print("DIAGNOSTIC: Zero requirements extracted. Running debug checks...")
        _debug_ctd_collection(repository)
        sys.exit(1)


def _debug_ctd_collection(repository) -> None:
    """Print diagnostic information when extraction yields nothing."""
    print("\n--- DIAGNOSTIC: Mode2.CTD inspection ---")
    total = repository.chunks.count_documents({})
    current = repository.chunks.count_documents({"is_current": True})
    print(f"  Total chunks: {total}")
    print(f"  is_current=True: {current}")

    section_numbers = [
        s for s in repository.chunks.distinct("section_number", {"is_current": True}) if s
    ]
    print(f"  Distinct section_numbers (current): {len(section_numbers)}")
    for s in sorted(str(x) for x in section_numbers[:20]):
        print(f"    {s}")

    print("\n  Sample chunks with section_number:")
    samples = list(repository.chunks.find(
        {"section_number": {"$ne": None}, "is_current": True},
        {"_id": 0, "embedding": 0, "chunk_id": 1, "section_number": 1, "section_title": 1, "text": 1, "source_file": 1},
    ).limit(3))
    for s in samples:
        print(f"    chunk_id={s.get('chunk_id','')[:16]}  section={s.get('section_number')}  title={s.get('section_title','')[:40]!r}")
        print(f"    text[:200]={s.get('text','')[:200]!r}")

    print("\n  Verifying collection/database name:")
    print(f"    database:   {repository.db.name}")
    print(f"    collection: {repository.requirements.name}")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        prog="python -m official_evidence",
        description="Official Evidence CLI",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    extract = sub.add_parser(
        "extract_requirements",
        help="Extract regulatory requirements from Mode2.CTD into Mode2.CTD_REQUIREMENTS",
    )
    extract.add_argument(
        "--dry-run",
        action="store_true",
        help="Extract but do not write to MongoDB",
    )
    extract.add_argument(
        "--all-sections",
        action="store_true",
        help="Include non-standard section IDs (default: core CTD 1.x–5.x only)",
    )
    extract.add_argument(
        "--debug",
        action="store_true",
        help="Enable DEBUG-level logging",
    )

    args = parser.parse_args(argv)

    if args.command == "extract_requirements":
        _cmd_extract(args)


if __name__ == "__main__":
    main()
