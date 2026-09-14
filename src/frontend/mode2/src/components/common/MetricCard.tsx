import type { ElementType } from 'react';
import { Card } from '@/components/common/Card';

export function MetricCard({
  label,
  value,
  note,
  accent,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  accent: string;
  icon: ElementType;
}) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className={`absolute right-0 top-0 h-20 w-20 rounded-bl-[50px] opacity-20 ${accent}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-[30px] font-extrabold tracking-[-0.05em]">{value}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${accent} bg-opacity-15`}>
          <Icon className="h-[18px] w-[18px] text-[#51b8b3]" />
        </div>
      </div>
    </Card>
  );
}
