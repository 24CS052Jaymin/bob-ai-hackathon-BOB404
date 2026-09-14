import { ArrowLeft, Check, ChevronRight, Info } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';
import { Card, PageHeader, ScoreRing, StatusBadge } from '@/components/common';
import { modules } from '@/data/mock-data';

const sectionRows = [
  '3.2.P.1 Description and composition',
  '3.2.P.2 Pharmaceutical development',
  '3.2.P.5 Control of drug product',
  '3.2.P.8 Stability',
];

export function ModulesPage() {
  const [selected, setSelected] = useState('m5');
  const module = modules.find((item) => item.id === selected) ?? modules[4];

  return (
    <>
      <Link
        href="/submissions/sub-2408"
        className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"
        data-testid="link-back-modules"
      >
        <ArrowLeft className="h-4 w-4" /> Lumineximab overview
      </Link>
      <PageHeader eyebrow="Module review" title="CTD modules" description="Inspect completeness and readiness at the section level." />

      <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-border/70 px-5 py-4">
            <h2 className="font-display text-base font-extrabold">All modules</h2>
            <p className="mt-1 text-xs text-muted-foreground">Select a module to inspect</p>
          </div>
          <div className="divide-y divide-border/70">
            {modules.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item.id)}
                className={`flex w-full items-center gap-3 px-5 py-4 text-left ${
                  selected === item.id ? 'bg-[#f0faf8]' : 'hover:bg-muted/60'
                }`}
                data-testid={`button-select-module-${item.id}`}
              >
                <div
                  className={`grid h-9 w-9 place-items-center rounded-xl text-[10px] font-extrabold ${
                    selected === item.id ? 'bg-primary text-white' : 'bg-[#eaf7f5] text-[#3da5a0]'
                  }`}
                >
                  {item.shortName.replace('Module ', 'M')}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">{item.name}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {item.completed} of {item.sections} sections complete
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

        <Card className="p-6">
          <div className="flex flex-col justify-between gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-start">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{module.shortName}</span>
              <h2 className="mt-1 font-display text-xl font-extrabold">{module.name}</h2>
              <p className="mt-1 text-xs text-muted-foreground">Last checked today at 10:42 AM</p>
            </div>
            <ScoreRing score={module.score} size={82} />
          </div>
          <div className="grid gap-3 py-5 sm:grid-cols-3">
            <div>
              <p className="text-[10px] text-muted-foreground">Sections</p>
              <p className="mt-1 text-lg font-extrabold">{module.sections}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Complete</p>
              <p className="mt-1 text-lg font-extrabold">{module.completed}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Attention</p>
              <p className="mt-1 text-lg font-extrabold text-[#c75d52]">{module.attentionCount}</p>
            </div>
          </div>
          <div className="space-y-2">
            {sectionRows.map((section, index) => (
              <div key={section} className="flex items-center gap-3 rounded-xl border border-border/70 p-3">
                <div
                  className={`grid h-7 w-7 place-items-center rounded-lg ${
                    index === 2 ? 'bg-[#fff4da] text-[#a57524]' : 'bg-[#e3f5f1] text-primary'
                  }`}
                >
                  {index === 2 ? <Info className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                </div>
                <span className="flex-1 text-xs font-semibold">{section}</span>
                <span className="hidden text-[10px] text-muted-foreground sm:block">
                  {index === 2 ? '1 finding' : 'Complete'}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
