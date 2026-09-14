const statusStyles: Record<string, string> = {
  'Ready to submit': 'bg-[#e4f6ee] text-[#398969]',
  'In review': 'bg-[#e0f3f5] text-[#318e9b]',
  Processing: 'bg-[#fff4d9] text-[#a47523]',
  Draft: 'bg-[#edf0f1] text-[#69757a]',
  Critical: 'bg-[#fce9e5] text-[#c75d52]',
  Major: 'bg-[#fff1dc] text-[#a8752e]',
  Minor: 'bg-[#eaf2f0] text-[#5b7d75]',
  Open: 'bg-[#fce9e5] text-[#c75d52]',
  'In progress': 'bg-[#fff4d9] text-[#a47523]',
  Resolved: 'bg-[#e4f6ee] text-[#398969]',
  Mapped: 'bg-[#e4f6ee] text-[#398969]',
  'Needs review': 'bg-[#fff4d9] text-[#a47523]',
  Unmapped: 'bg-[#fce9e5] text-[#c75d52]',
};

export function StatusBadge({ children }: { children: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ${
        statusStyles[children] ?? 'bg-muted text-muted-foreground'
      }`}
    >
      {children}
    </span>
  );
}
