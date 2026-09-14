import { AlertCircle, Activity, ArrowRight, ClipboardCheck, FileCheck2, Info, MoreHorizontal, Plus, Zap } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import { Badge, PageHeader, StatCard } from '@/components/common';
import { useApp } from '@/context/AppProvider';
import { signals } from '@/data/mock-data';

const trend = [
  { day: 'Jun 20', signals: 12 },
  { day: 'Jun 24', signals: 18 },
  { day: 'Jun 28', signals: 15 },
  { day: 'Jul 02', signals: 26 },
  { day: 'Jul 06', signals: 23 },
  { day: 'Jul 10', signals: 34 },
  { day: 'Jul 14', signals: 31 },
  { day: 'Jul 18', signals: 42 },
];

export function OverviewPage() {
  const { notify } = useApp();
  const [, setLocation] = useLocation();
  const [range, setRange] = useState('Last 30 days');
  const top = signals.slice().sort((a, b) => b.prr - a.prr).slice(0, 5);

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
              onChange={(e) => {
                setRange(e.target.value);
                notify(`Updated view to ${e.target.value}`);
              }}
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

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Signals detected" value="112" delta="+18.6%" icon={Activity} />
        <StatCard label="High-priority signals" value="9" delta="+2 this week" icon={AlertCircle} tone="rose" />
        <StatCard label="Reports screened" value="48,210" delta="+6.4%" icon={FileCheck2} tone="slate" />
        <StatCard label="Awaiting review" value="24" delta="6 due today" icon={ClipboardCheck} tone="amber" />
      </div>

      <div className="mb-6 grid gap-5 xl:grid-cols-[1.55fr_.85fr]">
        <div className="hero-panel relative min-h-[235px] overflow-hidden rounded-[22px] p-6 md:p-7">
          <div className="absolute -right-8 -top-14 h-56 w-56 rounded-full border-[22px] border-white/10" />
          <div className="absolute bottom-[-100px] right-28 h-64 w-64 rounded-full border-[18px] border-white/10" />
          <div className="relative z-10 max-w-md">
            <Badge tone="amber">
              <Zap size={11} /> Latest analysis complete
            </Badge>
            <h2 className="mt-5 text-[23px] font-bold tracking-tight">FAERS Q2 2024 refresh</h2>
            <p className="mt-2 text-sm leading-6 text-cyan-50/75">
              48,210 reports screened across 8,432 drug–event pairs. Evidence is ready for analyst review.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <Link
                href="/safety/signals"
                data-testid="link-view-signals"
                className="inline-flex items-center gap-2 rounded-xl bg-white/95 px-3.5 py-2.5 text-xs font-bold text-teal-700 hover:bg-white"
              >
                View signals <ArrowRight size={14} />
              </Link>
              <Link
                href="/safety/reports"
                data-testid="link-open-report"
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-white/20"
              >
                Open report
              </Link>
            </div>
          </div>
          <div className="absolute bottom-6 right-7 hidden text-right md:block">
            <div className="mono text-4xl font-bold">09:42</div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-cyan-50/60">Analysis runtime</div>
          </div>
        </div>

        <div className="surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-700">Signal activity</div>
              <div className="mt-1 text-xs text-slate-400">New signals by detection date</div>
            </div>
            <button
              data-testid="button-chart-filter"
              onClick={() => notify('Chart is showing all signal priorities')}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-cyan-50"
            >
              <MoreHorizontal size={17} />
            </button>
          </div>
          <div className="mt-6 h-[148px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
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
            <table className="w-full text-left">
              <thead className="bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-bold">Drug / event</th>
                  <th className="px-5 py-3 font-bold">PRR</th>
                  <th className="px-5 py-3 font-bold">Reports</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {top.map((s) => (
                  <tr
                    key={s.id}
                    data-testid={`row-top-signal-${s.id}`}
                    className="table-row border-t border-slate-100"
                    onClick={() => setLocation(`/safety/signals/${s.id}`)}
                  >
                    <td data-label="Drug / event" className="px-5 py-3.5">
                      <div className="font-bold text-sm text-slate-700">{s.drug}</div>
                      <div className="mt-0.5 text-xs text-slate-400">{s.event}</div>
                    </td>
                    <td data-label="PRR" className="mono px-5 py-3.5 text-sm font-bold text-teal-700">
                      {s.prr.toFixed(2)}
                    </td>
                    <td data-label="Reports" className="mono px-5 py-3.5 text-xs text-slate-600">
                      {s.reports}
                    </td>
                    <td data-label="Status" className="px-5 py-3.5">
                      <Badge tone={s.priority === 'High' ? 'red' : s.priority === 'Medium' ? 'amber' : 'teal'}>{s.priority}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-700">Review focus</div>
              <div className="mt-1 text-xs text-slate-400">Your triage workload</div>
            </div>
            <Link href="/safety/review" data-testid="link-review-queue" className="text-xs font-bold text-teal-600">
              Open queue
            </Link>
          </div>
          <div className="mt-5 space-y-4">
            {(
              [
                ['Due today', '6', 'text-rose-600'],
                ['In progress', '11', 'text-amber-600'],
                ['Reviewed this week', '37', 'text-teal-600'],
              ] as const
            ).map(([label, value, color]) => (
              <div key={label} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-xs text-slate-500">{label}</span>
                <span className={`mono text-lg font-bold ${color}`}>{value}</span>
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
