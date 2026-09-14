import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Info,
  Link2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';
import { Card, PageHeader, ScoreRing } from '@/components/common';

export function AnalysisPage() {
  const [running, setRunning] = useState(false);
  const [complete, setComplete] = useState(true);

  const run = () => {
    setRunning(true);
    setComplete(false);
    window.setTimeout(() => {
      setRunning(false);
      setComplete(true);
    }, 1800);
  };

  const pipeline = [
    { title: 'Package structure', detail: 'CTD hierarchy and naming conventions', done: true },
    { title: 'Document intelligence', detail: 'Extracting content and key references', done: true },
    { title: 'Requirement matching', detail: 'Comparing against ICH M4 criteria', done: true },
    { title: 'Readiness scoring', detail: 'Prioritizing gaps by filing impact', done: complete },
  ];

  return (
    <>
      <Link
        href="/submissions/sub-2408"
        className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"
        data-testid="link-back-analysis"
      >
        <ArrowLeft className="h-4 w-4" /> Lumineximab overview
      </Link>
      <PageHeader
        eyebrow="ReguLens Assist"
        title="Readiness analysis"
        description="A transparent review of the dossier against ICH M4 structure and filing expectations."
        action={
          <button
            onClick={run}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold hover:bg-muted"
            data-testid="button-rerun-analysis"
          >
            <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} /> {running ? 'Processing...' : 'Run again'}
          </button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-extrabold">Analysis pipeline</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {running ? 'Processing your dossier now' : complete ? 'Completed today at 10:42 AM' : 'Waiting to start'}
              </p>
            </div>
            <div
              className={`grid h-10 w-10 place-items-center rounded-xl ${
                running ? 'bg-[#fff4da] text-[#a57524]' : 'bg-[#e3f5f1] text-primary'
              }`}
            >
              {running ? <RefreshCw className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
            </div>
          </div>
          <div className="mt-7 space-y-0">
            {pipeline.map((item, index) => (
              <div key={item.title} className="relative flex gap-4 pb-7 last:pb-0">
                <div className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-4 border-card bg-[#e3f5f1] text-primary">
                  {item.done ? <Check className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-[#dce8e6]" />}
                </div>
                {index < pipeline.length - 1 && (
                  <div className="absolute left-[15px] top-8 h-[calc(100%-16px)] w-px bg-[#dbece9]" />
                )}
                <div>
                  <p className="text-xs font-bold">{item.title}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-base font-extrabold">Readiness result</h2>
              <p className="mt-1 text-xs text-muted-foreground">Based on 1,284 documents across 82 sections</p>
            </div>
            <ScoreRing score={84} size={94} />
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-[#e6f6ef] p-4">
              <CheckCircle2 className="h-4 w-4 text-[#4c9a7c]" />
              <p className="mt-4 font-display text-xl font-extrabold">68</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Sections ready</p>
            </div>
            <div className="rounded-xl bg-[#fff5df] p-4">
              <Info className="h-4 w-4 text-[#ad7b28]" />
              <p className="mt-4 font-display text-xl font-extrabold">11</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Need attention</p>
            </div>
            <div className="rounded-xl bg-[#fcedea] p-4">
              <AlertCircle className="h-4 w-4 text-[#c75d52]" />
              <p className="mt-4 font-display text-xl font-extrabold">3</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Critical gaps</p>
            </div>
          </div>
          <div className="mt-6 rounded-xl border border-[#d9eeea] bg-[#f5fbfa] p-4">
            <div className="flex gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs leading-relaxed text-[#4d7470]">
                <strong className="text-foreground">The short version:</strong> this dossier is in good shape, but it
                is not ready to submit yet. Start with the integrated efficacy summary and specification
                justification.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <div className="border-b border-border/70 px-5 py-4">
          <h2 className="font-display text-base font-extrabold">What changed since your last scan</h2>
          <p className="mt-1 text-xs text-muted-foreground">A focused view of new findings and resolved items</p>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-3">
          <div className="flex gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#e4f6ee] text-[#4b987a]">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold">12 sections improved</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Across Modules 2 and 3</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#fff4dc] text-[#ad7b28]">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold">2 new attention items</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Both in clinical evidence</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#e4f3f5] text-[#3d98a1]">
              <Link2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold">47 references mapped</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Evidence graph expanded</p>
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}
