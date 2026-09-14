import { Download, FileText, GitCompareArrows, Layers3, X } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, PageHeader } from '@/components/common';
import { useApp } from '@/context/AppProvider';
import { analysisHistory } from '@/data/mock-data';

export function HistoryPage() {
  const { notify } = useApp();
  const [compare, setCompare] = useState<string[]>([]);

  const toggleCompare = (id: string) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < 2 ? [...c, id] : c));

  return (
    <div className="mx-auto max-w-[1300px] animate-enter">
      <PageHeader
        eyebrow="Audit trail"
        title="Analysis history"
        description="Every run is preserved with its dataset, configuration, and analyst context."
        actions={
          <Button testId="button-export-history" variant="secondary" onClick={() => notify('Analysis history exported')} icon={<Download size={14} />}>
            Export history
          </Button>
        }
      />

      {compare.length > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-4 py-3">
          <div className="text-xs font-bold text-teal-800">{compare.length} analyses selected for comparison</div>
          <div className="flex gap-2">
            <Button testId="button-run-comparison" onClick={() => notify('Comparison view opened for selected analyses')} icon={<GitCompareArrows size={14} />}>
              Compare
            </Button>
            <button data-testid="button-clear-comparison" onClick={() => setCompare([])} className="p-2 text-teal-700" aria-label="Clear comparison">
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      <div className="surface overflow-hidden">
        <div className="responsive-table overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3 font-bold">Analysis</th>
                <th className="px-5 py-3 font-bold">Reports</th>
                <th className="px-5 py-3 font-bold">Signals</th>
                <th className="px-5 py-3 font-bold">High priority</th>
                <th className="px-5 py-3 font-bold">Date / analyst</th>
                <th className="px-5 py-3 font-bold">Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {analysisHistory.map((h) => (
                <tr key={h.id} className="border-t border-slate-100">
                  <td data-label="Analysis" className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <input data-testid={`checkbox-history-${h.id}`} type="checkbox" checked={compare.includes(h.id)} onChange={() => toggleCompare(h.id)} />
                      <div>
                        <div className="text-xs font-bold text-slate-700">{h.dataset}</div>
                        <div className="mono mt-1 text-[10px] text-slate-400">{h.id}</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Reports" className="mono px-5 py-4 text-xs text-slate-600">
                    {h.reports.toLocaleString()}
                  </td>
                  <td data-label="Signals" className="mono px-5 py-4 text-xs font-bold text-teal-700">
                    {h.signals}
                  </td>
                  <td data-label="High priority" className="mono px-5 py-4 text-xs font-bold text-rose-600">
                    {h.highPriority}
                  </td>
                  <td data-label="Date / analyst" className="px-5 py-4 text-xs text-slate-500">
                    {h.date}
                    <div className="mt-1 text-[10px] text-slate-400">{h.analyst}</div>
                  </td>
                  <td data-label="Status" className="px-5 py-4">
                    <Badge tone={h.status === 'Archived' ? 'slate' : 'green'}>{h.status}</Badge>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      <button data-testid={`button-view-history-${h.id}`} onClick={() => notify(`Viewing ${h.id}`)} className="rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-teal-700" title="View">
                        <FileText size={15} />
                      </button>
                      <button
                        data-testid={`button-duplicate-history-${h.id}`}
                        onClick={() => notify(`${h.id} duplicated as a new analysis`)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-teal-700"
                        title="Duplicate"
                      >
                        <Layers3 size={15} />
                      </button>
                      <button
                        data-testid={`button-export-history-${h.id}`}
                        onClick={() => notify(`${h.id} export prepared`)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-teal-700"
                        title="Export"
                      >
                        <Download size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
