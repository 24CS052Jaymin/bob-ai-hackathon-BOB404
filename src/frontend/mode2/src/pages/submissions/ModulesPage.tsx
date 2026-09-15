import { ArrowLeft, Check, ChevronRight, Info, Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'wouter';
import { Card, PageHeader, ScoreRing, StatusBadge } from '@/components/common';
import { useModules } from '@/hooks/useSubmission';
import type { ModuleScore as _ModuleScore } from '@/lib/api';

export function ModulesPage() {
  const { id } = useParams<{ id: string }>();
  const { modules, loading, error, refetch } = useModules(id);
  const [selected, setSelected] = useState<string | null>(null);

  // Auto-select first module once loaded
  const selectedKey = selected ?? modules[0]?.module ?? null;
  const module = modules.find((m) => m.module === selectedKey) ?? modules[0] ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading modules…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center">
        <p className="text-sm font-bold text-destructive">{error}</p>
        <button onClick={refetch} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-bold hover:bg-muted">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <Link
        href={`/submissions/${id}`}
        className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"
        data-testid="link-back-modules"
      >
        <ArrowLeft className="h-4 w-4" /> Submission overview
      </Link>
      <PageHeader eyebrow="Module review" title="CTD modules" description="Inspect completeness and readiness at the section level." />

      {modules.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <p className="text-sm font-bold">No module data yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Run an analysis first to see module scores.</p>
          <Link href={`/submissions/${id}/analysis`} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-xs font-bold text-white shadow-soft">
            Run analysis
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
          <Card className="overflow-hidden">
            <div className="border-b border-border/70 px-5 py-4">
              <h2 className="font-display text-base font-extrabold">All modules</h2>
              <p className="mt-1 text-xs text-muted-foreground">Select a module to inspect</p>
            </div>
            <div className="divide-y divide-border/70">
              {modules.map((item) => (
                <button
                  key={item.module}
                  onClick={() => setSelected(item.module)}
                  className={`flex w-full items-center gap-3 px-5 py-4 text-left ${
                    selectedKey === item.module ? 'bg-[#f0faf8]' : 'hover:bg-muted/60'
                  }`}
                  data-testid={`button-select-module-${item.module}`}
                >
                  <div
                    className={`grid h-9 w-9 place-items-center rounded-xl text-[10px] font-extrabold ${
                      selectedKey === item.module ? 'bg-primary text-white' : 'bg-[#eaf7f5] text-[#3da5a0]'
                    }`}
                  >
                    M{item.module}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">{item.label}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {item.present} of {item.total} requirements met
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold">{item.score}</p>
                    <StatusBadge>{item.status}</StatusBadge>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {module && (
            <Card className="p-6">
              <div className="flex flex-col justify-between gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Module {module.module}</span>
                  <h2 className="mt-1 font-display text-xl font-extrabold">{module.label}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Overall readiness: {module.status}</p>
                </div>
                <ScoreRing score={module.score} size={82} />
              </div>
              <div className="grid gap-3 py-5 sm:grid-cols-4">
                <div>
                  <p className="text-[10px] text-muted-foreground">Total</p>
                  <p className="mt-1 text-lg font-extrabold">{module.total}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Present</p>
                  <p className="mt-1 text-lg font-extrabold text-[#4c9a7c]">{module.present}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Partial</p>
                  <p className="mt-1 text-lg font-extrabold text-[#a57524]">{module.partial}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Missing</p>
                  <p className="mt-1 text-lg font-extrabold text-[#c75d52]">{module.missing}</p>
                </div>
              </div>
              <div className="space-y-2">
                <RequirementRow label="PRESENT" count={module.present} icon="check" />
                <RequirementRow label="PARTIAL" count={module.partial} icon="info" />
                <RequirementRow label="MISSING" count={module.missing} icon="alert" />
              </div>
            </Card>
          )}
        </div>
      )}
    </>
  );
}

function RequirementRow({ label, count, icon }: { label: string; count: number; icon: 'check' | 'info' | 'alert' }) {
  const colors = {
    check: 'bg-[#e3f5f1] text-primary',
    info: 'bg-[#fff4da] text-[#a57524]',
    alert: 'bg-[#fce9e5] text-[#c75d52]',
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 p-3">
      <div className={`grid h-7 w-7 place-items-center rounded-lg ${colors[icon]}`}>
        {icon === 'check' ? <Check className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
      </div>
      <span className="flex-1 text-xs font-semibold">{label}</span>
      <span className="text-xs font-bold">{count}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}
