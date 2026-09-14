export function ToggleRow({
  label,
  detail,
  checked,
  onChange,
  testId,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: () => void;
  testId: string;
}) {
  return (
    <div className="flex items-center justify-between gap-5">
      <div>
        <div className="text-xs font-bold text-slate-700">{label}</div>
        <div className="mt-1 text-xs text-slate-400">{detail}</div>
      </div>
      <button
        data-testid={testId}
        aria-pressed={checked}
        onClick={onChange}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-teal-600' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );
}
