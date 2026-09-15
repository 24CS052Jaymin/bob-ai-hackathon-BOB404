import { ArrowLeft, ArrowRight, Clock3, FileCheck2, Loader2, RefreshCw, Sparkles, Target, Trash2, UploadCloud } from 'lucide-react';
import type { ElementType } from 'react';
import { useState } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { Card, PageHeader, ProgressBar, ScoreRing, StatusBadge } from '@/components/common';
import { deleteSubmission } from '@/lib/api';
import { useSubmission } from '@/hooks/useSubmission';

const tabs: [string, string][] = [
  ['', 'Overview'],
  ['/analysis', 'Analysis'],
  ['/modules', 'Modules'],
  ['/gaps', 'Gaps'],
  ['/evidence', 'Evidence'],
];

export function SubmissionOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const { submission, report, loading, error, refetch } = useSubmission(id);
  const [, navigate] = useLocation();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!id || !submission) return;
    if (!window.confirm(`Delete "${submission.product_name}"? This removes all evidence and analysis data and cannot be undone.`)) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteSubmission(id);
      navigate('/submissions');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground" data-testid="overview-loading">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading submission…
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="p-10 text-center" data-testid="overview-error">
        <p className="text-sm font-bold text-destructive">{error ?? 'Submission not found'}</p>
        <button onClick={refetch} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-bold hover:bg-muted">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  const criticalGaps = report?.gaps?.filter((g) => g.severity === 'CRITICAL' && g.status !== 'Resolved').length ?? submission.critical_gaps ?? 0;
  const overallScore = report?.overall_score ?? submission.readiness_score ?? 0;
  const present = report?.requirements?.filter((r) => r.status === 'PRESENT').length ?? 0;
  const totalReqs = report?.requirements?.length ?? 0;
  const modulesFromReport = report?.module_scores ?? [];

  return (
    <>
      <Link
        href="/submissions"
        className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"
        data-testid="link-back-submissions-overview"
      >
        <ArrowLeft className="h-4 w-4" /> All submissions
      </Link>
      <PageHeader
        eyebrow={`${submission.submission_type} · ${submission.region}`}
        title={submission.product_name}
        description={`${submission.sponsor} · Target submission ${submission.target_date || '—'}`}
        action={
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl border border-red-200 px-3.5 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
              data-testid="button-delete-submission"
            >
              {deleting ? <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 inline h-3.5 w-3.5" />}
              Delete
            </button>
            <Link
              href={`/submissions/${submission.submission_id}/analysis`}
              className="rounded-xl bg-brand-gradient px-4 py-2.5 text-xs font-bold text-white shadow-soft"
              data-testid="link-run-analysis"
            >
              <Sparkles className="mr-1.5 inline h-3.5 w-3.5" /> Open analysis
            </Link>
          </div>
        }
      />

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 shadow-soft">
        {tabs.map(([path, label]) => (
          <Link
            key={label}
            href={`/submissions/${submission.submission_id}${path}`}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold ${
              path === '' ? 'bg-[#e9f7f4] text-[#369a96]' : 'text-muted-foreground hover:bg-muted'
            }`}
            data-testid={`link-submission-tab-${label.toLowerCase()}`}
          >
            {label}
            {label === 'Gaps' && criticalGaps > 0 && (
              <span className="ml-1.5 rounded-full bg-[#fce9e5] px-1.5 py-0.5 text-[9px] text-[#c75d52]">
                {criticalGaps}
              </span>
            )}
          </Link>
        ))}
      </div>

      {deleteError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          {deleteError}
        </div>
      )}

      {/* ── No-report banner ── */}
      {!report && (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#d4ece8] bg-[#f0faf8] p-5 sm:flex-row sm:items-center">
          <Sparkles className="h-5 w-5 shrink-0 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">No analysis has been run yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload your dossier PDFs and run a readiness analysis to see scores, module breakdown, and gap register.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/submissions/${submission.submission_id}/evidence`}
              className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-bold hover:bg-muted"
            >
              Upload evidence
            </Link>
            <Link
              href={`/submissions/${submission.submission_id}/analysis`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-gradient px-4 py-2 text-xs font-bold text-white shadow-soft"
            >
              <Sparkles className="h-3.5 w-3.5" /> Run analysis
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <ScoreRing score={overallScore} size={144} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <StatusBadge>{submission.status}</StatusBadge>
                <span className="text-[11px] text-muted-foreground">
                  Updated {new Date(submission.updated_at).toLocaleDateString()}
                </span>
              </div>
              <h2 className="mt-3 font-display text-xl font-extrabold">
                {report?.summary
                  ? report.summary.split('.')[0] + '.'
                  : report
                  ? overallScore >= 75
                    ? 'Good progress, with a few decisions left'
                    : 'Evidence gaps need to be addressed'
                  : 'Ready to start your readiness review'}
              </h2>
              {report?.summary && (
                <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground">
                  {report.summary}
                </p>
              )}
              {!report && (
                <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground">
                  Upload your CTD evidence documents and run the analysis to generate a readiness score.
                </p>
              )}
              {totalReqs > 0 && (
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex-1">
                    <ProgressBar value={Math.round((present / totalReqs) * 100)} />
                  </div>
                  <span className="text-xs font-bold">{present}/{totalReqs} requirements met</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-extrabold">Readiness focus</h2>
          </div>
          <div className="mt-5 space-y-4">
            <div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Critical gaps</span>
                <strong className="text-[#c75d52]">{criticalGaps} open</strong>
              </div>
              <ProgressBar value={criticalGaps > 0 ? Math.min(100, criticalGaps * 10) : 0} color="bg-[#e9806e]" />
            </div>
            {report && (
              <>
                <div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Requirements met</span>
                    <strong>{totalReqs > 0 ? `${Math.round((present / totalReqs) * 100)}%` : '—'}</strong>
                  </div>
                  <ProgressBar value={totalReqs > 0 ? Math.round((present / totalReqs) * 100) : 0} />
                </div>
                <div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Evidence documents</span>
                    <strong>{report.evidence_stats?.total_documents ?? 0}</strong>
                  </div>
                  <ProgressBar value={Math.min(100, (report.evidence_stats?.total_documents ?? 0) * 10)} />
                </div>
              </>
            )}
          </div>
          <Link
            href={`/submissions/${submission.submission_id}/gaps`}
            className="mt-5 inline-flex items-center text-xs font-bold text-primary hover:underline"
            data-testid="link-review-gaps"
          >
            Review open gaps <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Card>
      </div>

      {modulesFromReport.length > 0 && (
        <div className="mt-5">
          <Card>
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
              <div>
                <h2 className="font-display text-base font-extrabold">CTD module readiness</h2>
                <p className="mt-1 text-xs text-muted-foreground">Score and completeness by module</p>
              </div>
              <Link href={`/submissions/${submission.submission_id}/modules`} className="text-xs font-bold text-primary" data-testid="link-view-modules">
                View details <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-border/70">
              {modulesFromReport.map((module) => (
                <div key={module.module} className="flex items-center gap-4 px-5 py-4">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#eaf7f5] text-[10px] font-extrabold text-[#3da5a0]">
                    M{module.module}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-bold">{module.label}</span>
                      <StatusBadge>{module.status}</StatusBadge>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <ProgressBar value={module.score} />
                      <span className="w-8 text-right text-[10px] font-bold">{module.score}</span>
                    </div>
                  </div>
                  <span className="hidden text-[10px] text-muted-foreground sm:block">
                    {module.present}/{module.total} sections
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <div className="mt-5">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-extrabold">Quick actions</h2>
              <p className="mt-1 text-xs text-muted-foreground">Continue working on this submission</p>
            </div>
            <Clock3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-5 space-y-5">
            <ActivityItem title="Upload evidence documents" meta="Add CTD module PDFs" icon={UploadCloud} href={`/submissions/${submission.submission_id}/evidence`} />
            <ActivityItem title="Run readiness analysis" meta="Compare against ICH M4 requirements" icon={Sparkles} href={`/submissions/${submission.submission_id}/analysis`} />
            <ActivityItem title="Review gap register" meta="Prioritize critical findings" icon={FileCheck2} href={`/submissions/${submission.submission_id}/gaps`} />
          </div>
        </Card>
      </div>
    </>
  );
}

function ActivityItem({ title, meta, icon: Icon, href }: { title: string; meta: string; icon: ElementType; href: string }) {
  return (
    <Link href={href} className="flex gap-3 hover:opacity-80">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#edf8f6] text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs font-bold">{title}</p>
        <p className="mt-1 text-[10px] text-muted-foreground">{meta}</p>
      </div>
    </Link>
  );
}
