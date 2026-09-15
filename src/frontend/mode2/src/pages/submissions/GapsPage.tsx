import { Activity, AlertCircle, ArrowLeft, ChevronDown, ChevronUp, Download, ListFilter, Loader2, RefreshCw, Target } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'wouter';
import { Card, MetricCard, PageHeader, StatusBadge } from '@/components/common';
import { useGaps } from '@/hooks/useSubmission';
import { getGapRecommendation } from '@/lib/api';
import type { GapRecord, Recommendation } from '@/lib/api';

export function GapsPage() {
  const { id } = useParams<{ id: string }>();
  const [severity, setSeverity] = useState('All severity');
  const [status, setStatus] = useState('All status');
  const [expandedGap, setExpandedGap] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);

  const { gaps, loading, error, refetch } = useGaps(id);

  const filtered = gaps.filter(
    (gap) =>
      (severity === 'All severity' || gap.severity.toUpperCase() === severity.toUpperCase()) &&
      (status === 'All status' || gap.status === status),
  );

  const openCount = gaps.filter((g) => g.status !== 'Resolved').length;
  const criticalCount = gaps.filter((g) => g.severity === 'CRITICAL' && g.status !== 'Resolved').length;
  const inProgressCount = gaps.filter((g) => g.status === 'In progress').length;

  const handleExpand = async (gap: GapRecord) => {
    if (expandedGap === gap.gap_id) {
      setExpandedGap(null);
      setRecommendation(null);
      return;
    }
    setExpandedGap(gap.gap_id);
    setRecommendation(null);
    setRecError(null);
    setRecLoading(true);
    try {
      const res = await getGapRecommendation(id!, gap.gap_id);
      setRecommendation(res.recommendation);
    } catch (err) {
      setRecError(err instanceof Error ? err.message : 'Failed to load recommendation');
    } finally {
      setRecLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading gaps…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center">
        <p className="text-sm font-bold text-destructive">{error}</p>
        <button onClick={refetch} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-bold hover:bg-muted">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <Link
        href={`/submissions/${id}`}
        className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"
        data-testid="link-back-gaps"
      >
        <ArrowLeft className="h-4 w-4" /> Submission overview
      </Link>
      <PageHeader
        eyebrow="Triage workspace"
        title="Critical gaps"
        description="Prioritize the findings that could hold back a confident submission."
        action={
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold hover:bg-muted"
            data-testid="button-export-gaps"
          >
            <Download className="h-4 w-4" /> Export register
          </button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <MetricCard label="Total open gaps" value={`${openCount}`} note="Across all modules" accent="bg-[#e9806e]" icon={AlertCircle} />
        <MetricCard label="Critical" value={`${criticalCount}`} note="Need immediate action" accent="bg-[#e9806e]" icon={Target} />
        <MetricCard label="In progress" value={`${inProgressCount}`} note="Being addressed" accent="bg-[#f2c965]" icon={Activity} />
      </div>

      {gaps.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <p className="text-sm font-bold">No gaps found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Run an analysis first to discover gaps in your submission.
          </p>
          <Link href={`/submissions/${id}/analysis`} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-xs font-bold text-white shadow-soft">
            Run analysis
          </Link>
        </div>
      ) : (
        <Card>
          <div className="flex flex-col gap-3 border-b border-border/70 p-4 md:flex-row">
            <div className="flex items-center gap-2 text-xs font-bold">
              <ListFilter className="h-4 w-4 text-primary" /> Filter findings
            </div>
            <div className="flex gap-2 md:ml-auto">
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-semibold"
                aria-label="Filter gaps by severity"
                data-testid="select-gap-severity"
              >
                <option>All severity</option>
                <option>CRITICAL</option>
                <option>MAJOR</option>
                <option>MINOR</option>
              </select>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-semibold"
                aria-label="Filter gaps by status"
                data-testid="select-gap-status"
              >
                <option>All status</option>
                <option>Open</option>
                <option>In progress</option>
                <option>Resolved</option>
              </select>
            </div>
          </div>
          <div className="divide-y divide-border/70">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">No gaps match the current filters.</div>
            ) : (
              filtered.map((gap) => (
                <div key={gap.gap_id} className="p-5">
                  <div className="flex flex-col gap-4 md:flex-row">
                    <div className="flex min-w-0 flex-1 gap-3">
                      <div
                        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                          gap.severity === 'CRITICAL' ? 'bg-[#fce9e5] text-[#c75d52]' : 'bg-[#fff4dc] text-[#a57524]'
                        }`}
                      >
                        <AlertCircle className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold">{gap.section_title}</h3>
                          <StatusBadge>{gap.severity}</StatusBadge>
                          <StatusBadge>{gap.status}</StatusBadge>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{gap.finding}</p>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {gap.module} · {gap.section_number}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:self-start">
                      <button
                        onClick={() => handleExpand(gap)}
                        className="rounded-lg border border-border px-3 py-2 text-[11px] font-bold hover:bg-muted"
                        data-testid={`button-recommend-gap-${gap.gap_id}`}
                      >
                        {expandedGap === gap.gap_id ? (
                          <><ChevronUp className="mr-1 inline h-3.5 w-3.5" /> Hide</>
                        ) : (
                          <><ChevronDown className="mr-1 inline h-3.5 w-3.5" /> Recommend</>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Recommendation panel */}
                  {expandedGap === gap.gap_id && (
                    <div className="mt-4 rounded-xl border border-[#d9eeea] bg-[#f5fbfa] p-4">
                      {recLoading && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /> Generating recommendation…
                        </div>
                      )}
                      {recError && (
                        <p className="text-xs text-red-600">{recError}</p>
                      )}
                      {recommendation && !recLoading && (
                        <div className="space-y-3 text-xs">
                          <div>
                            <p className="font-bold text-foreground">Problem</p>
                            <p className="mt-1 text-muted-foreground">{recommendation.problem}</p>
                          </div>
                          {recommendation.what_is_missing.length > 0 && (
                            <div>
                              <p className="font-bold text-foreground">What is missing</p>
                              <ul className="mt-1 list-inside list-disc space-y-1 text-muted-foreground">
                                {recommendation.what_is_missing.map((item, i) => (
                                  <li key={i}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-foreground">Recommended action</p>
                            <p className="mt-1 text-muted-foreground">{recommendation.recommended_action}</p>
                          </div>
                          <div>
                            <p className="font-bold text-foreground">Why it matters</p>
                            <p className="mt-1 text-muted-foreground">{recommendation.why_it_matters}</p>
                          </div>
                          {recommendation.reference_evidence && (
                            <div>
                              <p className="font-bold text-foreground">Reference evidence</p>
                              <p className="mt-1 text-muted-foreground">{recommendation.reference_evidence}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </>
  );
}
