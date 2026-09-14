import { CheckCircle2, X } from 'lucide-react';

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-3 rounded-2xl bg-slate-800 px-4 py-3 text-sm font-medium text-white shadow-xl animate-enter">
      <CheckCircle2 size={17} className="text-teal-300" />
      <span>{message}</span>
      <button data-testid="button-dismiss-toast" onClick={onClose} aria-label="Dismiss notification">
        <X size={15} />
      </button>
    </div>
  );
}
