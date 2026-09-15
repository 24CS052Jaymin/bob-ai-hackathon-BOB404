import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Cpu,
  Database,
  FileCode,
  FileText,
  Hash,
  Layers,
  LibraryBig,
  LoaderCircle,
  Network,
  Search,
  Sparkles,
  Table,
  UploadCloud,
  X,
} from 'lucide-react';
import { DragEvent, useRef, useState } from 'react';
import { Card, PageHeader } from '@/components/common';

const API_URL = import.meta.env.VITE_OFFICIAL_EVIDENCE_API_URL ?? 'http://localhost:8000';

interface IngestionPhaseStats {
  phase1_official_pdf?: { filename: string; file_size_bytes: number; hash: string };
  phase2_dual_engine?: {
    pymupdf: { pages_extracted: number; total_characters: number };
    docling: { structure_enriched: boolean; engine: string };
  };
  phase3_document_structure?: {
    detected_sections_count: number;
    sections: Array<{ number: string; title: string; page: number }>;
  };
  phase4_ctd_passages?: {
    ctd_modules: string[];
    ctd_sections: string[];
  };
  phase5_chunks_embeddings?: {
    chunks_created: number;
    embedding_model: string;
    embedding_dimensions: number;
  };
  phase6_mongodb_vector?: {
    database: string;
    collection: string;
    vector_index: string;
    requirements_created: number;
    requirements_linked: number;
  };
}

interface IngestionResult {
  document_id: string;
  document_version_id: string;
  filename: string;
  file_size_bytes: number;
  source_file_hash: string;
  pipeline?: IngestionPhaseStats;
  chunks_created: number;
  requirements_created: number;
  requirements_linked: number;
}

interface SearchChunk {
  chunk_id: string;
  source_file: string;
  source_section: string;
  section_title: string;
  module: string | null;
  text: string;
  score?: number;
  source_page: number;
}

const PIPELINE_PHASES = [
  {
    id: 1,
    name: 'OFFICIAL REGULATORY PDFs',
    desc: 'PDF drop & SHA-256 hash versioning',
    engine: 'File Ingestion',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 2,
    name: 'PyMuPDF + Docling Dual Engine',
    desc: 'PyMuPDF (text & page numbers) + Docling (structure, headings & tables)',
    engine: 'Dual Parsing Engine',
    color: 'from-cyan-500 to-teal-500',
  },
  {
    id: 3,
    name: 'Document Structure',
    desc: 'Structured Document with section hierarchy and layout mapping',
    engine: 'Structure Reconstruction',
    color: 'from-teal-500 to-emerald-500',
  },
  {
    id: 4,
    name: 'CTD Sections & Regulatory Passages',
    desc: 'Section-aware CTD partitioning (Modules 1-5)',
    engine: 'CTD Partitioning',
    color: 'from-emerald-500 to-green-500',
  },
  {
    id: 5,
    name: 'Requirement/Evidence Chunks & Embeddings',
    desc: '384-dimensional vector embeddings with MiniLM model',
    engine: 'Vector Embedding Engine',
    color: 'from-green-500 to-emerald-600',
  },
  {
    id: 6,
    name: 'MongoDB Vector Indexing',
    desc: 'Target: BOB → Mode2 → CTD collection with vector_index',
    engine: 'MongoDB Vector Search',
    color: 'from-emerald-600 to-teal-700',
  },
];

