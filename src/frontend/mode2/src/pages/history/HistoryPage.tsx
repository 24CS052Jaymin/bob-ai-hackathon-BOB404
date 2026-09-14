import { Activity, ChevronRight, Filter, FilePlus2, Sparkles, UploadCloud } from 'lucide-react';
import { Card, PageHeader } from '@/components/common';

const activity = [
  {
    title: 'Readiness analysis completed',
    detail: 'Lumineximab · 1,284 documents analyzed',
    user: 'ReguLens Assist',
    time: '12 min ago',
    icon: Sparkles,
  },
  {
    title: 'Gap status changed to In progress',
    detail: '3.2.P.5.4 · Specification justification needs update',
    user: 'Jon Bell',
    time: '1 hr ago',
    icon: Activity,
  },
  {
    title: 'Evidence uploaded',
    detail: 'stability-data-36-months.xlsx · Module 3',
    user: 'Maya Chen',
    time: 'Yesterday',
    icon: UploadCloud,
  },
  {
    title: 'Submission created',
    detail: 'Rizafolin · BLA · US / FDA',
    user: 'Morgan Cole',
    time: 'Sep 05, 2024',
    icon: FilePlus2,
  },
];

export function HistoryPage() {
  return (
    <>
      <PageHeader
        eyebrow="Audit trail"
        title="Version history"
        description="A complete record of changes made across your submission workspaces."
        action={
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold hover:bg-muted"
            data-testid="button-history-filter"
          >
            <Filter className="h-4 w-4" /> Filter activity
          </button>
        }
      />
      <Card>
        <div className="border-b border-border/70 px-5 py-4">
          <h2 className="font-display text-base font-extrabold">Recent activity</h2>
          <p className="mt-1 text-xs text-muted-foreground">September 2024 · 38 changes</p>
        </div>
        <div className="divide-y divide-border/70">
          {activity.map((item) => (
            <div key={item.title} className="flex gap-4 px-5 py-5">
              <div className="relative">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#eaf7f5] text-primary">
                  <item.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  {item.user} · {item.time}
                </p>
              </div>
              <button
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                aria-label={`View ${item.title}`}
                data-testid={`button-view-history-${item.title.toLowerCase().replace(/\s/g, '-')}`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
