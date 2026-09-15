# Mode 2 official evidence backend

The service keeps two MongoDB layers separate:

- `Mode2.CTD` stores official PDF evidence chunks and 384-dimensional embeddings.
- `Mode2.CTD_REQUIREMENTS` stores curated regulatory expectations only when they are linked to official evidence chunks.

## Run

```powershell
cd src/backend
python -m pip install -r requirements.txt
uvicorn official_evidence.api:app --reload --port 8000
```

Set MongoDB credentials in `.env` or the process environment. Upload PDFs through the Mode 2 Official CTD library or `POST /api/official-evidence/documents`.

The current implementation uses PyMuPDF for page text and provenance, optional Docling enrichment for document structure, and SentenceTransformers for production embeddings. It deliberately does not implement applicant comparison, readiness scoring, or UserCTD.
