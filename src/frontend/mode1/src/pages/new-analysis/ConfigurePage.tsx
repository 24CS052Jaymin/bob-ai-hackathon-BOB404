import { ArrowLeft, Gauge, Info, Layers3, Play } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';
import { PageHeader } from '@/components/common';
import { useApp } from '@/context/AppProvider';

export function ConfigurePage() {
  const { notify } = useApp();
  const [threshold, setThreshold] = useState('2');
  const [cluster, setCluster] = useState(true);

  return (
    <div className="mx-auto max-w-5xl animate-enter">
      <PageHeader
        eyebrow="New analysis / 3 of 3"
        title="Set screening parameters"
        description="Use the defaults for a balanced first pass, or tune the model for your review question."
      />

      <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
        <div className="surface p-6 md:p-8">
          <section>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <Gauge size={18} />
              </div>
              <div>
                <h2 className="font-bold text-slate-800">PRR detection</h2>
                <p className="text-xs text-slate-500">Flag drug–event pairs with a meaningful reporting imbalance.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">
                Minimum PRR threshold
                <select
                  data-testid="select-prr-threshold"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-bold text-teal-700"
                >
                  <option value="1.5">1.5 — exploratory</option>
                  <option value="2">2.0 — balanced</option>
                  <option value="3">3.0 — conservative</option>
                </select>
              </label>
              <label className="text-xs font-bold text-slate-600">
                Minimum reports
                <input
                  data-testid="input-min-reports"
                  type="number"
                  defaultValue={3}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-bold text-slate-700"
                />
              </label>
            </div>
            <div className="mt-4 rounded-xl bg-teal-50/65 p-3.5 text-xs leading-5 text-teal-800">
              <Info size={14} className="mr-1 inline" /> PRR compares the reporting proportion for an event with a
              drug against the proportion for all other drugs. It does not establish causality.
            </div>
          </section>

          <section className="mt-8 border-t border-slate-100 pt-7">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Layers3 size={18} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800">Event clustering</h2>
                  <p className="text-xs text-slate-500">Group related signals to surface patterns across products.</p>
                </div>
              </div>
              <button
                data-testid="switch-clustering"
                aria-pressed={cluster}
                onClick={() => setCluster((v) => !v)}
                className={`relative h-6 w-11 rounded-full transition ${cluster ? 'bg-teal-600' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${cluster ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
            {cluster && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-600">
                  Similarity method
                  <select
                    data-testid="select-clustering-method"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                  >
                    <option>MedDRA hierarchy</option>
                    <option>Co-reporting network</option>
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-600">
                  Minimum cluster size
                  <select
                    data-testid="select-cluster-size"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                  >
                    <option>3 events</option>
                    <option>5 events</option>
                    <option>10 events</option>
                  </select>
                </label>
              </div>
            )}
          </section>

          <div className="mt-8 flex justify-end gap-2">
            <Link
              href="/safety/upload/validation"
              data-testid="link-back-validation"
              className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50"
            >
              <ArrowLeft size={14} /> Back
            </Link>
            <Link
              href="/safety/analysis"
              data-testid="link-run-analysis"
              onClick={() => notify(`Analysis queued with PRR threshold ${threshold}`)}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-teal-700"
            >
              <Play size={14} /> Run analysis
            </Link>
          </div>
        </div>

        <div className="surface soft-grid h-fit p-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-teal-600">Configuration summary</div>
          <div className="mt-6 space-y-5">
            <div>
              <div className="text-xs text-slate-500">Detection method</div>
              <div className="mt-1 font-bold text-slate-700">Proportional reporting ratio</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Threshold</div>
              <div className="mono mt-1 text-2xl font-bold text-teal-700">{threshold}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Clustering</div>
              <div className="mt-1 font-bold text-slate-700">{cluster ? 'MedDRA hierarchy enabled' : 'Disabled'}</div>
            </div>
            <div className="border-t border-slate-200 pt-4 text-[11px] leading-5 text-slate-500">
              All configuration choices will be saved with the analysis for auditability.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
