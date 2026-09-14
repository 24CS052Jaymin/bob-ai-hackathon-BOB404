import { Activity, ArrowRight, Check, CheckCircle2, ChevronRight, Clock3, FlaskConical } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { useApp } from '@/context/AppProvider';

export function AnalysisPage() {
  const { notify } = useApp();
  const [progress, setProgress] = useState(7);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(
      () =>
        setProgress((p) => {
          if (p >= 100) {
            window.clearInterval(timer);
            setDone(true);
            return 100;
          }
          return Math.min(100, p + 7);
        }),
      280,
    );
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (done) notify('Analysis complete: 112 signals are ready for review');
  }, [done]);

  const steps: [string, boolean][] = [
    ['Ingesting source reports', progress > 20],
    ['Normalizing drug and event terms', progress > 42],
    ['Calculating disproportionality', progress > 68],
    ['Building evidence clusters', progress > 88],
  ];

  return (
    <div className="mx-auto max-w-3xl animate-enter">
      <div className="mb-7 flex items-center gap-3 text-xs font-bold text-teal-700">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-600 text-white">
          <FlaskConical size={17} />
        </div>
        <span>Analysis workspace</span>
        <ChevronRight size={14} className="text-slate-300" />
        <span className="text-slate-400">FAERS Q2 2024 refresh</span>
      </div>

      <div className="surface overflow-hidden p-6 md:p-10">
        <div className="text-center">
          <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${done ? 'bg-emerald-50 text-emerald-600' : 'bg-teal-50 text-teal-600'}`}>
            {done ? <CheckCircle2 size={38} /> : <Activity size={38} className="animate-pulse" />}
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-800">
            {done ? 'Analysis complete' : 'Screening your reports'}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            {done
              ? 'Your evidence set is ready. Review high-priority signals first, then explore clusters for context.'
              : 'ReguLens is working through the source data. You can leave this page and return to the analysis history.'}
          </p>
        </div>

        <div className="mt-9">
          <div className="mb-2 flex justify-between text-xs font-bold">
            <span className="text-slate-600">Progress</span>
            <span className="mono text-teal-700">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-teal-50">
            <div className="progress-strip h-full rounded-full bg-teal-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="mt-8 space-y-3">
          {steps.map(([label, complete]) => (
            <div key={label} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-xs">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full ${complete ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-300'}`}>
                {complete ? <Check size={14} /> : <Clock3 size={14} />}
              </div>
              <span className={complete ? 'font-semibold text-slate-700' : 'text-slate-400'}>{label}</span>
              {complete && <span className="ml-auto text-[10px] font-bold text-emerald-600">Done</span>}
            </div>
          ))}
        </div>

        {done && (
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <Link
              href="/safety/signals"
              data-testid="link-analysis-signals"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-bold text-white"
            >
              Review signals <ArrowRight size={14} />
            </Link>
            <Link
              href="/safety"
              data-testid="link-analysis-overview"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600"
            >
              Back to overview
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
