import { AlertCircle, ArrowLeft, ArrowRight, Activity, Check, ChevronDown, ChevronRight, FileText, Sparkles, Tags } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'wouter';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import { Badge, Button, PageHeader } from '@/components/common';
import { useApp } from '@/context/AppProvider';
import type { SignalStatus } from '@/types';

const monthLabels = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];

export function SignalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { signals: allSignals, setSignals, notify } = useApp();
  const signal = allSignals.find((s) => s.id === id) ?? allSignals[0];
  const [note, setNote] = useState('');
  const [expanded, setExpanded] = useState(true);

  const months = signal.monthlyReports.map((reports, i) => ({ month: monthLabels[i], reports }));

  const changeStatus = (status: SignalStatus) => {
    setSignals((prev) => prev.map((s) => (s.id === signal.id ? { ...s, status, reviewed: status === 'Closed' } : s)));
    notify(`Signal marked ${status.toLowerCase()}`);
  };

  return (
    <div className="mx-auto max-w-[1240px] animate-enter">
      <div className="mb-5">
        <Link href="/safety/signals" data-testid="link-back-signals" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-teal-700">
          <ArrowLeft size={14} /> All signals
        </Link>
      </div>

      <PageHeader
        eyebrow={`Signal detail / ${signal.id}`}
        title={`${signal.drug} · ${signal.event}`}
        description="A reviewable evidence record for analyst assessment."
        actions={
          <>
            <Button testId="button-detail-monitor" variant="secondary" onClick={() => changeStatus('Monitoring')} icon={<Activity size={14} />}>
              Monitor
            </Button>
            <Button testId="button-detail-close" variant="primary" onClick={() => changeStatus('Closed')} icon={<Check size={14} />}>
              Close signal
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge tone="amber">
          <AlertCircle size={11} /> {signal.priority} priority
        </Badge>
        <Badge tone={signal.status === 'Closed' ? 'slate' : 'teal'}>{signal.status}</Badge>
        <Badge tone="slate">{signal.cluster}</Badge>
      </div>

      <div className="grid gap-5 lg:grid-cols-[.95fr_1.4fr]">
        <div className="space-y-5">
          <div className="surface p-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Core measure</div>
            <div className="mt-4 flex items-end gap-4">
              <div>
                <div className="mono text-5xl font-bold tracking-tight text-teal-700">{signal.prr.toFixed(2)}</div>
                <div className="mt-1 text-xs text-slate-500">Proportional reporting ratio</div>
              </div>
              <div className="mb-1 flex items-center gap-1 text-xs font-bold text-rose-500">
                <ArrowRight size={14} className="-rotate-45" /> {signal.trend}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-[10px] uppercase text-slate-400">95% CI</div>
                <div className="mono mt-1 text-sm font-bold text-slate-700">{signal.confidenceInterval}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-[10px] uppercase text-slate-400">Reports</div>
                <div className="mono mt-1 text-sm font-bold text-slate-700">{signal.reports}</div>
              </div>
            </div>
            <div className="mt-5 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>
                <strong>Potential signal — not proof of causality.</strong> PRR is a screening measure and can be
                influenced by reporting bias, confounding, and missing exposure denominators.
              </span>
            </div>
          </div>

          <div className="surface p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-700">Calculation basis</div>
                <div className="mt-1 text-xs text-slate-400">How this measure was derived</div>
              </div>
              <button data-testid="button-toggle-calculation" onClick={() => setExpanded((v) => !v)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50">
                {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            </div>
            {expanded && (
              <div className="mt-5 space-y-3 text-xs leading-5 text-slate-600">
                <div className="flex justify-between border-b border-slate-100 pb-3">
                  <span>Drug–event reports (a)</span>
                  <span className="mono font-bold">{signal.reports}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-3">
                  <span>Drug with other events (b)</span>
                  <span className="mono font-bold">{signal.reports * 4 + 31}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-3">
                  <span>Other drugs with event (c)</span>
                  <span className="mono font-bold">{signal.backgroundReports}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span>All other reports (d)</span>
                  <span className="mono font-bold">{signal.reports * 30 + 418}</span>
                </div>
                <div className="rounded-lg bg-teal-50 px-3 py-2 font-mono text-[11px] text-teal-800">PRR = [a / (a + b)] ÷ [c / (c + d)]</div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="surface p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-700">Monthly report trend</div>
                <div className="mt-1 text-xs text-slate-400">Observed reports, not incidence</div>
              </div>
              <Badge tone="teal">{signal.trend}</Badge>
            </div>
            <div className="mt-6 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={months}>
                  <CartesianGrid vertical={false} stroke="#e8f0f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8aa0a3' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8aa0a3' }} />
                  <ChartTooltip contentStyle={{ borderRadius: 12, border: '1px solid #dceaea', fontSize: 11 }} />
                  <Line type="monotone" dataKey="reports" stroke="#2caea6" strokeWidth={3} dot={{ fill: '#2caea6', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="surface p-6">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <Sparkles size={16} className="text-teal-600" /> AI-generated screening summary <Badge tone="amber">Verify against source data</Badge>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Reports for <strong>{signal.drug}</strong> and <strong>{signal.event}</strong> show a{' '}
              {signal.trend.toLowerCase()} reporting pattern with a PRR of {signal.prr.toFixed(2)}. This finding is
              suitable for targeted review of indication, time-to-onset, and reporter narratives.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="slate">
                <Tags size={11} /> {signal.cluster}
              </Badge>
              <Badge tone="slate">
                <FileText size={11} /> {signal.reports} source reports
              </Badge>
            </div>
          </div>

          <div className="surface p-6">
            <div className="text-sm font-bold text-slate-700">Analyst note</div>
            <textarea
              data-testid="textarea-signal-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Record your rationale or next step…"
              className="mt-4 min-h-[90px] w-full resize-none rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-teal-400"
            />
            <div className="mt-3 flex justify-end">
              <Button testId="button-save-signal-note" onClick={() => notify(note ? 'Analyst note saved to review record' : 'Add a note before saving')} icon={<Check size={14} />}>
                Save note
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
