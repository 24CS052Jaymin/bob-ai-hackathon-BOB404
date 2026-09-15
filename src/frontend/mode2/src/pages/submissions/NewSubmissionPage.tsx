import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileCheck2,
  FileText,
  LoaderCircle,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, PageHeader } from '@/components/common';
import { createSubmission, uploadDocuments } from '@/lib/api';

const steps = ['Submission details', 'Upload dossier', 'Review & create'];

interface IngestionResult {
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

export function NewSubmissionPage() {
  const [step, setStep] = useState(1);
  const [product, setProduct] = useState('');
  const [sponsor, setSponsor] = useState('');
  const [submissionType, setSubmissionType] = useState('NDA');
  const [region, setRegion] = useState('US / FDA');
  const [targetDate, setTargetDate] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ingestionResults, setIngestionResults] = useState<IngestionResult[]>([]);
  const [ingestionError, setIngestionError] = useState<string>();
  const [, setLocation] = useLocation();

  const addFiles = (incoming: FileList | File[]) => {
    const accepted = Array.from(incoming).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
    );
    setFiles((cur) => [
      ...cur,
      ...accepted.filter((f) => !cur.some((e) => e.name === f.name && e.size === f.size)),
    ]);
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    setIngestionError(undefined);

    try {
      // 1. Create submission record via backend
      const sub = await createSubmission({
        product_name: product || 'New submission',
        sponsor,
        region,
        submission_type: submissionType,
        target_date: targetDate,
      });

      const submissionId = sub.submission_id;

      // 2. Upload files if any
      if (files.length > 0) {
        const result = await uploadDocuments(submissionId, files);
        setIngestionResults(result.documents ?? []);
        // Navigate after a short delay to show the report
        setTimeout(() => setLocation(`/submissions/${submissionId}/evidence`), 2400);
      } else {
        // No files — navigate straight to the submission overview
        setLocation(`/submissions/${submissionId}`);
      }
    } catch (err) {
      setIngestionError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[920px]">
      <Link
        href="/submissions"
        className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"
        data-testid="link-back-submissions"
      >
        <ArrowLeft className="h-4 w-4" /> Back to submissions
      </Link>
      <PageHeader
        eyebrow="New workspace item"
        title="Create a submission"
        description="Set up a dossier workspace and let ReguLens organize the readiness review."
      />

      {/* Step indicator */}
      <div className="mb-7 flex items-center justify-center gap-0">
        {steps.map((label, index) => (
          <div key={label} className="flex items-center">
            <div className={`flex items-center gap-2 ${step >= index + 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <span
                className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                  step > index + 1
                    ? 'bg-primary text-white'
                    : step === index + 1
                    ? 'bg-brand-gradient text-white'
                    : 'bg-muted'
                }`}
              >
                {step > index + 1 ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <span className="hidden text-xs font-bold sm:block">{label}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`mx-3 h-px w-10 sm:mx-5 sm:w-20 ${step > index + 1 ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      <Card className="p-6 md:p-8">
        {/* ── Step 1: Product details ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-lg font-extrabold">Tell us about the product</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                These details anchor your CTD structure and readiness criteria.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="text-xs font-bold">
                Product name
                <input
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:border-primary"
                  placeholder="e.g. Lumineximab"
                  data-testid="input-product-name"
                />
              </label>
              <label className="text-xs font-bold">
                Sponsor organization
                <input
                  value={sponsor}
                  onChange={(e) => setSponsor(e.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:border-primary"
                  placeholder="e.g. Northstar Therapeutics"
                  data-testid="input-sponsor-name"
                />
              </label>
              <label className="text-xs font-bold">
                Submission type
                <select
                  value={submissionType}
                  onChange={(e) => setSubmissionType(e.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:border-primary"
                  data-testid="select-submission-type"
                >
                  <option>NDA</option>
                  <option>BLA</option>
                  <option>MAA</option>
                  <option>IND</option>
                </select>
              </label>
              <label className="text-xs font-bold">
                Target region
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:border-primary"
                  data-testid="select-target-region"
                >
                  <option>US / FDA</option>
                  <option>EU / EMA</option>
                  <option>UK / MHRA</option>
                  <option>JP / PMDA</option>
                </select>
              </label>
              <label className="text-xs font-bold md:col-span-2">
                Target submission date
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:border-primary"
                  data-testid="input-target-date"
                />
              </label>
            </div>
          </div>
        )}

        {/* ── Step 2: Upload dossier ── */}
        {step === 2 && (
          <div>
            <div>
              <h2 className="font-display text-lg font-extrabold">Add your dossier files</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload PDF documents from your CTD. Files are processed through PyMuPDF + Docling and stored
                in the UserCTD vector index. You can skip this step and upload later.
              </p>
            </div>
            <label
              className="mt-6 flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-primary/50 bg-[#f4fbfa] p-6 text-center hover:bg-[#edf9f7]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(e.dataTransfer.files);
              }}
            >
              <input
                type="file"
                multiple
                accept=".pdf,application/pdf"
                className="sr-only"
                onChange={(e) => addFiles(e.target.files ?? [])}
                data-testid="input-dossier-files"
              />
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#dff4f0] text-primary">
                <UploadCloud className="h-6 w-6" />
              </div>
              <p className="mt-4 text-sm font-bold">Drop PDF files here or browse</p>
              <p className="mt-1 text-xs text-muted-foreground">PDF only · up to 250 MB per file</p>
            </label>
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file) => (
                  <div key={file.name} className="flex items-center gap-3 rounded-xl border border-border p-3 text-xs">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="flex-1 font-semibold">{file.name}</span>
                    <span className="text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                    <button
                      type="button"
                      onClick={() => setFiles((cur) => cur.filter((f) => f !== file))}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${file.name}`}
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Review & create ── */}
        {step === 3 && (
          <div className="text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e3f5f1] text-primary">
              <FileCheck2 className="h-7 w-7" />
            </div>
            <h2 className="mt-5 font-display text-xl font-extrabold">Ready to create your workspace?</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              A submission record will be created in MongoDB Mode2, and any uploaded PDFs will be ingested
              into UserCTD (vector_index1) ready for analysis.
            </p>

            {/* Summary panel */}
            <div className="mx-auto mt-6 max-w-sm rounded-xl bg-[#f7faf9] p-4 text-left text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product</span>
                <strong>{product || 'New product'}</strong>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-muted-foreground">Sponsor</span>
                <strong>{sponsor || '—'}</strong>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-muted-foreground">Submission type</span>
                <strong>{submissionType}</strong>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-muted-foreground">Files attached</span>
                <strong>{files.length > 0 ? `${files.length} PDF${files.length > 1 ? 's' : ''}` : 'None — skip ingestion'}</strong>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-muted-foreground">Target</span>
                <strong>{region}</strong>
              </div>
            </div>

            {/* Error */}
            {ingestionError && (
              <div className="mx-auto mt-4 max-w-sm rounded-xl border border-red-200 bg-red-50 p-3 text-left text-xs text-red-700">
                <strong>Error:</strong> {ingestionError}
              </div>
            )}

            {/* Ingestion report (shown after successful upload) */}
            {ingestionResults.length > 0 && (
              <div className="mx-auto mt-4 max-w-sm space-y-2 text-left">
                {ingestionResults.map((res) => (
                  <div
                    key={res.document_id}
                    className="rounded-xl border border-[#cce9dd] bg-[#f0faf5] p-3 text-xs"
                  >
                    <div className="flex items-center gap-2 font-bold text-[#43896e]">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      {res.source_file}
                      {res.duplicate && (
                        <span className="ml-auto rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] text-yellow-700">
                          Duplicate — skipped
                        </span>
                      )}
                    </div>
                    {res.ingestion && !res.duplicate && (
                      <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
                        <span>Pages: <strong>{res.ingestion.pages_extracted}</strong></span>
                        <span>Sections: <strong>{res.ingestion.sections_detected}</strong></span>
                        <span>Chunks: <strong>{res.ingestion.chunks_created}</strong></span>
                        <span>Dims: <strong>{res.ingestion.embedding_dimensions}</strong></span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex justify-between border-t border-border/70 pt-5">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : setLocation('/submissions'))}
            disabled={isSubmitting}
            className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold hover:bg-muted disabled:opacity-50"
            data-testid="button-wizard-back"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          <button
            onClick={() => (step < 3 ? setStep(step + 1) : handleCreate())}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-2.5 text-xs font-bold text-white shadow-soft hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0"
            data-testid="button-wizard-next"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" /> Creating…
              </>
            ) : step === 3 ? (
              <>Create workspace <ArrowRight className="h-4 w-4" /></>
            ) : (
              <>Continue <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </div>
      </Card>
    </div>
  );
}
