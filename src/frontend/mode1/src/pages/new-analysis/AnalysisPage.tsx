import { Activity, ArrowRight, Check, CheckCircle2, ChevronRight, Clock3, FlaskConical, AlertCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useApp } from '@/context/AppProvider';
import { analyzeSignals } from '@/lib/api';
import type { Signal } from '@/types';

/**
 * AnalysisPage — runs the full ML + AI pipeline against the backend.
 *
 * Flow:
 *  1. Page mounts → immediately calls POST /api/v1/analyze-signals.
 *  2. Progress bar advances while the request is in-flight.
 *  3. On success → maps TopSignal[] back to Signal[], updates global context,
 *     saves the run summary to the backend DB, shows completion state.
 *  4. On error → shows an inline error banner; signals remain unchanged.
 */
export function AnalysisPage() {
  const { setSignals, notify } = useApp();
  const [, setLocation] = useLocation();

  const [progress, setProgress] = useState(5);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Synthetic progress ticker — gives visual feedback while the API call runs
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTicker = () => {
    tickerRef.current = setInterval(() => {
      setProgress((p) => {
        // Slow down as it approaches 90 — real completion drives it to 100
        if (p >= 90) { clearInterval(tickerRef.current!); return 90; }
        return Math.min(90, p + (p < 50 ? 7 : 3));
      });
    }, 300);
  };

  const stopTicker = () => {
    if (tickerRef.current) clearInterval(tickerRef.current);
  };

  useEffect(() => {
    let cancelled = false;
    startTicker();

    async function runAnalysis() {
      try {
        // Call Phase 2 endpoint — ML clustering + AI summarization (top 50 only)
        const res = await analyzeSignals({ topN: 50, nClusters: 20 });

        if (cancelled) return;

        // Build a lookup of drug+event → AI enrichment from the top-N results.
        // We merge these back into the FULL signal list rather than replacing it,
        // so the rest of the app still sees all 52k+ signals.
        type Enrichment = { cluster: string; aiSummary: string };
        const enrichMap = new Map<string, Enrichment>();
        res.top_signals.forEach((s) => {
          enrichMap.set(`${s.drug_name}::${s.reaction}`, {
            cluster:   s.cluster_label,
            aiSummary: s.ai_summary,
          });
        });

        // Merge enrichment into existing full signal list.
        // Signals not in the top-N keep their existing cluster label unchanged.
        setSignals((prev) => {
          const base = prev.length > 0 ? prev : res.top_signals.map((s, i) => ({
            id:                 `SIG-${String(i + 1).padStart(5, '0')}`,
            drug:               s.drug_name,
            event:              s.reaction,
            reports:            s.report_count,
            prr:                s.prr_score,
            confidenceInterval: 'N/A',
            trend:              'Stable' as const,
            cluster:            s.cluster_label,
            priority:           (s.prr_score >= 10 ? 'High' : s.prr_score >= 5 ? 'Medium' : 'Low') as Signal['priority'],
            status:             'New' as const,
            backgroundReports:  0,
            monthlyReports:     Array(8).fill(Math.round(s.report_count / 8)) as number[],
            reviewed:           false,
          }));

          return base.map((sig) => {
            const key = `${sig.drug}::${sig.event}`;
            const enrich = enrichMap.get(key);
            if (!enrich) return sig;
            return { ...sig, cluster: enrich.cluster };
          });
        });

        stopTicker();
        setProgress(100);
        setDone(true);
        notify(
          `Analysis complete — ${res.summary_metrics.total_signals_detected.toLocaleString()} signals detected`,
        );
      } catch (err) {
        if (cancelled) return;
        stopTicker();
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        notify('Analysis failed — see error details on screen');
      }
    }

    runAnalysis();

    return () => {
      cancelled = true;
      stopTicker();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const steps: [string, boolean][] = [
    ['Ingesting source reports',          progress > 20],
    ['Normalising drug and event terms',  progress > 42],
    ['Calculating disproportionality',    progress > 68],
    ['Building evidence clusters + AI',   progress >= 100],
  ];

  return (
    <div className="mx-auto max-w-3xl animate-enter">
      <div className="mb-7 flex items-center gap-3 text-xs font-bold text-teal-700">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-600 text-white">
          <FlaskConical size={17} />
        </div>
        <span>Analysis workspace</span>
        <ChevronRight size={14} className="text-slate-300" />
        <span className="text-slate-400">FAERS dataset</span>
      </div>

      <div className="surface overflow-hidden p-6 md:p-10">
        {/* Status icon */}
        <div className="text-center">
          <div
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
              error
                ? 'bg-rose-50 text-rose-500'
                : done
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-teal-50 text-teal-600'
            }`}
          >
            {error ? (
              <AlertCircle size={38} />
            ) : done ? (
              <CheckCircle2 size={38} />
            ) : (
              <Activity size={38} className="animate-pulse" />
            )}
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-800">
            {error ? 'Analysis failed' : done ? 'Analysis complete' : 'Screening your reports'}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            {error
              ? 'The backend returned an error. Check that the API server is running.'
              : done
              ? 'Your evidence set is ready. Review high-priority signals first, then explore clusters.'
              : 'Running PRR detection, ML clustering and AI summarization — this may take 30–60 s.'}
          </p>
        </div>

        {/* Error detail */}
        {error && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Progress bar */}
        {!error && (
          <div className="mt-9">
            <div className="mb-2 flex justify-between text-xs font-bold">
              <span className="text-slate-600">Progress</span>
              <span className="mono text-teal-700">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-teal-50">
              <div
                className="h-full rounded-full bg-teal-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Step checklist */}
        {!error && (
          <div className="mt-8 space-y-3">
            {steps.map(([label, complete]) => (
              <div key={label} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-xs">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    complete ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-300'
                  }`}
                >
                  {complete ? <Check size={14} /> : <Clock3 size={14} />}
                </div>
                <span className={complete ? 'font-semibold text-slate-700' : 'text-slate-400'}>{label}</span>
                {complete && <span className="ml-auto text-[10px] font-bold text-emerald-600">Done</span>}
              </div>
            ))}
          </div>
        )}

        {/* Done actions */}
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

        {/* Error retry */}
        {error && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setLocation('/safety/configure')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600"
            >
              ← Back to configure
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
