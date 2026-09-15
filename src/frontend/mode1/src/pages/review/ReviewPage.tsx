import { Check, ClipboardCheck, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Badge, Button, PageHeader } from '@/components/common';
import { useApp } from '@/context/AppProvider';
import type { ReviewItem } from '@/types';

const tabs = ['Open', 'Completed', 'All'] as const;

// localStorage key for persisting reviewed signal IDs
const LS_KEY = 'review_completed_ids';

function loadCompletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveCompletedIds(ids: Set<string>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore storage errors
  }
}

export function ReviewPage() {
  const { signals, notify } = useApp();

  // Load persisted completed IDs from localStorage on first render
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => loadCompletedIds());

  const initialItems = useMemo<ReviewItem[]>(() =>
    signals
      .filter((s) => s.priority === 'High' || s.priority === 'Medium')
      .slice(0, 50)
      .map((s, i) => ({
        id: `REV-${String(i + 1).padStart(3, '0')}`,
        signalId: s.id,
        drug: s.drug,
        event: s.event,
        priority: s.priority,
        assigned: i % 2 === 0 ? 'Dr. A. Patel' : 'Dr. S. Kim',
        due: new Date(Date.now() + (7 + i) * 86_400_000).toISOString().slice(0, 10),
        note: '',
        reviewed: s.reviewed,
      })),
  [signals]);

  // Merge persisted completedIds into displayItems so status survives navigation
  const displayItems = useMemo<ReviewItem[]>(() =>
    initialItems.map((item) => ({
      ...item,
      reviewed: completedIds.has(item.id) ? true : item.reviewed,
    })),
  [initialItems, completedIds]);

  const [notes, setNotes] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem('review_notes');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  const [tab, setTab] = useState<(typeof tabs)[number]>('Open');
  const [noteId, setNoteId] = useState<string | null>(null);

  const visible = displayItems.map((i) => ({ ...i, note: notes[i.id] ?? i.note }))
    .filter((i) => (tab === 'Open' ? !i.reviewed : tab === 'Completed' ? i.reviewed : true));

  const action = (id: string, reviewed: boolean) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (reviewed) next.add(id);
      else next.delete(id);
      saveCompletedIds(next);   // ← persist to localStorage immediately
      return next;
    });
    notify(reviewed ? '✅ Review completed — saved' : 'Review reopened');
  };

  const saveNote = (id: string, note: string) => {
    setNotes((prev) => {
      const next = { ...prev, [id]: note };
      try { localStorage.setItem('review_notes', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-[1300px] animate-enter">
      <PageHeader
        eyebrow="Analyst workflow"
        title="Review queue"
        description="Make the next evidence decision visible, traceable, and easy to hand off."
        actions={
          <Button testId="button-refresh-review" variant="secondary" onClick={() => notify('Review queue synced')} icon={<RefreshCw size={14} />}>
            Sync queue
          </Button>
        }
      />

      <div className="mb-5 flex w-fit gap-1 rounded-xl bg-slate-100 p-1">
        {tabs.map((t) => (
          <button
            key={t}
            data-testid={`button-review-tab-${t.toLowerCase()}`}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-xs font-bold ${tab === t ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}`}
          >
            {t}
            <span className="ml-2 text-[10px] opacity-60">
              {t === 'Open'
                ? displayItems.filter((i) => !i.reviewed).length
                : t === 'Completed'
                  ? displayItems.filter((i) => i.reviewed).length
                  : displayItems.length}
            </span>
          </button>
        ))}
      </div>

      <div className="surface overflow-hidden">
        <div className="responsive-table overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3 font-bold">Signal</th>
                <th className="px-5 py-3 font-bold">Priority</th>
                <th className="px-5 py-3 font-bold">Assigned to</th>
                <th className="px-5 py-3 font-bold">Due</th>
                <th className="px-5 py-3 font-bold">Note</th>
                <th className="px-5 py-3 font-bold">Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td data-label="Signal" className="px-5 py-4">
                    <Link href={`/safety/signals/${item.signalId}`} data-testid={`link-review-signal-${item.id}`} className="font-bold text-xs text-slate-700 hover:text-teal-700">
                      {item.drug}
                    </Link>
                    <div className="mt-1 text-[11px] text-slate-400">{item.event}</div>
                  </td>
                  <td data-label="Priority" className="px-5 py-4">
                    <Badge tone={item.priority === 'High' ? 'red' : item.priority === 'Medium' ? 'amber' : 'teal'}>{item.priority}</Badge>
                  </td>
                  <td data-label="Assigned to" className="px-5 py-4 text-xs font-semibold text-slate-600">
                    {item.assigned}
                  </td>
                  <td data-label="Due" className="px-5 py-4 text-xs text-slate-500">
                    {item.due}
                  </td>
                  <td data-label="Note" className="px-5 py-4">
                    {noteId === item.id ? (
                      <input
                        autoFocus
                        data-testid={`input-review-note-${item.id}`}
                        defaultValue={item.note}
                        onBlur={(e) => {
                          saveNote(item.id, e.target.value);
                          setNoteId(null);
                        }}
                        className="w-full rounded-lg border border-teal-300 px-2 py-1.5 text-xs"
                      />
                    ) : (
                      <button data-testid={`button-edit-note-${item.id}`} onClick={() => setNoteId(item.id)} className="max-w-[190px] truncate text-left text-xs text-slate-400 hover:text-teal-700">
                        {item.note || 'Add note'}
                      </button>
                    )}
                  </td>
                  <td data-label="Action" className="px-5 py-4">
                    <Button
                      testId={`button-review-action-${item.id}`}
                      variant={item.reviewed ? 'secondary' : 'primary'}
                      onClick={() => action(item.id, !item.reviewed)}
                      icon={item.reviewed ? <RefreshCw size={13} /> : <Check size={13} />}
                    >
                      {item.reviewed ? 'Reopen' : 'Complete'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visible.length === 0 && (
          <div className="p-14 text-center">
            <ClipboardCheck size={28} className="mx-auto text-teal-300" />
            <div className="mt-3 text-sm font-bold text-slate-700">Queue is clear</div>
            <div className="mt-1 text-xs text-slate-400">Completed evidence reviews will appear in the history.</div>
          </div>
        )}
      </div>
    </div>
  );
}

