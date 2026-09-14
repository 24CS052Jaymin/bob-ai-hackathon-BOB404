import type { ReactNode } from 'react';

export function Button({
  children,
  onClick,
  variant = 'primary',
  icon,
  testId,
  type = 'button',
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'warning';
  icon?: ReactNode;
  testId: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  const style =
    variant === 'primary'
      ? 'bg-teal-600 text-white hover:bg-teal-700'
      : variant === 'warning'
        ? 'bg-amber-300 text-amber-950 hover:bg-amber-400'
        : variant === 'secondary'
          ? 'border border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:text-teal-700'
          : 'text-slate-500 hover:bg-cyan-50 hover:text-teal-700';
  return (
    <button
      data-testid={testId}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${style}`}
    >
      {icon}
      {children}
    </button>
  );
}
