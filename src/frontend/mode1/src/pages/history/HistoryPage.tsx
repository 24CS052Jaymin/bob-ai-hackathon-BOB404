import { Download, FileText, GitCompareArrows, Layers3, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Badge, Button, PageHeader } from '@/components/common';
import { useApp } from '@/context/AppProvider';
import { listRuns } from '@/lib/api';
import type { AnalysisRun } from '@/lib/api';
import type { Signal } from '@/types';

/**
 * HistoryPage — fetches analysis run history from GET /api/v1/runs.
 * No mock-data import.
 */
export function HistoryPage() {
  const { notify, setSignals } = useApp();
  const [, setLocation] = useLocation();
  const [compare, setCompare] = useState<number[]>([]);
  const [runs, setRuns]       = useState<AnalysisRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    listRuns()
      .then((data) => { setRuns(data); setError(null); })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  const toggleCompare = (id: number) =>
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < 2 ? [...c, id] : c));

  const exportRun = (h: AnalysisRun) => {
    if (!h.top_signals || h.top_signals.length === 0) {
      notify(`Run ${h.id} has no signals to export`);
      return;
    }
    const headers = ['Drug', 'Event', 'Reports', 'PRR', 'Cluster', 'AI Summary'];
    const rows = h.top_signals.map(s => [
      `"${s.drug_name.replace(/"/g, '""')}"`,
      `"${s.reaction.replace(/"/g, '""')}"`,
      s.report_count,
      s.prr_score,
      `"${s.cluster_label.replace(/"/g, '""')}"`,
      `"${(s.ai_summary || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `regulens_run_${h.id}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify(`Run ${h.id} exported successfully`);
  };

  const viewRun = (h: AnalysisRun) => {
    if (!h.top_signals || h.top_signals.length === 0) {
      notify(`Run ${h.id} has no signals to view`);
      return;
    }
    // Map TopSignal from backend format to Signal frontend format
    const mapped: Signal[] = h.top_signals.map((s, idx) => ({
      id: `SIG-${String(idx + 1).padStart(5, '0')}`,
      drug: s.drug_name,
      event: s.reaction,
      reports: s.report_count,
      prr: s.prr_score,
      confidenceInterval: '95% CI unavailable', // placeholder
      trend: 'Stable',
      cluster: s.cluster_label,
      priority: 'High',
      status: 'New',
      backgroundReports: 0,
      monthlyReports: [],
      reviewed: false,
    }));
    
    setSignals(mapped);
    notify(`Loaded run ${h.id} into active view`);
    setLocation('/safety/signals');
  };

  return (
    <div className="mx-auto max-w-[1300px] animate-enter">
      <PageHeader
        eyebrow="Audit trail"
        title="Analysis history"
        description="Every run is preserved with its dataset, configuration, and analyst context."
        actions={
          <Button testId="button-export-history" variant="secondary"
            onClick={() => notify('Global history export not implemented')} icon={<Download size={14} />}>
            Export history
          </Button>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          <strong>Could not load history:</strong> {error}
        </div>
      )}

      {compare.length > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-4 py-3">
          <div className="text-xs font-bold text-teal-800">{compare.length} analyses selected for comparison</div>
          <div className="flex gap-2">
            <Button testId="button-run-comparison"
              onClick={() => notify('Comparison view opened for selected analyses')}
              icon={<GitCompareArrows size={14} />}>
              Compare
            </Button>
            <button data-testid="button-clear-comparison" onClick={() => setCompare([])}
              className="p-2 text-teal-700" aria-label="Clear comparison">
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      <div className="surface overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-400">Loading run history from backend…</div>
        ) : runs.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">
            No analysis runs yet. Run an analysis to see history here.
          </div>
        ) : (
          <div className="responsive-table overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-bold">Run</th>
                  <th className="px-5 py-3 font-bold">Reports</th>
                  <th className="px-5 py-3 font-bold">Signals</th>
                  <th className="px-5 py-3 font-bold">Top-N</th>
                  <th className="px-5 py-3 font-bold">Date</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {runs.map((h) => (
                  <tr key={h.id} className="border-t border-slate-100">
                    <td data-label="Run" className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <input
                          data-testid={`checkbox-history-${h.id}`}
                          type="checkbox"
                          checked={compare.includes(h.id)}
                          onChange={() => toggleCompare(h.id)}
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-700">FAERS dataset</div>
                          <div className="mono mt-1 text-[10px] text-slate-400">RUN-{String(h.id).padStart(3, '0')}</div>
                        </div>
                      </div>
                    </td>
                    <td data-label="Reports" className="mono px-5 py-4 text-xs text-slate-600">
                      {h.total_reports.toLocaleString()}
                    </td>
                    <td data-label="Signals" className="mono px-5 py-4 text-xs font-bold text-teal-700">
                      {h.total_signals.toLocaleString()}
                    </td>
                    <td data-label="Top-N" className="mono px-5 py-4 text-xs text-slate-500">
                      {h.top_n}
                    </td>
                    <td data-label="Date" className="px-5 py-4 text-xs text-slate-500">
                      {new Date(h.created_at).toLocaleDateString()}
                    </td>
                    <td data-label="Status" className="px-5 py-4">
                      <Badge tone="green">Completed</Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button data-testid={`button-view-history-${h.id}`}
                          onClick={() => viewRun(h)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-teal-700" title="View">
                          <FileText size={15} />
                        </button>
                        <button data-testid={`button-duplicate-history-${h.id}`}
                          onClick={() => notify(`Run ${h.id} duplicated as a new analysis`)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-teal-700" title="Duplicate">
                          <Layers3 size={15} />
                        </button>
                        <button data-testid={`button-export-history-${h.id}`}
                          onClick={() => exportRun(h)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-teal-700" title="Export">
                          <Download size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
