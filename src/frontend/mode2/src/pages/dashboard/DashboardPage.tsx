import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  FileText,
  FolderOpen,
  Gauge,
  MoreHorizontal,
  Plus,
  Sparkles,
} from 'lucide-react';
import type { ElementType } from 'react';
import { Link } from 'wouter';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, MetricCard, ProgressBar, ScoreRing, StatusBadge } from '@/components/common';
import { submissions } from '@/data/mock-data';
import type { Submission } from '@/types';

const chartData = [
  { name: 'Apr', value: 58 },
  { name: 'May', value: 62 },
  { name: 'Jun', value: 69 },
  { name: 'Jul', value: 67 },
  { name: 'Aug', value: 78 },
  { name: 'Sep', value: 84 },
];

export function DashboardPage() {
  return (
    <>
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            Workspace overview
          </div>
          <h1 className="font-display text-[28px] font-extrabold tracking-[-0.04em] text-foreground md:text-[34px]">
            Submission readiness
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            A clear view of what needs your attention before the next filing milestone.
          </p>
        </div>
        <Link
          href="/submissions/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-xs font-bold text-white shadow-soft hover:-translate-y-0.5"
          data-testid="link-new-submission"
        >
          <Plus className="h-4 w-4" /> New submission
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active submissions" value="5" note="2 need attention today" accent="bg-[#62cec5]" icon={FolderOpen} />
        <MetricCard label="Average readiness" value="76.8%" note="Up 4.2% from last month" accent="bg-[#65c6df]" icon={Gauge} />
        <MetricCard label="Open critical gaps" value="26" note="8 due within 7 days" accent="bg-[#e9806e]" icon={AlertCircle} />
        <MetricCard label="Documents reviewed" value="1,284" note="96 added this week" accent="bg-[#f2c965]" icon={FileCheck2} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <Card className="p-5 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-extrabold">Readiness trend</h2>
              <p className="mt-1 text-xs text-muted-foreground">Average score across active submissions</p>
            </div>
            <button
              className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted"
              data-testid="button-trend-range"
            >
              Last 6 months <ChevronRight className="ml-1 inline h-3 w-3 rotate-90" />
            </button>
          </div>
          <div className="mt-5 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: -20, right: 4, top: 5, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#edf2f1" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#899598' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#899598' }} domain={[0, 100]} />
                <Tooltip cursor={{ fill: '#f3f9f8' }} contentStyle={{ border: '1px solid #e5efed', borderRadius: 10, fontSize: 11 }} />
                <Bar dataKey="value" fill="#5fc7c1" radius={[5, 5, 0, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 md:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-base font-extrabold">Portfolio health</h2>
              <p className="mt-1 text-xs text-muted-foreground">Where your submissions stand today</p>
            </div>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#e4f5f1]">
              <Activity className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="mt-6 flex items-center gap-5">
            <ScoreRing score={77} size={124} />
            <div className="flex-1 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <i className="h-2 w-2 rounded-full bg-[#58c9c5]" /> Ready
                </span>
                <strong>1</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <i className="h-2 w-2 rounded-full bg-[#f2c965]" /> In review
                </span>
                <strong>3</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <i className="h-2 w-2 rounded-full bg-[#e9806e]" /> At risk
                </span>
                <strong>1</strong>
              </div>
            </div>
          </div>
          <div className="mt-7 rounded-xl bg-[#f1faf8] p-3 text-xs leading-relaxed text-[#4f7773]">
            <Sparkles className="mr-1.5 inline h-3.5 w-3.5" /> Your portfolio is trending up. Close 3 critical gaps to
            reach the next readiness band.
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
            <div>
              <h2 className="font-display text-base font-extrabold">Active submissions</h2>
              <p className="mt-1 text-xs text-muted-foreground">Latest workspace activity</p>
            </div>
            <Link href="/submissions" className="text-xs font-bold text-primary hover:underline" data-testid="link-view-all-submissions">
              View all <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-border/70">
            {submissions.slice(0, 4).map((item) => (
              <SubmissionRow key={item.id} item={item} />
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-extrabold">Next up</h2>
              <p className="mt-1 text-xs text-muted-foreground">Tasks across your workspace</p>
            </div>
            <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="More task options" data-testid="button-more-tasks">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 space-y-3">
            <Task icon={AlertCircle} tone="critical" text="Review integrated efficacy summary" meta="Lumineximab · Module 5" />
            <Task icon={FileText} tone="warning" text="Upload updated stability data" meta="Velunavir · Module 3" />
            <Task icon={CheckCircle2} tone="success" text="Confirm final submission package" meta="Rizafolin · Today" done />
          </div>
        </Card>
      </div>
    </>
  );
}

function Task({
  icon: Icon,
  tone,
  text,
  meta,
  done,
}: {
  icon: ElementType;
  tone: 'critical' | 'warning' | 'success';
  text: string;
  meta: string;
  done?: boolean;
}) {
  const colors = {
    critical: 'bg-[#fce9e5] text-[#c75d52]',
    warning: 'bg-[#fff3d7] text-[#aa7b2c]',
    success: 'bg-[#e2f5ed] text-[#438f70]',
  };
  return (
    <button
      className={`flex w-full items-start gap-3 rounded-xl p-2.5 text-left hover:bg-muted ${done ? 'opacity-65' : ''}`}
      data-testid={`button-task-${text.toLowerCase().replace(/\s/g, '-')}`}
    >
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${colors[tone]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className={`block text-xs font-bold ${done ? 'line-through' : ''}`}>{text}</span>
        <span className="mt-1 block text-[10px] text-muted-foreground">{meta}</span>
      </span>
      <ChevronRight className="ml-auto mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function SubmissionRow({ item }: { item: Submission }) {
  return (
    <Link
      href={`/submissions/${item.id}`}
      className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#f8fcfb]"
      data-testid={`row-submission-${item.id}`}
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e5f6f3] text-xs font-extrabold text-[#47aaa8]">
        {item.product.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-xs font-bold">{item.product}</span>
          <StatusBadge>{item.status}</StatusBadge>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {item.sponsor} · {item.region}
        </p>
      </div>
      <div className="hidden w-24 sm:block">
        <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
          <span>Readiness</span>
          <strong className="text-foreground">{item.readiness}%</strong>
        </div>
        <ProgressBar value={item.readiness} />
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
