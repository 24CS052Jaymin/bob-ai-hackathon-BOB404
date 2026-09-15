import {
  Activity,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  FileCheck2,
  FolderOpen,
  Gauge,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Link } from 'wouter';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, MetricCard, ProgressBar, ScoreRing, StatusBadge } from '@/components/common';
import { useSubmissions } from '@/hooks/useSubmission';
import type { SubmissionRecord } from '@/lib/api';

export function DashboardPage() {
  const { submissions, loading, error, refetch } = useSubmissions();

  // Derived stats — all come from the backend
  const active = submissions.filter((s) => s.status !== 'Draft');
  const readinessValues = submissions
    .map((s) => s.readiness_score)
    .filter((v): v is number => v != null);
  const avgReadiness =
    readinessValues.length > 0
      ? Math.round(readinessValues.reduce((a, b) => a + b, 0) / readinessValues.length)
      : 0;
  const totalCritical = submissions.reduce((sum, s) => sum + (s.critical_gaps ?? 0), 0);

  const ready = submissions.filter((s) => s.status === 'Ready to submit').length;
  const inReview = submissions.filter((s) => s.status === 'In review').length;
  const atRisk = submissions.filter(
    (s) => s.status === 'Processing' || (s.status === 'In review' && (s.critical_gaps ?? 0) > 3),
  ).length;

  // Trend chart: use readiness scores of most recent submissions as a bar chart
  const chartData = submissions
    .slice(0, 6)
    .reverse()
    .map((s, i) => ({ name: s.product_name.slice(0, 6), value: s.readiness_score ?? 0, index: i }));

  return (
    <>
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            Workspace overview
          </div>
          <h1 className="font-display text-[28px] font-extrabold tracking-[-0.04em] text-foreground md:text-[34px]">
            Submission readiness
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            A clear view of what needs your attention before the next filing milestone.
          </p>
        </div>
        <Link
          href="/submissions/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-xs font-bold text-white shadow-soft hover:-translate-y-0.5"
          data-testid="link-new-submission"
        >
          <Plus className="h-4 w-4" /> New submission
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading dashboard…
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-bold text-destructive">Failed to load dashboard data</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          <button onClick={refetch} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-bold hover:bg-muted">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Active submissions" value={`${active.length}`} note={`${submissions.length} total`} accent="bg-[#62cec5]" icon={FolderOpen} />
            <MetricCard label="Average readiness" value={`${avgReadiness}%`} note={`Across ${submissions.length} submission${submissions.length !== 1 ? 's' : ''}`} accent="bg-[#65c6df]" icon={Gauge} />
            <MetricCard label="Open critical gaps" value={`${totalCritical}`} note="Across all submissions" accent="bg-[#e9806e]" icon={AlertCircle} />
            <MetricCard label="Ready to submit" value={`${ready}`} note={`${inReview} in review`} accent="bg-[#f2c965]" icon={FileCheck2} />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_1fr]">
            <Card className="p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-extrabold">Readiness by submission</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Current readiness score per submission</p>
                </div>
              </div>
              <div className="mt-5 h-[220px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ left: -20, right: 4, top: 5, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#edf2f1" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#899598' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#899598' }} domain={[0, 100]} />
                      <Tooltip cursor={{ fill: '#f3f9f8' }} contentStyle={{ border: '1px solid #e5efed', borderRadius: 10, fontSize: 11 }} />
                      <Bar dataKey="value" fill="#5fc7c1" radius={[5, 5, 0, 0]} barSize={25} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    No readiness data yet — run an analysis on a submission.
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-base font-extrabold">Portfolio health</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Where your submissions stand today</p>
                </div>
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#e4f5f1]">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="mt-6 flex items-center gap-5">
                <ScoreRing score={avgReadiness} size={124} />
                <div className="flex-1 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <i className="h-2 w-2 rounded-full bg-[#58c9c5]" /> Ready
                    </span>
                    <strong>{ready}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <i className="h-2 w-2 rounded-full bg-[#f2c965]" /> In review
                    </span>
                    <strong>{inReview}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <i className="h-2 w-2 rounded-full bg-[#e9806e]" /> At risk
                    </span>
                    <strong>{atRisk}</strong>
                  </div>
                </div>
              </div>
              {submissions.length > 0 && (
                <div className="mt-7 rounded-xl bg-[#f1faf8] p-3 text-xs leading-relaxed text-[#4f7773]">
                  <Sparkles className="mr-1.5 inline h-3.5 w-3.5" />
                  {totalCritical > 0
                    ? `Close ${totalCritical} critical gap${totalCritical !== 1 ? 's' : ''} to improve overall readiness.`
                    : 'No critical gaps detected — your portfolio is in good shape.'}
                </div>
              )}
            </Card>
          </div>

          <div className="mt-5">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
                <div>
                  <h2 className="font-display text-base font-extrabold">Active submissions</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Latest workspace activity</p>
                </div>
                <Link href="/submissions" className="text-xs font-bold text-primary hover:underline" data-testid="link-view-all-submissions">
                  View all <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
                </Link>
              </div>
              {submissions.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-sm font-bold">No submissions yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Create your first submission to start tracking readiness.</p>
                  <Link href="/submissions/new" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-xs font-bold text-white shadow-soft">
                    <Plus className="h-4 w-4" /> New submission
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border/70">
                  {submissions.slice(0, 4).map((item) => (
                    <SubmissionRow key={item.submission_id} item={item} />
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}

function SubmissionRow({ item }: { item: SubmissionRecord }) {
  return (
    <Link
      href={`/submissions/${item.submission_id}/analysis`}
      className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#f8fcfb]"
      data-testid={`row-submission-${item.submission_id}`}
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e5f6f3] text-xs font-extrabold text-[#47aaa8]">
        {item.product_name.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-xs font-bold">{item.product_name}</span>
          <StatusBadge>{item.status}</StatusBadge>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {item.sponsor} · {item.region}
        </p>
      </div>
      <div className="hidden w-24 sm:block">
        <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
          <span>Readiness</span>
          <strong className="text-foreground">{item.readiness_score != null ? `${item.readiness_score}%` : '—'}</strong>
        </div>
        <ProgressBar value={item.readiness_score ?? 0} />
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
