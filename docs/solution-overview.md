# Solution Overview

## What We Built

ReguLens is a two-mode workspace for regulatory intelligence. Mode 1 accepts FAERS-style safety data and returns prioritised potential signals; Mode 2 accepts official and applicant CTD PDFs, extracts section-aware evidence, and creates a submission-readiness report against a curated ICH requirement catalogue.

## How It Works

The system transforms source documents and datasets into reviewable results while preserving references to the underlying evidence.

1. The user selects Mode 1 or Mode 2 and uploads the relevant source data: FAERS CSV data or CTD PDF documents.
2. Mode 1 cleans safety data, calculates proportional reporting ratios (PRR), groups related events, and prepares ranked signal results.
3. Mode 2 extracts page text and headings from PDFs, stores official requirements separately from user evidence, and creates section-aware chunks with embeddings.
4. For each official requirement, Mode 2 ranks the user's evidence using semantic similarity, keyword overlap, and CTD-section alignment, then marks it as present, partial, or missing.
5. The React application presents traceable dashboards, scores, gaps, and source-evidence references for reviewer follow-up.

## Architecture Diagram

> See [`architecture.md`](architecture.md) for the detailed diagram.

```text
[Reviewer] → [React interface] → [FastAPI services] → [Analysis pipeline] → [Review report]
                                      │                       │
                                      │                       ├─ Mode 1: FAERS / PRR / clustering
                                      │                       └─ Mode 2: CTD extraction / matching
                                      └─ [PostgreSQL and MongoDB evidence stores]
```

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Separate official requirements and applicant evidence | Prevents user dossier content from changing the regulatory baseline used for assessment. |
| Section-aware CTD chunks | Preserves the CTD heading, page, and source context needed for traceable evidence review. |
| Hybrid evidence ranking | Combines embeddings, lexical overlap, and CTD-section context so a temporary vector-index issue does not produce an all-zero report. |

## IBM Technologies Used

- **IBM Bob:** Used as the AI-assisted development environment for building and iterating on the ReguLens workflows, including the Mode 2 evidence-analysis improvements.
- **IBM Docling:** Used as an structural-enrichment layer in Mode 2. It supplements PyMuPDF text extraction when processing CTD PDFs while the pipeline retains detected headings and page provenance for traceability.
