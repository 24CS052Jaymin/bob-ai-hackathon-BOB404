from __future__ import annotations

from dataclasses import asdict, dataclass

from .retrieval import EvidenceRetriever


@dataclass(frozen=True, slots=True)
class EvaluationCase:
    query: str
    expected_document: str | None = None
    expected_section: str | None = None


DEFAULT_CASES = (
    EvaluationCase("What does ICH M4Q say about stability?", "ICH M4Q"),
    EvaluationCase("What is CTD section 3.2.P.8?", expected_section="3.2.P.8"),
    EvaluationCase("What information belongs in Module 3?"),
    EvaluationCase("What does ICH E3 require in the clinical study report?", "ICH E3"),
    EvaluationCase("What is included in CTD Module 5?"),
    EvaluationCase("Where does the FDA describe CTD organization?", "FDA"),
)


def evaluate(retriever: EvidenceRetriever, cases: tuple[EvaluationCase, ...] = DEFAULT_CASES) -> list[dict[str, object]]:
    results = []
    for case in cases:
        response = retriever.search(case.query)
        passages = response.passages
        documents = [str(item.get("source_document", {}).get("title", "")) for item in passages]
        sections = [item.get("section_number") for item in passages]
        document_rank = next((index + 1 for index, title in enumerate(documents) if case.expected_document and case.expected_document.lower() in title.lower()), None)
        section_rank = next((index + 1 for index, number in enumerate(sections) if number == case.expected_section), None)
        results.append({**asdict(case), "strategy": response.strategy, "retrieved_documents": documents, "retrieved_sections": sections, "document_rank": document_rank, "section_rank": section_rank, "correct_document": document_rank is not None if case.expected_document else None, "correct_section": section_rank is not None if case.expected_section else None})
    return results
