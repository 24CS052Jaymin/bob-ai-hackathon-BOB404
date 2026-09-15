# Official Regulatory Evidence

This backend implements only Mode 2's official-evidence layer. It ingests official PDFs into `Mode2.CTD`, preserving page provenance and source structure; it neither reads `Mode2v2.UserCTD` nor makes compliance/readiness decisions.

## Setup

```powershell
cd src/backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Set `MONGODB_URI` and `OFFICIAL_PDFS_DIR` in `.env`. The PDF directory is intentionally configurable because PDFs are not committed to this repository. Install Docling separately when enhanced table extraction is required: `pip install docling`.

## Commands

```powershell
python -m official_evidence.cli ingest
python -m official_evidence.cli validate
python -m official_evidence.cli search "What is CTD section 3.2.P.8?"
python -m official_evidence.cli evaluate
uvicorn official_evidence.api:app --reload
```

The frontend uploads official PDFs to `POST /api/official-evidence/documents`. They are saved only to `OFFICIAL_PDFS_DIR` and queued for ingestion into `Mode2.CTD`; this API never writes to or reads `Mode2v2.UserCTD`.

The Atlas index must be named `vector_index` with a 384-dimensional cosine `embedding` vector. Its filter fields should include `is_current`, `document_id`, `document_version_id`, `source_document.guideline`, `module`, and `section_number`.

Ingestion is idempotent for the same PDF SHA-256 and pipeline version. When a source changes, the prior document version is retained but marked `is_current: false`; retrieval always filters current records. Chunks are section- and paragraph-aware, include their section context, retain source page, and do not fabricate CTD mappings for non-CTD guideline headings.
