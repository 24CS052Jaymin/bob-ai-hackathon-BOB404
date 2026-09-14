import { ArrowLeft, ArrowRight, Check, CheckCircle2, FileCheck2, FileText, UploadCloud } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, PageHeader } from '@/components/common';

const steps = ['Submission details', 'Upload dossier', 'Review & create'];

export function NewSubmissionPage() {
  const [step, setStep] = useState(1);
  const [product, setProduct] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [, setLocation] = useLocation();

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

      <div className="mb-7 flex items-center justify-center gap-0">
        {steps.map((label, index) => (
          <div key={label} className="flex items-center">
            <div className={`flex items-center gap-2 ${step >= index + 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <span
                className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                  step > index + 1 ? 'bg-primary text-white' : step === index + 1 ? 'bg-brand-gradient text-white' : 'bg-muted'
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
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-lg font-extrabold">Tell us about the product</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                These details will anchor your CTD structure and readiness criteria.
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
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:border-primary"
                  placeholder="e.g. Northstar Therapeutics"
                  data-testid="input-sponsor-name"
                />
              </label>
              <label className="text-xs font-bold">
                Submission type
                <select
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
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:border-primary"
                  data-testid="input-target-date"
                />
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div>
              <h2 className="font-display text-lg font-extrabold">Add your dossier files</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload a complete package or start with the documents you have ready.
              </p>
            </div>
            <label className="mt-6 flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-primary/50 bg-[#f4fbfa] p-6 text-center hover:bg-[#edf9f7]">
              <input
                type="file"
                multiple
                className="sr-only"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []).map((file) => file.name))}
                data-testid="input-dossier-files"
              />
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#dff4f0] text-primary">
                <UploadCloud className="h-6 w-6" />
              </div>
              <p className="mt-4 text-sm font-bold">Drop files here or browse</p>
              <p className="mt-1 text-xs text-muted-foreground">PDF, DOCX, XLSX up to 250 MB per file</p>
            </label>
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file) => (
                  <div key={file} className="flex items-center gap-3 rounded-xl border border-border p-3 text-xs">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="flex-1 font-semibold">{file}</span>
                    <CheckCircle2 className="h-4 w-4 text-[#4d9b7c]" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e3f5f1] text-primary">
              <FileCheck2 className="h-7 w-7" />
            </div>
            <h2 className="mt-5 font-display text-xl font-extrabold">Ready to create your workspace?</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              ReguLens will structure your CTD, map the evidence you uploaded, and begin a readiness scan.
            </p>
            <div className="mx-auto mt-6 max-w-sm rounded-xl bg-[#f7faf9] p-4 text-left text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product</span>
                <strong>{product || 'New product'}</strong>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-muted-foreground">Files attached</span>
                <strong>{files.length || 'None yet'}</strong>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-between border-t border-border/70 pt-5">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : setLocation('/submissions'))}
            className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold hover:bg-muted"
            data-testid="button-wizard-back"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          <button
            onClick={() => (step < 3 ? setStep(step + 1) : setLocation('/submissions/sub-2408'))}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-2.5 text-xs font-bold text-white shadow-soft hover:-translate-y-0.5"
            data-testid="button-wizard-next"
          >
            {step === 3 ? 'Create workspace' : 'Continue'} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </Card>
    </div>
  );
}
