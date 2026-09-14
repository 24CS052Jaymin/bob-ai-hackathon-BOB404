import { ArrowRight, Download, FileText, Plus, Share2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Card, PageHeader, StatusBadge } from '@/components/common';
import { reports as initialReports } from '@/data/mock-data';

export function ReportsPage() {
  const [reportList, setReportList] = useState(initialReports);

  const create = () =>
    setReportList((items) => [
      {
        id: `r${items.length + 4}`,
        name: 'Lumineximab readiness report',
        submissionId: 'sub-2408',
        createdAt: 'Just now',
        format: 'PDF',
        status: 'Generating',
      },
      ...items,
    ]);

  return (
    <>
      <PageHeader
        eyebrow="Workspace outputs"
        title="Reports"
        description="Shareable readiness summaries for your regulatory review team."
        action={
          <button
            onClick={create}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-xs font-bold text-white shadow-soft hover:-translate-y-0.5"
            data-testid="button-generate-report"
          >
            <Plus className="h-4 w-4" /> Generate report
          </button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_0.46fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-border/70 px-5 py-4">
            <h2 className="font-display text-base font-extrabold">Generated reports</h2>
            <p className="mt-1 text-xs text-muted-foreground">{reportList.length} reports in this workspace</p>
          </div>
          <div className="divide-y divide-border/70">
            {reportList.map((report) => (
              <div key={report.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center" data-testid={`row-report-${report.id}`}>
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf7f5] text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">{report.name}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {report.createdAt} · {report.format} · {report.submissionId}
                  </p>
                </div>
                <StatusBadge>{report.status === 'Generating' ? 'Processing' : 'Ready'}</StatusBadge>
                <div className="flex gap-1">
                  <button
                    className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                    aria-label={`Download ${report.name}`}
                    data-testid={`button-download-report-${report.id}`}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                    aria-label={`Share ${report.name}`}
                    data-testid={`button-share-report-${report.id}`}
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e3f5f1] text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <h2 className="mt-4 font-display text-base font-extrabold">Make review easier</h2>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Generate a focused report for a team meeting, a module owner, or an external review.
          </p>
          <div className="mt-5 space-y-2">
            <button
              onClick={create}
              className="flex w-full items-center justify-between rounded-xl border border-border p-3 text-left text-xs font-bold hover:bg-muted"
              data-testid="button-generate-readiness"
            >
              <span>Full readiness report</span>
              <ArrowRight className="h-4 w-4 text-primary" />
            </button>
            <button
              onClick={create}
              className="flex w-full items-center justify-between rounded-xl border border-border p-3 text-left text-xs font-bold hover:bg-muted"
              data-testid="button-generate-gap"
            >
              <span>Gap register</span>
              <ArrowRight className="h-4 w-4 text-primary" />
            </button>
          </div>
        </Card>
      </div>
    </>
  );
}
