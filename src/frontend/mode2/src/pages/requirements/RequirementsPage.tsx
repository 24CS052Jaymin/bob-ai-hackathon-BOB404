import { Check, ChevronRight, CircleHelp, Filter, Loader2, RefreshCw, Search } from 'lucide-react';
import { useState } from 'react';
import { Card, PageHeader } from '@/components/common';
import { useRequirements } from '@/hooks/useSubmission';

export function RequirementsPage() {
  const { requirements, loading, error, refetch } = useRequirements();
  const [query, setQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  // Derive unique modules from live data
  const modules = Array.from(
    new Set(requirements.map((r) => r.module).filter(Boolean)),
  ).sort();

  const filtered = requirements.filter((item) => {
    const matchesQuery = `${item.requirement_id} ${item.section_title} ${item.module}`.toLowerCase().includes(query.toLowerCase());
    const matchesModule = !selectedModule || item.module === selectedModule;
    return matchesQuery && matchesModule;
  });

  return (
    <>
      <PageHeader
        eyebrow="Reference library"
        title="ICH M4 requirements"
        description="A practical reference for the structure and content of your Common Technical Document."
        action={
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold hover:bg-muted"
            data-testid="button-requirements-help"
          >
            <CircleHelp className="h-4 w-4" /> Guide me
          </button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[0.5fr_1.5fr]">
        <Card className="h-fit p-5">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#e3f5f1] text-primary">
              <Check className="h-4 w-4" />
            </div>
            <h2 className="font-display text-base font-extrabold">CTD structure</h2>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Navigate the five modules that make up a complete submission.
          </p>

          {loading ? (
            <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="mt-5 space-y-2">
              <button
                onClick={() => setSelectedModule(null)}
                className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left ${!selectedModule ? 'bg-[#e9f7f4] text-primary' : 'hover:bg-muted'}`}
              >
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#e7f6f3] text-[10px] font-extrabold text-primary">All</span>
                <span className="flex-1 text-xs font-semibold">All modules ({requirements.length})</span>
              </button>
              {modules.map((module) => {
                const count = requirements.filter((r) => r.module === module).length;
                const key = module.replace('Module ', 'M').replace('module ', 'M');
                return (
                  <button
                    key={module}
                    onClick={() => setSelectedModule(module)}
                    className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left ${selectedModule === module ? 'bg-[#e9f7f4] text-primary' : 'hover:bg-muted'}`}
                    data-testid={`button-requirement-${module}`}
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#e7f6f3] text-[10px] font-extrabold text-primary">
                      {key.slice(0, 2)}
                    </span>
                    <span className="flex-1 text-xs font-semibold">{module}</span>
                    <span className="text-[10px] text-muted-foreground">{count}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-background pl-10 text-xs outline-none focus:border-primary"
                placeholder="Search requirement ID or title..."
                aria-label="Search requirements"
                data-testid="input-search-requirements"
              />
            </div>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 text-xs font-bold hover:bg-muted"
              data-testid="button-filter-requirements"
            >
              <Filter className="h-4 w-4" /> Filters
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading requirements…
            </div>
          )}

          {!loading && error && (
            <div className="p-8 text-center">
              <p className="text-sm font-bold text-destructive">{error}</p>
              <button onClick={refetch} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-bold hover:bg-muted">
                <RefreshCw className="h-4 w-4" /> Retry
              </button>
            </div>
          )}

          {!loading && !error && (
            <div className="divide-y divide-border/70">
              {filtered.length === 0 ? (
                <div className="p-10 text-center text-xs text-muted-foreground">
                  {requirements.length === 0 ? 'No requirements loaded.' : 'No requirements match your search.'}
                </div>
              ) : (
                filtered.slice(0, 100).map((item) => (
                  <button
                    key={item.requirement_id}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-[#f8fcfb]"
                    data-testid={`row-requirement-${item.requirement_id}`}
                  >
                    <span className="w-24 shrink-0 text-xs font-extrabold text-primary">{item.requirement_id}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-bold">{item.section_title}</span>
                      <span className="mt-1 block text-[10px] text-muted-foreground">
                        {item.module} · {item.mandatory_status}
                      </span>
                    </span>
                    <span className="hidden rounded-full bg-[#eaf4ef] px-2.5 py-1 text-[10px] font-bold text-[#4b8d70] sm:block">
                      {item.applicability || item.mandatory_status}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))
              )}
              {filtered.length > 100 && (
                <div className="px-5 py-3 text-xs text-muted-foreground">
                  Showing 100 of {filtered.length} requirements. Refine your search to see more.
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
