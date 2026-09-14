import type { ElementType } from 'react';

const toneStyles = {
  teal: 'bg-teal-50 text-teal-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-600',
};

export function StatCard({
  label,
  value,
  delta,
  icon: StatIcon,
  tone = 'teal',
}: {
  label: string;
  value: string;
  delta: string;
  icon: ElementType;
  tone?: keyof typeof toneStyles;
}) {
  return (
    <div className="surface surface-hover p-5">
      <div className="flex items-start justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneStyles[tone]}`}>
          <StatIcon size={18} />
        </div>
        <span className="text-[10px] font-bold text-emerald-600">{delta}</span>
      </div>
      <div className="metric-number mt-5 text-[27px] font-bold text-slate-800">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}
