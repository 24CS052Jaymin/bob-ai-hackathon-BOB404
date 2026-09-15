import { Layers3, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Badge, Button, PageHeader } from '@/components/common';
import { useApp } from '@/context/AppProvider';
import type { Cluster } from '@/types';

/**
 * ClustersPage — derives cluster groups directly from the live signals in context.
 * No mock-data import. Each unique `signal.cluster` label becomes one Cluster entry.
 */
export function ClustersPage() {
  const { signals, loading, notify } = useApp();
  const [query, setQuery] = useState('');

  // Build Cluster objects from real signal data
  const clusters: Cluster[] = useMemo(() => {
    const map = new Map<string, Cluster>();
    signals.forEach((s) => {
      const key = s.cluster;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: key,
          eventCount: 0,
          emerging: s.priority === 'High',
          events: [],
          drugs: [],
        });
      }
      const c = map.get(key)!;
      if (!c.events.includes(s.event)) { c.events.push(s.event); c.eventCount++; }
      if (!c.drugs.includes(s.drug))   c.drugs.push(s.drug);
    });
    return Array.from(map.values()).sort((a, b) => b.eventCount - a.eventCount);
  }, [signals]);

  const [selected, setSelected] = useState<Cluster | null>(null);
  const activeCluster = selected ?? clusters[0] ?? null;

  const visible = clusters.filter(
    (c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.id.toLowerCase().includes(query.toLowerCase()),
  );

  // Signals that belong to the selected cluster
  const clusterSignals = signals.filter((s) => s.cluster === activeCluster?.id).slice(0, 6);

  return (
    <div className="mx-auto max-w-[1400px] animate-enter">
      <PageHeader
        eyebrow="Pattern discovery"
        title="Signal clusters"
        description="Explore related events and drugs that may share a reporting context."
        actions={
          <Button testId="button-refresh-clusters" variant="secondary" onClick={() => notify('Cluster view refreshed')} icon={<RefreshCw size={14} />}>
            Refresh
          </Button>
        }
      />

      {loading && (
        <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-400">Loading clusters from backend…</div>
      )}

      {!loading && clusters.length === 0 ? (
        <div className="surface p-12 text-center text-xs text-slate-400">
          No clusters yet — run an analysis to generate signal data.
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[.8fr_1.5fr]">
          {/* Cluster list */}
          <div className="surface overflow-hidden">
            <div className="border-b border-slate-100 p-4">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  data-testid="input-cluster-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a cluster"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 text-xs outline-none focus:border-teal-400"
                />
              </div>
            </div>
            <div className="max-h-[620px] overflow-y-auto p-2">
              {visible.map((c) => (
                <button
                  key={c.id}
                  data-testid={`button-cluster-${c.id}`}
                  onClick={() => setSelected(c)}
                  className={`w-full rounded-xl px-3.5 py-3 text-left transition ${activeCluster?.id === c.id ? 'bg-teal-50' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`mono text-[10px] font-bold ${activeCluster?.id === c.id ? 'text-teal-700' : 'text-slate-400'}`}>
                      {c.id.slice(0, 20)}{c.id.length > 20 ? '…' : ''}
                    </span>
                    {c.emerging && <Badge tone="amber">Emerging</Badge>}
                  </div>
                  <div className="mt-1 text-xs font-bold text-slate-700">{c.name}</div>
                  <div className="mt-1 text-[10px] text-slate-400">
                    {c.eventCount} related events · {c.drugs.length} drugs
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Cluster detail */}
          {activeCluster && (
            <div className="space-y-5">
              <div className="surface soft-grid min-h-[340px] overflow-hidden p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-teal-600">
                      {activeCluster.id.slice(0, 30)}
                    </div>
                    <h2 className="mt-1 text-xl font-bold text-slate-800">{activeCluster.name}</h2>
                    <p className="mt-1 text-xs text-slate-500">Co-reporting relationship map</p>
                  </div>
                  <Badge tone={activeCluster.emerging ? 'amber' : 'teal'}>
                    {activeCluster.emerging ? 'Emerging pattern' : 'Established pattern'}
                  </Badge>
                </div>

                <div className="relative mx-auto mt-7 h-[210px] max-w-[640px]">
                  <svg className="absolute inset-0 h-full w-full" viewBox="0 0 600 210" preserveAspectRatio="none">
                    <line x1="300" y1="105" x2="105" y2="48" stroke="#9edbd6" strokeWidth="2" />
                    <line x1="300" y1="105" x2="105" y2="165" stroke="#9edbd6" strokeWidth="2" />
                    <line x1="300" y1="105" x2="495" y2="48" stroke="#9edbd6" strokeWidth="2" />
                    <line x1="300" y1="105" x2="495" y2="165" stroke="#9edbd6" strokeWidth="2" />
                  </svg>
                  <div className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-8 border-teal-100 bg-teal-500 text-center text-white shadow-lg">
                    <Layers3 size={21} />
                    <span className="mt-1 text-[10px] font-bold">{activeCluster.eventCount} events</span>
                    <span className="text-[9px] text-teal-50">cluster</span>
                  </div>
                  {activeCluster.events.slice(0, 2).map((e, i) => (
                    <div key={e} className={`absolute ${i ? 'bottom-2 left-0' : 'left-0 top-2'} flex max-w-[155px] items-center gap-2 rounded-xl border border-teal-100 bg-white px-3 py-2 shadow-sm`}>
                      <div className="h-2 w-2 rounded-full bg-amber-400" />
                      <span className="text-[10px] font-bold text-slate-600">{e}</span>
                    </div>
                  ))}
                  {activeCluster.drugs.slice(0, 2).map((d, i) => (
                    <div key={d} className={`absolute ${i ? 'bottom-2 right-0' : 'right-0 top-2'} flex max-w-[155px] items-center gap-2 rounded-xl border border-teal-100 bg-white px-3 py-2 shadow-sm`}>
                      <div className="h-2 w-2 rounded-full bg-teal-400" />
                      <span className="text-[10px] font-bold text-slate-600">{d}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="surface p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-700">Cluster signals</div>
                    <div className="mt-1 text-xs text-slate-400">Drill into associated signals</div>
                  </div>
                  <Link href="/safety/signals" data-testid="link-cluster-signals" className="text-xs font-bold text-teal-600">
                    View all signals
                  </Link>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {clusterSignals.map((s) => (
                    <Link
                      key={s.id}
                      href={`/safety/signals/${s.id}`}
                      data-testid={`link-cluster-signal-${s.id}`}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3 hover:bg-teal-50"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-700">{s.drug}</div>
                        <div className="text-[10px] text-slate-400">{s.event}</div>
                      </div>
                      <span className="mono text-xs font-bold text-teal-700">{s.prr.toFixed(2)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
