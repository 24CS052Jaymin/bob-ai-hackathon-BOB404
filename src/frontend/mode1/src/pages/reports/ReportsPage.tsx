import { ChevronRight, Download, Printer, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Button, PageHeader } from '@/components/common';
import { useApp } from '@/context/AppProvider';
import { signals } from '@/data/mock-data';

const sections = ['Executive summary', 'Screening population', 'Top signals', 'Cluster observations', 'Methodology & caveats'];

export function ReportsPage() {
  const { notify } = useApp();
  const [includeAppendix, setIncludeAppendix] = useState(true);
  const topSignals = signals.slice().sort((a, b) => b.prr - a.prr).slice(0, 4);

  return (
    <div className="mx-auto max-w-[1200px] animate-enter">
      <PageHeader
        eyebrow="Evidence package"
        title="Report preview"
        description="A review-ready summary of the FAERS Q2 2024 screening run."
        actions={
          <>
            <Button testId="button-print-report" variant="secondary" onClick={() => notify('Print dialog simulation opened')} icon={<Printer size={14} />}>
              Print
            </Button>
            <Button testId="button-export-report" onClick={() => notify('Report export prepared as PDF')} icon={<Download size={14} />}>
              Export PDF
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[.62fr_1.38fr]">
        <div className="surface h-fit p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Report sections</div>
          <div className="mt-4 space-y-1">
            {sections.map((section, i) => (
              <button
                key={section}
                data-testid={`button-report-section-${i}`}
                onClick={() => notify(`Showing ${section.toLowerCase()}`)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-xs font-semibold text-slate-600 hover:bg-teal-50 hover:text-teal-700"
              >
                <span>{section}</span>
                <ChevronRight size={14} />
              </button>
            ))}
          </div>
          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Include appendix</span>
              <button
                data-testid="switch-report-appendix"
                onClick={() => setIncludeAppendix((v) => !v)}
                className={`relative h-5 w-9 rounded-full ${includeAppendix ? 'bg-teal-600' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white ${includeAppendix ? 'left-4.5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="surface bg-slate-100/60 p-3 md:p-5">
          <div className="mx-auto max-w-[760px] bg-white px-6 py-8 shadow-sm md:px-12 md:py-12">
            <div className="flex items-start justify-between border-b-2 border-teal-500 pb-6">
              <div>
                <div className="flex items-center gap-2 text-lg font-bold text-teal-700">
                  <ShieldCheck size={20} /> ReguLens
                </div>
                <div className="mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Safety signal screening report</div>
              </div>
              <div className="text-right text-[10px] text-slate-400">
                AN-2408
                <br />
                18 Jul 2024
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-xl font-bold text-slate-800">FAERS Q2 2024 refresh</h2>
              <p className="mt-2 text-xs leading-5 text-slate-500">Prepared for pharmacovigilance review by Maya Chen</p>
            </div>

            <div className="mt-7 grid grid-cols-3 gap-3">
              {(
                [
                  ['48,210', 'Reports screened'],
                  ['112', 'Signals detected'],
                  ['9', 'High priority'],
                ] as const
              ).map(([v, l]) => (
                <div key={l} className="rounded-xl bg-teal-50 p-3">
                  <div className="mono text-xl font-bold text-teal-700">{v}</div>
                  <div className="mt-1 text-[9px] leading-3 text-teal-800">{l}</div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <h3 className="text-sm font-bold text-slate-800">Executive summary</h3>
              <p className="mt-3 text-xs leading-6 text-slate-600">
                This report documents a statistical screening of FAERS-style spontaneous reports. Nine high-priority
                potential signals were identified for focused analyst review. Findings should be interpreted alongside
                clinical context, reporting patterns, and source narratives.
              </p>
            </div>

            <div className="mt-8">
              <h3 className="text-sm font-bold text-slate-800">Top potential signals</h3>
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-slate-50 text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Drug</th>
                      <th className="px-3 py-2">Event</th>
                      <th className="px-3 py-2">PRR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topSignals.map((s) => (
                      <tr key={s.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-bold text-slate-600">{s.drug}</td>
                        <td className="px-3 py-2 text-slate-500">{s.event}</td>
                        <td className="mono px-3 py-2 font-bold text-teal-700">{s.prr.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-8 border-t border-slate-100 pt-5 text-[10px] leading-5 text-slate-400">
              <strong>Interpretation:</strong> Potential signal — not proof of causality. PRR is a screening statistic
              subject to reporting bias and confounding. Verify every finding against source data.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
