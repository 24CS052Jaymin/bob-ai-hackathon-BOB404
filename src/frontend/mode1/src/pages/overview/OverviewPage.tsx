import { AlertCircle, Activity, ArrowRight, ClipboardCheck, FileCheck2, Info, MoreHorizontal, Plus, Zap } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import { Badge, PageHeader, StatCard } from '@/components/common';
import { useApp } from '@/context/AppProvider';

// Chart data is derived at render time from real signals — no hard-coded values.
// The 8-element monthlyReports array on each Signal is used to build a time series.

export function OverviewPage() {
  const { signals, loading, backendError, notify } = useApp();
  const [, setLocation] = useLocation();
  const [range, setRange] = useState('Last 30 days');

  // Top 5 signals sorted by PRR descending
  const top = signals.slice().sort((a, b) => b.prr - a.prr).slice(0, 5);

  // Derive live stat values from real signals
  const totalSignals   = signals.length;
  const highPriority   = signals.filter((s) => s.priority === 'High').length;
  const totalReports   = signals.reduce((sum, s) => sum + s.reports, 0);
  const awaitingReview = signals.filter((s) => !s.reviewed && s.status !== 'Closed').length;

  // Build activity chart from the last 8 months of report counts summed across signals
  const monthLabels = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  const trendData = monthLabels.map((day, i) => ({
    day,
    signals: signals.reduce((sum, s) => sum + ((s.monthlyReports ?? [])[i] ?? 0), 0),
  }));

  return (
    <div className="mx-auto max-w-[1440px] animate-enter">
      <PageHeader
        eyebrow="Pharmacovigilance / signal detection"
        title="Safety overview"
        description="Screening activity across your latest FAERS analysis, with evidence ready for review."
        actions={
          <>
            <select
              data-testid="select-date-range"
              value={range}
              onChange={(e) => { setRange(e.target.value); notify(`Updated view to ${e.target.value}`); }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600"
            >
              <option>Last 30 days</option>
              <option>Last 90 days</option>
              <option>Year to date</option>
            </select>
            <Link
              href="/safety/upload"
              data-testid="link-start-analysis"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-teal-700"
            >
              <Plus size={15} /> New analysis
            </Link>
          </>
        }
      />

      {/* Backend error banner */}
      {backendError && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          <strong>Backend unreachable:</strong> {backendError} — start the API server and refresh.
        </div>
      )}

      {/* Stat cards — live values from backend signals */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Signals detected"
          value={loading ? '—' : totalSignals.toLocaleString()}
          delta={loading ? '' : `${highPriority} high priority`}
          icon={Activity}
        />
        <StatCard
          label="High-priority signals"
          value={loading ? '—' : highPriority.toString()}
          delta=""
          icon={AlertCircle}
          tone="rose"
        />
        <StatCard
          label="Reports screened"
          value={loading ? '—' : totalReports.toLocaleString()}
          delta=""
          icon={FileCheck2}
          tone="slate"
        />
        <StatCard
          label="Awaiting review"
          value={loading ? '—' : awaitingReview.toString()}
          delta=""
          icon={ClipboardCheck}
          tone="amber"
        />
      </div>

      <div className="mb-6 grid gap-5 xl:grid-cols-[1.55fr_.85fr]">
        {/* Hero panel */}
        <div className="hero-panel relative min-h-[235px] overflow-hidden rounded-[22px] p-6 md:p-7">
          <div className="absolute -right-8 -top-14 h-56 w-56 rounded-full border-[22px] border-white/10" />
          <div className="absolute bottom-[-100px] right-28 h-64 w-64 rounded-full border-[18px] border-white/10" />
          <div className="relative z-10 max-w-md">
            <Badge tone="amber"><Zap size={11} /> Latest analysis complete</Badge>
            <h2 className="mt-5 text-[23px] font-bold tracking-tight">FAERS dataset</h2>
            <p className="mt-2 text-sm leading-6 text-cyan-50/75">
              {loading
                ? 'Loading signals from backend…'
                : `${totalReports.toLocaleString()} reports screened across ${totalSignals.toLocaleString()} drug–event pairs. Evidence is ready for analyst review.`}
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <Link href="/safety/signals" data-testid="link-view-signals"
                className="inline-flex items-center gap-2 rounded-xl bg-white/95 px-3.5 py-2.5 text-xs font-bold text-teal-700 hover:bg-white">
                View signals <ArrowRight size={14} />
              </Link>
              <Link href="/safety/reports" data-testid="link-open-report"
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-white/20">
                Open report
              </Link>
            </div>
          </div>
        </div>

        {/* Signal activity chart — derived from real monthly report data */}
        <div className="surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-700">Signal activity</div>
              <div className="mt-1 text-xs text-slate-400">Monthly report volume across all signals</div>
            </div>
            <button data-testid="button-chart-filter" onClick={() => notify('Chart shows all signal priorities')}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-cyan-50">
              <MoreHorizontal size={17} />
            </button>
          </div>
          <div className="mt-6 h-[148px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="signalFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#35b7ad" stopOpacity=".32" />
                    <stop offset="100%" stopColor="#35b7ad" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e8f0f0" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8aa0a3' }} />
                <YAxis hide />
                <ChartTooltip contentStyle={{ borderRadius: 12, border: '1px solid #dceaea', fontSize: 11 }} />
                <Area type="monotone" dataKey="signals" stroke="#35b7ad" fill="url(#signalFill)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        {/* Top signals table — live from context */}
        <div className="surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <div className="text-sm font-bold text-slate-700">Top signals to review</div>
              <div className="mt-1 text-xs text-slate-400">Ranked by proportional reporting ratio</div>
            </div>
            <Link href="/safety/signals" data-testid="link-see-all-signals" className="text-xs font-bold text-teal-600 hover:text-teal-700">
              See all signals
            </Link>
          </div>
          <div className="responsive-table overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading signals from backend…</div>
            ) : top.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No signals yet — run an analysis first.</div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-bold">Drug / event</th>
                    <th className="px-5 py-3 font-bold">PRR</th>
                    <th className="px-5 py-3 font-bold">Reports</th>
                    <th className="px-5 py-3 font-bold">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {top.map((s) => (
                    <tr key={s.id} data-testid={`row-top-signal-${s.id}`}
                      className="table-row border-t border-slate-100" onClick={() => setLocation(`/safety/signals/${s.id}`)}>
                      <td data-label="Drug / event" className="px-5 py-3.5">
                        <div className="font-bold text-sm text-slate-700">{s.drug}</div>
                        <div className="mt-0.5 text-xs text-slate-400">{s.event}</div>
                      </td>
                      <td data-label="PRR" className="mono px-5 py-3.5 text-sm font-bold text-teal-700">{s.prr.toFixed(2)}</td>
                      <td data-label="Reports" className="mono px-5 py-3.5 text-xs text-slate-600">{s.reports}</td>
                      <td data-label="Priority" className="px-5 py-3.5">
                        <Badge tone={s.priority === 'High' ? 'red' : s.priority === 'Medium' ? 'amber' : 'teal'}>{s.priority}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Review focus — derived from live signals */}
        <div className="surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-700">Review focus</div>
              <div className="mt-1 text-xs text-slate-400">Your triage workload</div>
            </div>
            <Link href="/safety/review" data-testid="link-review-queue" className="text-xs font-bold text-teal-600">Open queue</Link>
          </div>
          <div className="mt-5 space-y-4">
            {([
              ['New signals', signals.filter((s) => s.status === 'New').length, 'text-rose-600'],
              ['In review', signals.filter((s) => s.status === 'In review').length, 'text-amber-600'],
              ['Monitoring', signals.filter((s) => s.status === 'Monitoring').length, 'text-teal-600'],
            ] as const).map(([label, value, color]) => (
              <div key={label} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-xs text-slate-500">{label}</span>
                <span className={`mono text-lg font-bold ${color}`}>{loading ? '—' : value}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-dashed border-teal-200 bg-teal-50/50 p-3.5">
            <div className="flex gap-2">
              <Info size={15} className="mt-0.5 shrink-0 text-teal-600" />
              <p className="text-[11px] leading-5 text-teal-800">
                Signals are statistical screening outputs and require clinical and epidemiological review.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