export function OfficialCtdPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [results, setResults] = useState<IngestionResult[]>([]);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchChunk[]>([]);
  const [searchError, setSearchError] = useState<string>();

  const addFiles = (incoming: FileList | File[]) => {
    const accepted = Array.from(incoming).filter(
      (file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    );
    if (accepted.length !== Array.from(incoming).length) {
      setError('Only PDF files can be added to the official CTD library.');
    } else {
      setError(undefined);
    }
    setFiles((current) => [
      ...current,
      ...accepted.filter(
        (file) => !current.some((existing) => existing.name === file.name && existing.size === file.size)
      ),
    ]);
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };

  const simulateStepProgression = async () => {
    for (let step = 1; step <= 6; step++) {
      setActiveStep(step);
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
  };

  const upload = async () => {
    if (!files.length) return;
    setIsUploading(true);
    setError(undefined);
    setMessage(undefined);
    setResults([]);
    setActiveStep(1);

    const stepTimer = simulateStepProgression();

    try {
      const payload = new FormData();
      files.forEach((file) => payload.append('files', file));
      const response = await fetch(`${API_URL}/api/official-evidence/documents`, {
        method: 'POST',
        body: payload,
      });
      await stepTimer;
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail ?? 'The official PDFs could not be uploaded.');

      setResults(body.documents ?? []);
      setMessage(
        `${files.length} official regulatory PDF${files.length === 1 ? '' : 's'} successfully ingested into MongoDB BOB → Mode2 → CTD (vector_index).`
      );
      setFiles([]);
      setActiveStep(6);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'The upload failed.');
      setActiveStep(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError(undefined);
    try {
      const response = await fetch(
        `${API_URL}/api/official-evidence/search?query=${encodeURIComponent(searchQuery)}&limit=8`
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? 'Search failed');
      setSearchResults(data.chunks ?? []);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Failed to retrieve CTD vector search results.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1180px] space-y-8">
      <PageHeader
        eyebrow="BOB → Mode2 → CTD Knowledge Base"
        title="Official Regulatory CTD Ingestion"
        description="Upload official regulatory PDFs (ICH, FDA, EMA). Ingested documents pass through PyMuPDF + Docling dual-engine extraction, section chunking, and embedding generation into MongoDB BOB → Mode2 → CTD vector index."
      />

      {/* 6-Phase Pipeline Architecture Diagram */}
      <Card className="overflow-hidden border border-border/70 p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e3f5f1] text-primary">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-extrabold text-foreground">
                6-Phase Ingestion Architecture
              </h2>
              <p className="text-xs text-muted-foreground">
                Dual Engine: PyMuPDF (text & metadata) + Docling (structure & tables) → MongoDB Vector Index
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dff4f0] px-3 py-1 text-xs font-bold text-primary">
            <Database className="h-3.5 w-3.5" />
            BOB → Mode2 → CTD → vector_index
          </span>
        </div>

        {/* Visual Architecture Flow */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PIPELINE_PHASES.map((phase) => {
            const isActive = isUploading && activeStep === phase.id;
            const isCompleted = activeStep > phase.id || (activeStep === 6 && !isUploading);
            return (
              <div
                key={phase.id}
                className={`relative flex flex-col justify-between rounded-2xl border p-4.5 transition-all duration-300 ${
                  isActive
                    ? 'border-primary bg-[#f0faf8] shadow-md ring-2 ring-primary/30'
                    : isCompleted
                    ? 'border-emerald-200 bg-[#f4fbf8]'
                    : 'border-border/80 bg-card hover:border-primary/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
                      0{phase.id}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {phase.engine}
                    </span>
                  </div>
                  <h3 className="mt-2.5 font-display text-xs font-bold text-foreground">
                    {phase.name}
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {phase.desc}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-2.5">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    Phase {phase.id} of 6
                  </span>
                  {isActive ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Processing
                    </span>
                  ) : isCompleted ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-muted-foreground/60">Idle</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Upload Box Card */}
      <Card className="p-6 md:p-8">
        <div className="flex gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e3f5f1] text-primary">
            <LibraryBig className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-extrabold">Upload Official CTD Regulatory PDFs</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Uploaded PDFs undergo page-level text extraction with PyMuPDF and structural layout parsing with Docling before chunking into CTD section passages.
            </p>
          </div>
        </div>

        <label
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={`mt-6 flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center transition-all ${
            isDragging
              ? 'border-primary bg-[#eaf8f6]'
              : 'border-primary/50 bg-[#f4fbfa] hover:bg-[#edf9f7]'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="sr-only"
            onChange={(event) => event.target.files && addFiles(event.target.files)}
            data-testid="input-official-ctd-files"
          />
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#dff4f0] text-primary">
            <UploadCloud className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm font-bold">Drop official CTD PDFs here or click to browse</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Accepts PDF format (ICH M4, FDA Guidance, EMA Guidelines)
          </p>
        </label>

        {files.length > 0 && (
          <div className="mt-5 space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Selected Files ({files.length})
            </p>
            {files.map((file) => (
              <div
                key={`${file.name}-${file.size}`}
                className="flex items-center gap-3 rounded-xl border border-border p-3 text-xs bg-card"
              >
                <FileText className="h-4 w-4 text-primary" />
                <span className="flex-1 truncate font-semibold">{file.name}</span>
                <span className="text-muted-foreground font-mono">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
                <button
                  onClick={() => setFiles((current) => current.filter((item) => item !== file))}
                  className="rounded p-1 text-muted-foreground hover:bg-muted"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Status Messages */}
        {error && (
          <p className="mt-4 rounded-xl bg-[#fce9e5] px-4 py-3 text-xs font-semibold text-[#b45148]" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-[#e4f6ee] px-4 py-3 text-xs font-semibold text-[#398969]">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {message}
          </p>
        )}

        {/* Action Button */}
        <div className="mt-6 flex justify-end border-t border-border/70 pt-5">
          <button
            disabled={!files.length || isUploading}
            onClick={upload}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-6 py-3 text-xs font-bold text-white shadow-soft hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="button-upload-official-ctd"
          >
            {isUploading ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Processing Ingestion (Phase 0{activeStep}/06)…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Run PyMuPDF + Docling Pipeline
              </>
            )}
          </button>
        </div>
      </Card>

      {/* Ingestion Results & Detailed Metadata */}
      {results.length > 0 && (
        <Card className="p-6 md:p-8 border border-emerald-200 bg-[#f9fdfc]">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-extrabold text-foreground">
                Pipeline Ingestion Complete ({results.length} document{results.length === 1 ? '' : 's'})
              </h3>
              <p className="text-xs text-muted-foreground">
                Document data has been tokenized, section-mapped, embedded, and saved to MongoDB.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {results.map((res, index) => (
              <div
                key={res.document_id || index}
                className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <FileCode className="h-4 w-4 text-primary" />
                    <span className="font-bold text-sm text-foreground">{res.filename}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                      ID: {res.document_id}
                    </span>
                    <span className="rounded-md bg-emerald-50 text-emerald-700 px-2 py-0.5 font-mono text-[11px] font-bold">
                      SHA256: {res.source_file_hash.slice(0, 12)}…
                    </span>
                  </div>
                </div>

                {/* Pipeline Details Grid */}
                {res.pipeline && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    <div className="rounded-xl border border-border/60 p-3 bg-muted/20">
                      <div className="flex items-center gap-2 font-bold text-foreground">
                        <Cpu className="h-3.5 w-3.5 text-primary" /> PyMuPDF + Docling Engine
                      </div>
                      <div className="mt-2 space-y-1 text-muted-foreground text-[11px]">
                        <p>Pages Extracted: <span className="font-bold text-foreground">{res.pipeline.phase2_dual_engine?.pymupdf.pages_extracted}</span></p>
                        <p>Characters Parsed: <span className="font-bold text-foreground">{res.pipeline.phase2_dual_engine?.pymupdf.total_characters.toLocaleString()}</span></p>
                        <p>Docling Structure: <span className="font-bold text-emerald-600">Active / Enriched</span></p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/60 p-3 bg-muted/20">
                      <div className="flex items-center gap-2 font-bold text-foreground">
                        <Layers className="h-3.5 w-3.5 text-primary" /> CTD Structure & Passages
                      </div>
                      <div className="mt-2 space-y-1 text-muted-foreground text-[11px]">
                        <p>Sections Detected: <span className="font-bold text-foreground">{res.pipeline.phase3_document_structure?.detected_sections_count}</span></p>
                        <p>Modules Found: <span className="font-bold text-foreground">{res.pipeline.phase4_ctd_passages?.ctd_modules.join(', ') || 'General'}</span></p>
                        <p>Passage Chunks: <span className="font-bold text-foreground">{res.chunks_created}</span></p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/60 p-3 bg-muted/20">
                      <div className="flex items-center gap-2 font-bold text-foreground">
                        <Database className="h-3.5 w-3.5 text-primary" /> MongoDB Storage Target
                      </div>
                      <div className="mt-2 space-y-1 text-muted-foreground text-[11px]">
                        <p>Database: <span className="font-mono font-bold text-foreground">{res.pipeline.phase6_mongodb_vector?.database}</span></p>
                        <p>Collection: <span className="font-mono font-bold text-foreground">{res.pipeline.phase6_mongodb_vector?.collection}</span></p>
                        <p>Vector Index: <span className="font-mono font-bold text-primary">{res.pipeline.phase6_mongodb_vector?.vector_index}</span></p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* CTD Vector Search Explorer */}
      <Card className="p-6 md:p-8">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e3f5f1] text-primary">
            <Search className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-extrabold">Query Ingested CTD Vector Index</h2>
            <p className="text-xs text-muted-foreground">
              Perform semantic search against MongoDB <code className="rounded bg-muted px-1">BOB → Mode2 → CTD</code> collection using <code className="rounded bg-muted px-1">vector_index</code>.
            </p>
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="e.g., 'Stability testing storage conditions ICH Q1A(R2)' or 'Batch analysis section 3.2.P.5'"
              className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-xs font-medium outline-none placeholder:text-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-primary"
              data-testid="input-vector-search"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white hover:bg-primary/90 disabled:opacity-50"
            data-testid="button-execute-vector-search"
          >
            {isSearching ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Search CTD Index
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>

        {searchError && (
          <p className="mt-4 rounded-xl bg-[#fce9e5] px-4 py-3 text-xs font-semibold text-[#b45148]">
            {searchError}
          </p>
        )}

        {searchResults.length > 0 && (
          <div className="mt-6 space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Vector Search Matches ({searchResults.length})
            </p>
            {searchResults.map((chunk, idx) => (
              <div
                key={chunk.chunk_id || idx}
                className="rounded-xl border border-border/80 p-4 text-xs bg-card space-y-2 hover:border-primary/40 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-[#e3f5f1] px-2 py-0.5 font-bold text-primary text-[11px]">
                      {chunk.source_section || 'CTD Passage'}
                    </span>
                    <span className="font-bold text-foreground">{chunk.section_title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-mono">Page {chunk.source_page}</span>
                    {chunk.module && (
                      <span className="rounded bg-muted px-1.5 py-0.5 font-semibold">
                        {chunk.module}
                      </span>
                    )}
                    {chunk.score && (
                      <span className="font-mono text-emerald-600 font-bold">
                        Score: {(chunk.score * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed line-clamp-3">
                  {chunk.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
