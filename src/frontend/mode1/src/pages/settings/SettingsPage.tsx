import { Bell, Check, CheckCircle2, SlidersHorizontal, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Button, PageHeader, ToggleRow } from '@/components/common';
import { useApp } from '@/context/AppProvider';

export function SettingsPage() {
  const { notify } = useApp();
  const [saved, setSaved] = useState(false);
  const [emailReminders, setEmailReminders] = useState(true);
  const [dense, setDense] = useState(false);

  const save = () => {
    setSaved(true);
    notify('Settings saved');
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div className="mx-auto max-w-4xl animate-enter">
      <PageHeader eyebrow="Workspace preferences" title="Settings" description="Tune notifications and review defaults for your ReguLens workspace." />

      <div className="space-y-5">
        <div className="surface p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <UserRound size={18} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Profile</h2>
              <p className="text-xs text-slate-500">Your analyst identity and workspace role</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-600">
              Full name
              <input data-testid="input-settings-name" defaultValue="Maya Chen" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Work email
              <input data-testid="input-settings-email" defaultValue="maya.chen@regulens.example" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
            </label>
          </div>
        </div>

        <div className="surface p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Bell size={18} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Notifications</h2>
              <p className="text-xs text-slate-500">Stay aware of review deadlines and new analysis results</p>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <ToggleRow
              label="Review deadline reminders"
              detail="Get a digest when assigned reviews are due."
              checked={emailReminders}
              onChange={() => setEmailReminders((v) => !v)}
              testId="switch-deadline-reminders"
            />
            <ToggleRow
              label="Analysis completion"
              detail="Notify me when a screening run is ready."
              checked={true}
              onChange={() => notify('Analysis completion notifications remain enabled')}
              testId="switch-analysis-complete"
            />
          </div>
        </div>

        <div className="surface p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <SlidersHorizontal size={18} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Review preferences</h2>
              <p className="text-xs text-slate-500">Control how evidence is presented in your workspace</p>
            </div>
          </div>
          <div className="mt-6">
            <ToggleRow label="Compact table density" detail="Show more signal rows in the same viewport." checked={dense} onChange={() => setDense((v) => !v)} testId="switch-compact-density" />
          </div>
        </div>

        <div className="flex justify-end">
          <Button testId="button-save-settings" onClick={save} icon={saved ? <Check size={14} /> : <CheckCircle2 size={14} />}>
            {saved ? 'Saved' : 'Save settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
