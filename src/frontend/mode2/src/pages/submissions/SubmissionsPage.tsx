import { ChevronRight, Filter, Loader2, Plus, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';
import { Card, PageHeader, ProgressBar, StatusBadge } from '@/components/common';
import { useSubmissions } from '@/hooks/useSubmission';
import type { SubmissionRecord } from '@/lib/api';

function statusLabel(s: SubmissionRecord['status']): string {
  return s;
}

export function SubmissionsPage() {
  const { submissions, loading, error, refetch } = useSubmissions();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All status');

  const filtered = submissions.filter(
    (item) =>
      `${item.product_name} ${item.sponsor} ${item.region}`.toLowerCase().includes(query.toLowerCase()) &&
      (filter === 'All status' || item.status === filter),
  );

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Submissions"
        description="Track every dossier from first upload to filing-ready."
        action={
          <Link
            href="/submissions/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-xs font-bold text-white shadow-soft hover:-translate-y-0.5"
            data-testid="link-create-submission"
          >
            <Plus className="h-4 w-4" /> Create submission
          </Link>
        }
      />
      <Card>
        <div className="flex flex-col gap-3 border-b border-border/70 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-xs outline-none focus:border-primary"
              placeholder="Search by product, sponsor, or region..."
              aria-label="Search submissions"
              data-testid="input-search-submissions"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-10 appearance-none rounded-xl border border-border bg-background pl-3 pr-9 text-xs font-semibold outline-none focus:border-primary"
                aria-label="Filter by status"
                data-testid="select-status-filter"
              >
                <option>All status</option>
                <option>Draft</option>
                <option>In review</option>
                <option>Processing</option>
                <option>Ready to submit</option>
              </select>
              <Filter className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
            <button
              onClick={refetch}
              className="grid h-10 w-10 place-items-center rounded-xl border border-border hover:bg-muted"
              aria-label="Refresh submissions"
              data-testid="button-refresh-submissions"
            >
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground" data-testid="submissions-loading">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading submissions…
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="p-8 text-center" data-testid="submissions-error">
            <p className="text-sm font-bold text-destructive">Failed to load submissions</p>
            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
            <button onClick={refetch} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-bold hover:bg-muted">
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        )}

        {/* Table */}
        {!loading && !error && (
          <>
            <div className="hidden grid-cols-[1.55fr_1fr_0.75fr_0.75fr_0.7fr_24px] gap-4 bg-[#fbfdfc] px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground md:grid">
              <span>Submission</span>
              <span>Region</span>
              <span>Target date</span>
              <span>Readiness</span>
              <span>Status</span>
              <span />
            </div>
            <div className="divide-y divide-border/70">
              {filtered.length ? (
                filtered.map((item) => (
                  <Link
                    key={item.submission_id}
                    href={`/submissions/${item.submission_id}/analysis`}
                    className="grid gap-3 px-5 py-4 hover:bg-[#f8fcfb] md:grid-cols-[1.55fr_1fr_0.75fr_0.75fr_0.7fr_24px] md:items-center md:gap-4"
                    data-testid={`table-row-submission-${item.submission_id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e5f6f3] text-xs font-extrabold text-[#47aaa8]">
                        {item.product_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold">{item.product_name}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {item.submission_type} · {item.sponsor}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{item.region}</span>
                    <span className="text-xs font-semibold">{item.target_date || '—'}</span>
                    <div>
                      <div className="mb-1 flex justify-between text-[10px]">
                        <span className="text-muted-foreground md:hidden">Readiness</span>
                        <strong>{item.readiness_score != null ? `${item.readiness_score}%` : '—'}</strong>
                      </div>
                      <ProgressBar value={item.readiness_score ?? 0} />
                    </div>
                    <span>
                      <StatusBadge>{statusLabel(item.status)}</StatusBadge>
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))
              ) : (
                <div className="p-12 text-center">
                  <Search className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-3 text-sm font-bold">
                    {submissions.length === 0 ? 'No submissions yet' : 'No submissions found'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {submissions.length === 0
                      ? 'Create your first submission to get started.'
                      : 'Try another search or status filter.'}
                  </p>
                  {submissions.length === 0 && (
                    <Link
                      href="/submissions/new"
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-xs font-bold text-white shadow-soft"
                    >
                      <Plus className="h-4 w-4" /> Create submission
                    </Link>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </>
  );
}
