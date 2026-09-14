import { AlertCircle, ArrowLeft, ArrowRight, Check, FileCheck2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';
import { Badge, Button, PageHeader } from '@/components/common';
import { useApp } from '@/context/AppProvider';

const checks: [string, string, boolean][] = [
  ['Report schema', '56,428 reports match expected fields', true],
  ['Required fields', 'Drug, event, outcome and report date present', true],
  ['Duplicate records', '124 duplicate report IDs isolated', false],
  ['Terminology mapping', '8,432 unique drug–event pairs normalized', true],
];

export function ValidationPage() {
  const { notify } = useApp();
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const run = () => {
    setRunning(true);
    setTimeout(() => {
      setRunning(false);
      setDone(true);
      notify('Validation completed with no blocking issues');
    }, 1000);
  };

  return (
    <div className="mx-auto max-w-4xl animate-enter">
      <PageHeader
        eyebrow="New analysis / 2 of 3"
        title="Review your data"
        description="A quick integrity check helps keep every screening result traceable to its source."
        actions={
          <Badge tone="teal">
            <ShieldCheck size={12} /> Source: FAERS Q2 2024 refresh
          </Badge>
        }
      />

      <div className="mb-6 flex items-center gap-2 text-[11px] font-bold text-teal-700">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-white">
          <Check size={14} />
        </span>
        <span>Upload</span>
        <span className="mx-2 h-px w-10 bg-teal-200" />
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-white">2</span>
        <span>Validate</span>
        <span className="mx-2 h-px w-10 bg-slate-200" />
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400">3</span>
        <span className="text-slate-400">Configure</span>
      </div>

      <div className="grid gap-5 md:grid-cols-[1.25fr_.75fr]">
        <div className="surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-800">Validation checks</h2>
              <p className="mt-1 text-xs text-slate-500">Completed just now</p>
            </div>
            <Badge tone={done ? 'green' : 'teal'}>{done ? 'Validated' : 'Ready to run'}</Badge>
          </div>
          <div className="mt-6 space-y-2">
            {checks.map(([name, detail, pass], i) => (
              <div key={name} className="flex items-start gap-3 rounded-xl border border-slate-100 px-4 py-3.5">
                <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ${pass ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                  {pass ? <Check size={14} /> : <AlertCircle size={14} />}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-700">{name}</div>
                  <div className="mt-1 text-xs text-slate-400">{detail}</div>
                </div>
                <span className="mono text-[10px] text-slate-400">0{i + 1}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Link
              href="/safety/upload"
              data-testid="link-back-upload"
              className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50"
            >
              <ArrowLeft size={14} /> Back
            </Link>
            <Button
              testId="button-run-validation"
              onClick={run}
              disabled={running}
              icon={running ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            >
              {running ? 'Running checks…' : 'Run validation'}
            </Button>
            <Link
              href="/safety/configure"
              data-testid="link-continue-configure"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-teal-700"
            >
              Configure <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="surface bg-teal-50/50 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-teal-600">
            <FileCheck2 size={20} />
          </div>
          <h3 className="mt-5 font-bold text-slate-800">Source snapshot</h3>
          <dl className="mt-5 space-y-4 text-xs">
            <div className="flex justify-between">
              <dt className="text-slate-500">File size</dt>
              <dd className="mono font-bold text-slate-700">184.6 MB</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Reporting period</dt>
              <dd className="font-bold text-slate-700">Apr–Jun 2024</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Reports</dt>
              <dd className="mono font-bold text-slate-700">56,428</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Unique drugs</dt>
              <dd className="mono font-bold text-slate-700">2,106</dd>
            </div>
          </dl>
          <div className="mt-6 border-t border-teal-200/60 pt-4 text-[11px] leading-5 text-teal-800">
            Duplicates are retained as a reviewable exclusion log and will not be silently removed.
          </div>
        </div>
      </div>
    </div>
  );
}
