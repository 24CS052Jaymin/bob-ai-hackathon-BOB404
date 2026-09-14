import { ChevronRight, Download, Info, Search, X } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, PageHeader } from '@/components/common';
import { useApp } from '@/context/AppProvider';
import { faersReports } from '@/data/mock-data';
import type { FaersReport } from '@/types';

export function DataExplorerPage() {
  const { notify } = useApp();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<FaersReport | null>(null);
  const [outcome, setOutcome] = useState('All outcomes');

  const visible = faersReports.filter(
    (r) => `${r.id} ${r.drug} ${r.event}`.toLowerCase().includes(query.toLowerCase()) && (outcome === 'All outcomes' || r.outcome === outcome),
  );

  return (
    <div className="mx-auto max-w-[1400px] animate-enter">
      <PageHeader
        eyebrow="Source evidence"
        title="FAERS explorer"
        description="Search the underlying reports that contribute to a signal. Source data stays close at hand."
        actions={
          <Button testId="button-export-data" variant="secondary" onClick={() => notify('Filtered source report list exported')} icon={<Download size={14} />}>
            Export view
          </Button>
        }
      />

      <div className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              data-testid="input-faers-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search report ID, drug, or event"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 text-xs outline-none focus:border-teal-400"
            />
          </div>
          <select
            data-testid="select-faers-outcome"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600"
          >
            <option>All outcomes</option>
            <option>Hospitalized</option>
            <option>Life-threatening</option>
            <option>Other serious</option>
          </select>
        </div>
        <div className="responsive-table overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3 font-bold">Report ID</th>
                <th className="px-5 py-3 font-bold">Drug</th>
                <th className="px-5 py-3 font-bold">Event</th>
                <th className="px-5 py-3 font-bold">Age / sex</th>
                <th className="px-5 py-3 font-bold">Outcome</th>
                <th className="px-5 py-3 font-bold">Report date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} data-testid={`row-faers-${r.id}`} onClick={() => setSelected(r)} className="table-row border-t border-slate-100">
                  <td data-label="Report ID" className="mono px-5 py-3.5 text-[11px] font-bold text-teal-700">
                    {r.id}
                  </td>
                  <td data-label="Drug" className="px-5 py-3.5 text-xs font-bold text-slate-700">
                    {r.drug}
                  </td>
                  <td data-label="Event" className="px-5 py-3.5 text-xs text-slate-500">
                    {r.event}
                  </td>
                  <td data-label="Age / sex" className="px-5 py-3.5 text-xs text-slate-600">
                    {r.age} / {r.sex}
                  </td>
                  <td data-label="Outcome" className="px-5 py-3.5">
                    <Badge tone="slate">{r.outcome}</Badge>
                  </td>
                  <td data-label="Report date" className="px-5 py-3.5 text-xs text-slate-500">
                    {r.reportDate}
                  </td>
                  <td className="px-5 py-3.5">
                    <ChevronRight size={15} className="text-slate-300" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 p-5" onClick={() => setSelected(null)}>
          <div className="surface w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <div className="mono text-[10px] font-bold text-teal-700">{selected.id}</div>
                <h2 className="mt-1 text-lg font-bold text-slate-800">Source report detail</h2>
              </div>
              <button data-testid="button-close-report-detail" onClick={() => setSelected(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50">
                <X size={17} />
              </button>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {(
                [
                  ['Drug', selected.drug],
                  ['Event', selected.event],
                  ['Age / sex', `${selected.age} / ${selected.sex}`],
                  ['Outcome', selected.outcome],
                  ['Reported', selected.reportDate],
                  ['Reporter', selected.reporterType],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
                  <div className="mt-1 text-xs font-bold text-slate-700">{value}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">
              <Info size={14} className="mr-1 inline" /> Report-level evidence provides context but does not establish
              a drug-event relationship.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
