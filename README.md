# 🚀 ReguLens

> ⚠️ **Replace everything in `[ ]` brackets with your actual content before submission.**

---

## 👥 Team

| Field | Value |
|---|---|
| **Team Name** | [BOB404]   |
| **Track** | [AI / ML ] |
| **Team Lead** | [Jaymin Mandaliya] — [24cs052@charusat.edu.in] |
| **Members** | [Mishri Bhanwadia], [Priya Aghera], [Jenil Bhisra] |

---

## 🎯 Problem Statement

> In 2–3 sentences: What problem does your project solve? Who experiences this problem?

Regulatory and pharmacovigilance teams must review large safety datasets and Common Technical Document (CTD) dossiers before they can make confident submission decisions. Manual review makes it difficult to identify safety signals, trace supporting evidence, and prioritise incomplete regulatory sections.

---

## 💡 Solution

> In 2–3 sentences: What did you build? How does it solve the problem above?

ReguLens is a two-mode regulatory intelligence workspace. Mode 1 analyses FAERS safety data to surface and review potential signals, while Mode 2 extracts CTD evidence from PDFs and compares an applicant dossier with a curated ICH requirement catalogue to produce readiness, module, and gap reports.

---

## ✨ Key Features

- **FAERS safety analysis:** Upload and analyse safety-report data, with cleaning, clustering, proportional reporting ratio (PRR) calculations, and signal review.
- **CTD PDF ingestion:** Extract dossier text, headings, and evidence chunks from PDF files with page-level provenance.
- **Readiness assessment:** Compare curated ICH CTD requirements against applicant evidence and classify coverage as present, partial, or missing.
- **Traceable gap reporting:** Present overall and module-level scores, prioritised gaps, matched evidence, and recommendations.
- **Resilient evidence retrieval:** Combine embedding similarity, CTD-section alignment, and keyword evidence so reports remain useful when a remote vector index is unavailable.

---

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| **Languages** | Python, TypeScript |
| **Frameworks** | FastAPI, React, Vite |
| **IBM Technologies** | IBM Bob, IBM Docling |
| **Databases** | MongoDB Atlas (Mode 2), PostgreSQL (Mode 1) |
| **Other** | SentenceTransformers, PyMuPDF, Docling, scikit-learn, GitHub Actions |

---

## 📁 Repository Structure

```
├── src/                  # All source code
├── docs/                 # Written documentation
│   ├── problem-statement.md
│   ├── solution-overview.md
│   ├── architecture.md
│   └── setup-guide.md
├── demo/                 # Demo artifacts
│   ├── screenshots/      # App screenshots
│   └── demo-video-link.txt  # Link to demo video
├── presentation/         # Slide deck
└── submission.yaml       # Structured submission metadata
```

---

## ⚡ How to Run

> **Copy these exact steps from your [`docs/setup-guide.md`](docs/setup-guide.md)**

```bash
# 1. Clone the repo
git clone https://github.com/24CS052Jaymin/bob-ai-hackathon-BOB404.git
cd bob-ai-hackathon-BOB404

# 2. Install dependencies
python -m pip install -r src/backend/requirements.txt
npm install --prefix src/frontend/mode2

# 3. Configure environment
cp src/backend/.env.example src/backend/.env
# Edit .env with your values

# 4. Run the project
# Terminal 1: Mode 2 API
cd src/backend
python main.py

# Terminal 2: Mode 2 web application
cd src/frontend/mode2
npm run dev
```

---

## 🖥️ Demo

| Artifact | Link |
|---|---|
| 📹 Demo Video | [See demo/demo-video-link.txt](demo/demo-video-link.txt) |
| 🌐 Live Demo | [See demo/live-demo-url.txt](demo/live-demo-url.txt) |
| 🖼️ Screenshots | [See demo/screenshots/](demo/screenshots/) |
| 📊 Presentation | [See presentation/slides.pdf](presentation/) |

---

## ⚠️ Known Limitations

> Be honest — judges appreciate transparency over overclaiming.

- Authentication and production-grade role-based access control are not implemented.
- Mode 2 depends on configured MongoDB access and the availability of the selected embedding model; a local deterministic retrieval fallback supports report generation when vector search is unavailable.
- Results support evidence review and prioritisation; they are not a substitute for a qualified regulatory review or submission decision.

---

## 🏅 What We're Most Proud Of

The strongest part of ReguLens is its end-to-end evidence traceability: a team can move from a raw safety dataset or CTD PDF to an interpretable signal or readiness report, then inspect the supporting source evidence and prioritised gaps.

---
