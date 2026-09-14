import { Activity, AlertCircle, ArrowLeft, Clock3, Download, ListFilter, MoreHorizontal, Target, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';
import { Card, MetricCard, PageHeader, StatusBadge } from '@/components/common';
import { gaps as initialGaps } from '@/data/mock-data';
import type { Gap } from '@/types';

export function GapsPage() {
  const [severity, setSeverity] = useState('All severity');
  const [status, setStatus] = useState('All status');
  const [localGaps, setLocalGaps] = useState(initialGaps);

  const filtered = localGaps.filter(
    (gap) => (severity === 'All severity' || gap.severity === severity) && (status === 'All status' || gap.status === status),
  );

  const resolve = (gap: Gap) =>
    setLocalGaps((items) => items.map((item) => (item.id === gap.id ? { ...item, status: 'Resolved' } : item)));

  return (
    <>
      <Link
        href="/submissions/sub-2408"
        className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"
        data-testid="link-back-gaps"
      >
        <ArrowLeft className="h-4 w-4" /> Lumineximab overview
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
        <MetricCard
          label="Total open gaps"
          value={`${localGaps.filter((g) => g.status !== 'Resolved').length}`}
          note="Across 3 modules"
          accent="bg-[#e9806e]"
          icon={AlertCircle}
        />
        <MetricCard
          label="Critical"
          value={`${localGaps.filter((g) => g.severity === 'Critical' && g.status !== 'Resolved').length}`}
          note="Need immediate action"
          accent="bg-[#e9806e]"
          icon={Target}
        />
        <MetricCard
          label="In progress"
          value={`${localGaps.filter((g) => g.status === 'In progress').length}`}
          note="Owners are assigned"
          accent="bg-[#f2c965]"
          icon={Activity}
        />
      </div>

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
              <option>Critical</option>
              <option>Major</option>
              <option>Minor</option>
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
          {filtered.map((gap) => (
            <div key={gap.id} className="p-5">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="flex min-w-0 flex-1 gap-3">
                  <div
                    className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                      gap.severity === 'Critical' ? 'bg-[#fce9e5] text-[#c75d52]' : 'bg-[#fff4dc] text-[#a57524]'
                    }`}
                  >
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold">{gap.title}</h3>
                      <StatusBadge>{gap.severity}</StatusBadge>
                      <StatusBadge>{gap.status}</StatusBadge>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{gap.description}</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {gap.module} · {gap.section}
                      </span>
                      <span>
                        <UserRound className="mr-1 inline h-3 w-3" /> {gap.owner}
                      </span>
                      <span>
                        <Clock3 className="mr-1 inline h-3 w-3" /> Due {gap.dueDate}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 md:self-start">
                  {gap.status !== 'Resolved' && (
                    <button
                      onClick={() => resolve(gap)}
                      className="rounded-lg border border-border px-3 py-2 text-[11px] font-bold hover:bg-muted"
                      data-testid={`button-resolve-gap-${gap.id}`}
                    >
                      Mark resolved
                    </button>
                  )}
                  <button
                    className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                    aria-label={`More options for ${gap.title}`}
                    data-testid={`button-more-gap-${gap.id}`}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
