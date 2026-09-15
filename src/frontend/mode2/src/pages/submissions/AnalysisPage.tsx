import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Info,
  Link2,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'wouter';
import { Card, PageHeader, ScoreRing } from '@/components/common';
import { getEvidence, runAnalysis } from '@/lib/api';
import { useSubmission } from '@/hooks/useSubmission';

export function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const { submission, report, loading, refetch } = useSubmission(id);
  const [running, setRunning] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const autoTriggered = useRef(false);

  const handleRun = async () => {
    if (!id) return;
    setRunning(true);
    setRunError(null);
    try {
      await runAnalysis(id);
      refetch();
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setRunning(false);
    }
  };

  // Auto-trigger: if no report but evidence documents exist, run analysis once on mount
  useEffect(() => {
    if (loading || report || running || autoTriggered.current || !id) return;
    autoTriggered.current = true;
    setPreparing(true);
    getEvidence(id)
      .then(async (ev) => {
        if ((ev.documents?.length ?? 0) > 0) {
          await handleRun();
        }
      })
      .catch(() => {
        // No documents or evidence fetch failed — user will click manually
      })
      .finally(() => setPreparing(false));
  // handleRun intentionally excluded — it's stable within each render cycle
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, id]);

  const analysing = preparing || running;

  const pipeline = [
    { title: 'Package structure', detail: 'CTD hierarchy and naming conventions', done: !!report },
    { title: 'Document intelligence', detail: 'Extracting content and key references', done: !!report },
    { title: 'Requirement matching', detail: 'Comparing against ICH M4 criteria', done: !!report },
    { title: 'Readiness scoring', detail: 'Prioritizing gaps by filing impact', done: !!report && !running },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  const present = report?.requirements?.filter((r) => r.status === 'PRESENT').length ?? 0;
  const partial = report?.requirements?.filter((r) => r.status === 'PARTIAL').length ?? 0;
  const missing = report?.requirements?.filter((r) => r.status === 'MISSING').length ?? 0;
  const totalReqs = report?.requirements?.length ?? 0;
  const score = report?.overall_score ?? 0;
  const evidenceDocs = report?.evidence_stats?.total_documents ?? 0;
  const timestamp = report?.analysis_timestamp
    ? new Date(report.analysis_timestamp).toLocaleString()
    : null;

  return (
    <>
      <Link
        href={`/submissions/${id}`}
        className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"
        data-testid="link-back-analysis"
      >
        <ArrowLeft className="h-4 w-4" /> {submission?.product_name ?? 'Submission'} overview
      </Link>
      <PageHeader
        eyebrow="ReguLens Assist"
        title="Readiness analysis"
        description="A transparent review of the dossier against ICH M4 structure and filing expectations."
        action={
          <button
            onClick={handleRun}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold hover:bg-muted disabled:opacity-60"
            data-testid="button-rerun-analysis"
          >
            <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} />
            {running ? 'Analysing… (10–60s)' : report ? 'Run again' : 'Run analysis'}
          </button>
        }
      />

      {runError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          {runError}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-extrabold">Analysis pipeline</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {analysing
                  ? 'Processing your dossier — this may take up to 60 seconds'
                  : report
                  ? `Completed ${timestamp ?? 'recently'}`
                  : 'Click "Run analysis" to start'}
              </p>
            </div>
            <div
              className={`grid h-10 w-10 place-items-center rounded-xl ${
                analysing ? 'bg-[#fff4da] text-[#a57524]' : report ? 'bg-[#e3f5f1] text-primary' : 'bg-muted text-muted-foreground'
              }`}
            >
              {analysing ? <Loader2 className="h-5 w-5 animate-spin" /> : report ? <CheckCircle2 className="h-5 w-5" /> : <Info className="h-5 w-5" />}
            </div>
          </div>
          <div className="mt-7 space-y-0">
            {pipeline.map((item, index) => (
              <div key={item.title} className="relative flex gap-4 pb-7 last:pb-0">
                <div className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-4 border-card bg-[#e3f5f1] text-primary">
                  {item.done ? <Check className="h-3.5 w-3.5" /> : analysing ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="h-2 w-2 rounded-full bg-[#dce8e6]" />}
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
          {report ? (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-base font-extrabold">Readiness result</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Based on {evidenceDocs} document{evidenceDocs !== 1 ? 's' : ''} across {totalReqs} requirements
                  </p>
                </div>
                <ScoreRing score={score} size={94} />
              </div>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-[#e6f6ef] p-4">
                  <CheckCircle2 className="h-4 w-4 text-[#4c9a7c]" />
                  <p className="mt-4 font-display text-xl font-extrabold">{present}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Requirements met</p>
                </div>
                <div className="rounded-xl bg-[#fff5df] p-4">
                  <Info className="h-4 w-4 text-[#ad7b28]" />
                  <p className="mt-4 font-display text-xl font-extrabold">{partial}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Partial coverage</p>
                </div>
                <div className="rounded-xl bg-[#fcedea] p-4">
                  <AlertCircle className="h-4 w-4 text-[#c75d52]" />
                  <p className="mt-4 font-display text-xl font-extrabold">{missing}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Missing evidence</p>
                </div>
              </div>
              {report.summary && (
                <div className="mt-6 rounded-xl border border-[#d9eeea] bg-[#f5fbfa] p-4">
                  <div className="flex gap-3">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p className="text-xs leading-relaxed text-[#4d7470]">{report.summary}</p>
                  </div>
                </div>
              )}
            </>
          ) : analysing ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-bold">Analyzing your uploaded CTD…</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Matching your evidence to regulatory requirements and preparing module scores and gap findings.
              </p>
            </div>
          ) : (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-bold">No analysis yet</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Upload evidence documents first, then run the analysis to see your readiness score.
              </p>
              <Link href={`/submissions/${id}/evidence`} className="text-xs font-bold text-primary hover:underline">
                Upload documents <Link2 className="ml-1 inline h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
