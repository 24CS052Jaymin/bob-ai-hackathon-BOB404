import { ArrowRight, FileText, Loader2, Plus, RefreshCw, Share2, Sparkles } from 'lucide-react';
import { Link } from 'wouter';
import { Card, PageHeader, StatusBadge } from '@/components/common';
import { useSubmissions } from '@/hooks/useSubmission';
import type { SubmissionRecord } from '@/lib/api';

export function ReportsPage() {
  const { submissions, loading, error, refetch } = useSubmissions();

  // A "report" is derived from each submission that has a readiness score (has been analysed)
  const analysedSubmissions = submissions.filter(
    (s) => s.readiness_score != null || s.status === 'Ready to submit' || s.status === 'In review',
  );

  return (
    <>
      <PageHeader
        eyebrow="Workspace outputs"
        title="Reports"
        description="Shareable readiness summaries derived from your submission analyses."
        action={
          <Link
            href="/submissions"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-xs font-bold text-white shadow-soft hover:-translate-y-0.5"
            data-testid="button-generate-report"
          >
            <Plus className="h-4 w-4" /> New submission
          </Link>
        }
      />

      {loading && (
        <div className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading reports…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-bold text-destructive">{error}</p>
          <button onClick={refetch} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-bold hover:bg-muted">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-5 lg:grid-cols-[1fr_0.46fr]">
          <Card className="overflow-hidden">
            <div className="border-b border-border/70 px-5 py-4">
              <h2 className="font-display text-base font-extrabold">Readiness reports</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {analysedSubmissions.length} report{analysedSubmissions.length !== 1 ? 's' : ''} available
              </p>
            </div>
            {analysedSubmissions.length === 0 ? (
              <div className="p-10 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-3 text-sm font-bold">No reports yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Run an analysis on a submission to generate a report.
                </p>
                <Link href="/submissions" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-bold hover:bg-muted">
                  View submissions <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border/70">
                {analysedSubmissions.map((sub) => (
                  <ReportRow key={sub.submission_id} sub={sub} />
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e3f5f1] text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-display text-base font-extrabold">Make review easier</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Review readiness reports for each submission and share with your regulatory team.
            </p>
            <div className="mt-5 space-y-2">
              <Link
                href="/submissions"
                className="flex w-full items-center justify-between rounded-xl border border-border p-3 text-left text-xs font-bold hover:bg-muted"
                data-testid="button-generate-readiness"
              >
                <span>View all submissions</span>
                <ArrowRight className="h-4 w-4 text-primary" />
              </Link>
              <Link
                href="/requirements"
                className="flex w-full items-center justify-between rounded-xl border border-border p-3 text-left text-xs font-bold hover:bg-muted"
                data-testid="button-generate-gap"
              >
                <span>Browse ICH M4 requirements</span>
                <ArrowRight className="h-4 w-4 text-primary" />
              </Link>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

function ReportRow({ sub }: { sub: SubmissionRecord }) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center" data-testid={`row-report-${sub.submission_id}`}>
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf7f5] text-primary">
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold">{sub.product_name} readiness report</p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {new Date(sub.updated_at).toLocaleDateString()} · {sub.submission_type} · {sub.submission_id}
        </p>
      </div>
      <StatusBadge>{sub.status}</StatusBadge>
      <div className="flex gap-1">
        <Link
          href={`/submissions/${sub.submission_id}/analysis`}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
          aria-label={`View report for ${sub.product_name}`}
          data-testid={`button-view-report-${sub.submission_id}`}
        >
          <ArrowRight className="h-4 w-4" />
        </Link>
        <button
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
          aria-label={`Share ${sub.product_name} report`}
          data-testid={`button-share-report-${sub.submission_id}`}
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
