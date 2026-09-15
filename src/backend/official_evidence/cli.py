from __future__ import annotations

import argparse
import json
import logging

from .config import Settings
from .embeddings import Embedder
from .evaluation import evaluate
from .ingestion import IngestionService
from .repository import EvidenceRepository
from .retrieval import EvidenceRetriever
from .validation import validate_collection


def main() -> None:
    parser = argparse.ArgumentParser(description="Official regulatory evidence pipeline")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("ingest")
    search = commands.add_parser("search")
    search.add_argument("query")
    search.add_argument("--limit", type=int, default=5)
    commands.add_parser("validate")
    commands.add_parser("evaluate")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    settings = Settings.from_environment()
    repository = EvidenceRepository(settings)
    try:
        if args.command == "ingest":
            result = IngestionService(settings, repository, Embedder(settings.embedding_model)).ingest_directory()
        elif args.command == "search":
            result = RetrievalResultEncoder.encode(EvidenceRetriever(repository, Embedder(settings.embedding_model)).search(args.query, args.limit))
        elif args.command == "validate":
            result = validate_collection(repository, settings.chunk_max_chars)
        else:
            result = evaluate(EvidenceRetriever(repository, Embedder(settings.embedding_model)))
        print(json.dumps(result, default=str, indent=2))
    finally:
        repository.close()


class RetrievalResultEncoder:
    @staticmethod
    def encode(value: object) -> dict[str, object]:
        return {"strategy": value.strategy, "passages": value.passages}  # type: ignore[attr-defined]


if __name__ == "__main__":
    main()
