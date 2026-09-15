import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  Filter,
  Info,
  Loader2,
  RefreshCw,
  Search,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useParams } from 'wouter';
import { Card, PageHeader, StatusBadge } from '@/components/common';
import { useEvidence } from '@/hooks/useSubmission';
import { uploadDocuments } from '@/lib/api';
import type { RequirementTrace } from '@/lib/api';

interface UploadedDoc {
  document_id: string;
  source_file: string;
  duplicate: boolean;
  ingestion?: {
    pages_extracted: number;
    sections_detected: number;
    chunks_created: number;
    embedding_dimensions: number;
  };
}

export function EvidencePage() {
  const { id: submissionId } = useParams<{ id: string }>();
  const { evidence, loading, error, refetch } = useEvidence(submissionId);
  const [query, setQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [uploadError, setUploadError] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);

  const docs = evidence?.documents ?? [];
  const filtered = docs.filter((item) =>
    `${item.source_file}`.toLowerCase().includes(query.toLowerCase()),
  );

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !submissionId) return;
    const pdfs = Array.from(files).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
    );
    if (pdfs.length === 0) {
      setUploadError('Only PDF files are accepted.');
      return;
    }

    setIsUploading(true);
    setUploadError(undefined);

    try {
      const result = await uploadDocuments(submissionId, pdfs);
      setUploadedDocs((prev) => [...(result.documents ?? []), ...prev]);
      refetch();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <Link
        href={`/submissions/${submissionId}`}
        className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"
        data-testid="link-back-evidence"
      >
        <ArrowLeft className="h-4 w-4" /> Submission overview
      </Link>
      <PageHeader
        eyebrow="Evidence graph"
        title="Evidence & documents"
        description="Upload your dossier PDFs. Each file is extracted via PyMuPDF + Docling and stored in UserCTD (vector_index1)."
        action={
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-xs font-bold text-white shadow-soft hover:-translate-y-0.5">
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,application/pdf"
              className="sr-only"
              onChange={(e) => handleUpload(e.target.files)}
              data-testid="input-upload-evidence"
            />
            {isUploading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Ingesting…</>
            ) : (
              <><UploadCloud className="h-4 w-4" /> Upload evidence</>
            )}
          </label>
        }
      />

      {/* Upload error */}
      {uploadError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          <XCircle className="h-4 w-4 shrink-0" />
          {uploadError}
        </div>
      )}

      {/* Ingestion results */}
      {uploadedDocs.length > 0 && (
        <div className="mb-4 space-y-2">
          {uploadedDocs.map((doc) => (
            <div
              key={doc.document_id}
              className="flex flex-wrap items-start gap-3 rounded-xl border border-[#cce9dd] bg-[#f0faf5] p-3 text-xs"
              data-testid={`ingestion-result-${doc.document_id}`}
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#43896e]" />
              <div className="flex-1">
                <p className="font-bold text-[#43896e]">
                  {doc.source_file}
                  {doc.duplicate && (
                    <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] text-yellow-700">
                      Duplicate — already ingested
                    </span>
                  )}
                </p>
                {doc.ingestion && !doc.duplicate && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {doc.ingestion.pages_extracted} pages · {doc.ingestion.sections_detected} sections ·{' '}
                    {doc.ingestion.chunks_created} chunks · {doc.ingestion.embedding_dimensions}-d embeddings →{' '}
                    <span className="font-semibold">Mode2v2.UserCTD / vector_index1</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading documents…
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm font-bold text-destructive">{error}</p>
          <button onClick={refetch} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-bold hover:bg-muted">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      {/* Requirement traceability */}
      {!loading && (evidence?.requirement_trace?.length ?? 0) > 0 && (
        <Card className="mb-5">
          <div className="border-b border-border/70 px-5 py-4">
            <h2 className="font-display text-base font-extrabold">Evidence traceability</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Per-requirement evidence coverage from the latest analysis
            </p>
          </div>
          <div className="divide-y divide-border/70 max-h-80 overflow-y-auto">
            {evidence!.requirement_trace!.map((req: RequirementTrace) => (
              <div key={req.requirement_id} className="flex items-center gap-4 px-5 py-3">
                <div className="w-5 shrink-0">
                  {req.status === 'PRESENT' ? (
                    <CheckCircle2 className="h-4 w-4 text-[#43896e]" />
                  ) : req.status === 'PARTIAL' ? (
                    <Info className="h-4 w-4 text-[#ad7b28]" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-[#c75d52]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">
                    {req.section_number} — {req.section_title}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {req.matched_chunk_count} chunk{req.matched_chunk_count !== 1 ? 's' : ''} matched ·{' '}
                    {Math.round((req.confidence ?? 0) * 100)}% confidence
                  </p>
                </div>
                <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">{req.module}</span>
                <StatusBadge>{req.status}</StatusBadge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Document table */}
      {!loading && (
        <Card>
          <div className="flex flex-col gap-3 border-b border-border/70 p-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-background pl-10 text-xs outline-none focus:border-primary"
                placeholder="Search files or CTD sections..."
                aria-label="Search evidence"
                data-testid="input-search-evidence"
              />
            </div>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 text-xs font-bold hover:bg-muted"
              data-testid="button-evidence-filter"
            >
              <Filter className="h-4 w-4" /> Filter
            </button>
          </div>
          <div className="hidden grid-cols-[1.6fr_1fr_0.7fr_24px] gap-4 bg-[#fbfdfc] px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground md:grid">
            <span>Document</span>
            <span>Submission ID</span>
            <span>Ingested</span>
            <span />
          </div>
          <div className="divide-y divide-border/70">
            {filtered.length === 0 ? (
              <div className="p-10 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-3 text-sm font-bold">No documents yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Upload PDF files to start building your evidence base.</p>
              </div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.document_id}
                  className="grid gap-3 px-5 py-4 hover:bg-[#f8fcfb] md:grid-cols-[1.6fr_1fr_0.7fr_24px] md:items-center md:gap-4"
                  data-testid={`row-evidence-${item.document_id}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#edf7f6] text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold">{item.source_file}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {item.chunks_created ? `${item.chunks_created} chunks` : ''}{item.embedding_dimensions ? ` · ${item.embedding_dimensions}-d` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.submission_id}</span>
                  <span className="text-xs font-semibold">
                    {item.ingestion_timestamp ? new Date(item.ingestion_timestamp).toLocaleDateString() : '—'}
                  </span>
                  <button
                    className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                    aria-label={`Open ${item.source_file}`}
                    data-testid={`button-open-evidence-${item.document_id}`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </>
  );
}
