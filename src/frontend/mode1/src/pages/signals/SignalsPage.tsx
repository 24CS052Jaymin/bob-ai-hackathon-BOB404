import { ArrowLeft, ArrowRight, Filter, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Badge, Button, PageHeader } from '@/components/common';
import { useApp } from '@/context/AppProvider';

export function SignalsPage() {
  const { signals: allSignals } = useApp();
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState('All priorities');
  const [status, setStatus] = useState('All statuses');
  const [sort, setSort] = useState<'prr' | 'reports'>('prr');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(
    () =>
      allSignals
        .filter(
          (s) =>
            (!query || `${s.drug} ${s.event} ${s.id}`.toLowerCase().includes(query.toLowerCase())) &&
            (priority === 'All priorities' || s.priority === priority) &&
            (status === 'All statuses' || s.status === status),
        )
        .sort((a, b) => (sort === 'prr' ? b.prr - a.prr : b.reports - a.reports)),
    [allSignals, query, priority, status, sort],
  );

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const shown = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [query, priority, status, sort]);

  return (
    <div className="mx-auto max-w-[1440px] animate-enter">
      <PageHeader
        eyebrow="Signal detection"
        title="Signals"
        description="Review drug–event pairs surfaced by proportional reporting analysis."
        actions={
          <Link
            href="/safety/upload"
            data-testid="link-signals-new-analysis"
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3.5 py-2.5 text-xs font-bold text-white"
          >
            <Plus size={15} /> New analysis
          </Link>
        }
      />

      <div className="surface mb-5 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              data-testid="input-signal-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search drug, event, or signal ID"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-teal-400"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              data-testid="select-signal-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600"
            >
              <option>All priorities</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
            <select
              data-testid="select-signal-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600"
            >
              <option>All statuses</option>
              <option>New</option>
              <option>In review</option>
              <option>Monitoring</option>
              <option>Closed</option>
            </select>
            <select
              data-testid="select-signal-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as 'prr' | 'reports')}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600"
            >
              <option value="prr">Sort: PRR</option>
              <option value="reports">Sort: reports</option>
            </select>
            <Button testId="button-signal-filter" variant="secondary" icon={<Filter size={14} />}>
              Filters
            </Button>
          </div>
        </div>
      </div>

      <div className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="text-xs font-bold text-slate-600">
            <span className="mono text-teal-700">{filtered.length}</span> signals match your view
          </div>
          <div className="hidden items-center gap-2 text-[11px] text-slate-400 sm:flex">
            <span className="status-dot bg-rose-400" /> High priority <span className="status-dot ml-2 bg-amber-400" /> Medium priority
          </div>
        </div>
        <div className="responsive-table overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3 font-bold">Signal</th>
                <th className="px-5 py-3 font-bold">PRR</th>
                <th className="px-5 py-3 font-bold">95% CI</th>
                <th className="px-5 py-3 font-bold">Trend</th>
                <th className="px-5 py-3 font-bold">Reports</th>
                <th className="px-5 py-3 font-bold">Priority</th>
                <th className="px-5 py-3 font-bold">Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.id} className="table-row border-t border-slate-100" onClick={() => setLocation(`/safety/signals/${s.id}`)}>
                  <td data-label="Signal" className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${s.priority === 'High' ? 'bg-rose-400' : s.priority === 'Medium' ? 'bg-amber-400' : 'bg-teal-400'}`} />
                      <div>
                        <div className="text-xs font-bold text-slate-700">{s.drug}</div>
                        <div className="mt-0.5 text-xs text-slate-400">{s.event}</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="PRR" className="mono px-5 py-3.5 text-xs font-bold text-teal-700">
                    {s.prr.toFixed(2)}
                  </td>
                  <td data-label="95% CI" className="mono px-5 py-3.5 text-[11px] text-slate-500">
                    {s.confidenceInterval}
                  </td>
                  <td data-label="Trend" className="px-5 py-3.5">
                    <div className={`flex items-center gap-1 text-[11px] font-bold ${s.trend === 'Rising' ? 'text-rose-500' : s.trend === 'Stable' ? 'text-amber-600' : 'text-teal-600'}`}>
                      {s.trend === 'Rising' ? (
                        <ArrowRight size={13} className="-rotate-45" />
                      ) : s.trend === 'Declining' ? (
                        <ArrowRight size={13} className="rotate-45" />
                      ) : (
                        <span>→</span>
                      )}
                      {s.trend}
                    </div>
                  </td>
                  <td data-label="Reports" className="mono px-5 py-3.5 text-xs text-slate-600">
                    {s.reports}
                  </td>
                  <td data-label="Priority" className="px-5 py-3.5">
                    <Badge tone={s.priority === 'High' ? 'red' : s.priority === 'Medium' ? 'amber' : 'teal'}>{s.priority}</Badge>
                  </td>
                  <td data-label="Status" className="px-5 py-3.5">
                    <Badge tone={s.status === 'In review' ? 'amber' : s.status === 'Monitoring' ? 'teal' : s.status === 'Closed' ? 'slate' : 'green'}>
                      {s.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400">
                    <ArrowRight size={16} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && (
            <div className="p-12 text-center">
              <Search size={24} className="mx-auto text-slate-300" />
              <div className="mt-3 text-sm font-bold text-slate-600">No signals found</div>
              <div className="mt-1 text-xs text-slate-400">Try a different term or filter.</div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <div className="text-[11px] text-slate-400">
            Showing {filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
          </div>
          <div className="flex gap-1.5">
            <button
              data-testid="button-signals-previous"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 disabled:opacity-30"
            >
              <ArrowLeft size={14} />
            </button>
            {Array.from({ length: Math.min(5, pages) }, (_, i) => (
              <button
                key={i}
                data-testid={`button-signals-page-${i + 1}`}
                onClick={() => setPage(i + 1)}
                className={`h-8 w-8 rounded-lg text-[11px] font-bold ${page === i + 1 ? 'bg-teal-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {i + 1}
              </button>
            ))}
            <button
              data-testid="button-signals-next"
              disabled={page === pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 disabled:opacity-30"
            >
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
