import { ArrowLeft, ArrowRight, Clock3, FileCheck2, Share2, Sparkles, Target, UploadCloud } from 'lucide-react';
import type { ElementType } from 'react';
import { Link, useParams } from 'wouter';
import { Card, PageHeader, ProgressBar, ScoreRing, StatusBadge } from '@/components/common';
import { activeSubmission, modules, submissions } from '@/data/mock-data';

const tabs: [string, string][] = [
  ['', 'Overview'],
  ['/analysis', 'Analysis'],
  ['/modules', 'Modules'],
  ['/gaps', 'Gaps'],
  ['/evidence', 'Evidence'],
];

export function SubmissionOverviewPage() {
  const { id = 'sub-2408' } = useParams();
  const sub = submissions.find((item) => item.id === id) ?? activeSubmission;

  return (
    <>
      <Link
        href="/submissions"
        className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"
        data-testid="link-back-submissions-overview"
      >
        <ArrowLeft className="h-4 w-4" /> All submissions
      </Link>
      <PageHeader
        eyebrow={`${sub.type} · ${sub.region}`}
        title={sub.product}
        description={`${sub.sponsor} · Target submission ${sub.targetDate}`}
        action={
          <div className="flex gap-2">
            <button
              className="rounded-xl border border-border px-3.5 py-2.5 text-xs font-bold hover:bg-muted"
              data-testid="button-share-submission"
            >
              <Share2 className="mr-1.5 inline h-3.5 w-3.5" /> Share
            </button>
            <Link
              href={`/submissions/${sub.id}/analysis`}
              className="rounded-xl bg-brand-gradient px-4 py-2.5 text-xs font-bold text-white shadow-soft"
              data-testid="link-run-analysis"
            >
              <Sparkles className="mr-1.5 inline h-3.5 w-3.5" /> Open analysis
            </Link>
          </div>
        }
      />

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 shadow-soft">
        {tabs.map(([path, label]) => (
          <Link
            key={label}
            href={`/submissions/${sub.id}${path}`}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold ${
              path === '' ? 'bg-[#e9f7f4] text-[#369a96]' : 'text-muted-foreground hover:bg-muted'
            }`}
            data-testid={`link-submission-tab-${label.toLowerCase()}`}
          >
            {label}
            {label === 'Gaps' && (
              <span className="ml-1.5 rounded-full bg-[#fce9e5] px-1.5 py-0.5 text-[9px] text-[#c75d52]">
                {sub.criticalGaps}
              </span>
            )}
          </Link>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <ScoreRing score={sub.readiness} size={144} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <StatusBadge>{sub.status}</StatusBadge>
                <span className="text-[11px] text-muted-foreground">Updated {sub.updatedAt}</span>
              </div>
              <h2 className="mt-3 font-display text-xl font-extrabold">Good progress, with a few decisions left</h2>
              <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground">
                Your dossier is tracking above the workspace average. Close the open critical gaps in Module 5 to
                move from review to filing-ready.
              </p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex-1">
                  <ProgressBar value={sub.progress} />
                </div>
                <span className="text-xs font-bold">{sub.progress}% complete</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-extrabold">Readiness focus</h2>
          </div>
          <div className="mt-5 space-y-4">
            <div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Critical gaps</span>
                <strong className="text-[#c75d52]">{sub.criticalGaps} open</strong>
              </div>
              <ProgressBar value={38} color="bg-[#e9806e]" />
            </div>
            <div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Evidence mapped</span>
                <strong>88%</strong>
              </div>
              <ProgressBar value={88} />
            </div>
            <div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Sections complete</span>
                <strong>74 / 82</strong>
              </div>
              <ProgressBar value={90} />
            </div>
          </div>
          <Link
            href={`/submissions/${sub.id}/gaps`}
            className="mt-5 inline-flex items-center text-xs font-bold text-primary hover:underline"
            data-testid="link-review-gaps"
          >
            Review open gaps <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
            <div>
              <h2 className="font-display text-base font-extrabold">CTD module readiness</h2>
              <p className="mt-1 text-xs text-muted-foreground">Score and completeness by module</p>
            </div>
            <Link href={`/submissions/${sub.id}/modules`} className="text-xs font-bold text-primary" data-testid="link-view-modules">
              View details <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-border/70">
            {modules.map((module) => (
              <div key={module.id} className="flex items-center gap-4 px-5 py-4">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#eaf7f5] text-[10px] font-extrabold text-[#3da5a0]">
                  {module.shortName.replace('Module ', 'M')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs font-bold">{module.name}</span>
                    <StatusBadge>{module.status}</StatusBadge>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <ProgressBar value={module.score} />
                    <span className="w-8 text-right text-[10px] font-bold">{module.score}</span>
                  </div>
                </div>
                <span className="hidden text-[10px] text-muted-foreground sm:block">
                  {module.completed}/{module.sections} sections
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-extrabold">Recent activity</h2>
              <p className="mt-1 text-xs text-muted-foreground">Latest changes in this workspace</p>
            </div>
            <Clock3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-5 space-y-5">
            <ActivityItem title="Readiness scan completed" meta="ReguLens Assist · 12 min ago" icon={Sparkles} />
            <ActivityItem title="3.2.P.5.4 marked in progress" meta="Jon Bell · 1 hr ago" icon={FileCheck2} />
            <ActivityItem title="New evidence uploaded" meta="Maya Chen · Yesterday" icon={UploadCloud} />
          </div>
        </Card>
      </div>
    </>
  );
}

function ActivityItem({ title, meta, icon: Icon }: { title: string; meta: string; icon: ElementType }) {
  return (
    <div className="flex gap-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#edf8f6] text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs font-bold">{title}</p>
        <p className="mt-1 text-[10px] text-muted-foreground">{meta}</p>
      </div>
    </div>
  );
}
