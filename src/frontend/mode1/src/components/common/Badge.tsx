import type { ReactNode } from 'react';

const toneStyles = {
  teal: 'bg-teal-50 text-teal-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-rose-50 text-rose-700',
  green: 'bg-emerald-50 text-emerald-700',
  slate: 'bg-slate-100 text-slate-600',
};

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: keyof typeof toneStyles }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${toneStyles[tone]}`}>
      {children}
    </span>
  );
}
