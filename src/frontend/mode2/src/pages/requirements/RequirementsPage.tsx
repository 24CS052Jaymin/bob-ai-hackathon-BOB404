import { Check, ChevronRight, CircleHelp, Filter, Search } from 'lucide-react';
import { useState } from 'react';
import { Card, PageHeader } from '@/components/common';
import { modules } from '@/data/mock-data';

const requirements = [
  { id: '2.7.3', title: 'Summary of clinical efficacy', module: 'Module 2', owner: 'Clinical', status: 'Required' },
  { id: '3.2.P.5', title: 'Control of drug product', module: 'Module 3', owner: 'CMC', status: 'Required' },
  { id: '5.3.5.1', title: 'Reports of controlled clinical studies', module: 'Module 5', owner: 'Clinical', status: 'Required' },
  { id: '1.3.1', title: 'Product information', module: 'Module 1', owner: 'Regulatory', status: 'Regional' },
  { id: '3.2.S.7', title: 'Stability', module: 'Module 3', owner: 'CMC', status: 'Required' },
];

export function RequirementsPage() {
  const [query, setQuery] = useState('');
  const reqs = requirements.filter((item) =>
    `${item.id} ${item.title} ${item.module}`.toLowerCase().includes(query.toLowerCase()),
  );

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
          <div className="mt-5 space-y-2">
            {modules.map((module) => (
              <button
                key={module.id}
                className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-muted"
                data-testid={`button-requirement-${module.id}`}
              >
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#e7f6f3] text-[10px] font-extrabold text-primary">
                  {module.shortName.replace('Module ', 'M')}
                </span>
                <span className="flex-1 text-xs font-semibold">{module.name}</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>
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
          <div className="divide-y divide-border/70">
            {reqs.map((item) => (
              <button
                key={item.id}
                className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-[#f8fcfb]"
                data-testid={`row-requirement-${item.id}`}
              >
                <span className="w-20 text-xs font-extrabold text-primary">{item.id}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold">{item.title}</span>
                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    {item.module} · Owner: {item.owner}
                  </span>
                </span>
                <span className="hidden rounded-full bg-[#eaf4ef] px-2.5 py-1 text-[10px] font-bold text-[#4b8d70] sm:block">
                  {item.status}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
