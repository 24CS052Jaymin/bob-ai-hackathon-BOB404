import { Bell, Check, Settings2, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Card, PageHeader } from '@/components/common';

export function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState(true);

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Settings" description="Tune your ReguLens workspace and notification preferences." />
      <div className="grid gap-5 lg:grid-cols-[0.65fr_1.35fr]">
        <Card className="h-fit p-2">
          <button
            className="flex w-full items-center gap-3 rounded-xl bg-[#eaf7f5] px-3 py-3 text-left text-xs font-bold text-[#3b9793]"
            data-testid="button-settings-profile"
          >
            <UserRound className="h-4 w-4" /> Profile
          </button>
          <button
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold text-muted-foreground hover:bg-muted"
            data-testid="button-settings-notifications"
          >
            <Bell className="h-4 w-4" /> Notifications
          </button>
          <button
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold text-muted-foreground hover:bg-muted"
            data-testid="button-settings-preferences"
          >
            <Settings2 className="h-4 w-4" /> Preferences
          </button>
        </Card>

        <Card className="p-6">
          <div className="border-b border-border/70 pb-5">
            <h2 className="font-display text-base font-extrabold">Profile & workspace</h2>
            <p className="mt-1 text-xs text-muted-foreground">Your details as they appear to your review team.</p>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="text-xs font-bold">
              First name
              <input
                defaultValue="Morgan"
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:border-primary"
                aria-label="First name"
                data-testid="input-first-name"
              />
            </label>
            <label className="text-xs font-bold">
              Last name
              <input
                defaultValue="Cole"
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:border-primary"
                aria-label="Last name"
                data-testid="input-last-name"
              />
            </label>
            <label className="text-xs font-bold sm:col-span-2">
              Work email
              <input
                defaultValue="morgan.cole@northstar.example"
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:border-primary"
                aria-label="Work email"
                data-testid="input-work-email"
              />
            </label>
            <label className="text-xs font-bold sm:col-span-2">
              Workspace name
              <input
                defaultValue="Northstar Regulatory Affairs"
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:border-primary"
                aria-label="Workspace name"
                data-testid="input-workspace-name"
              />
            </label>
          </div>
          <div className="mt-7 border-t border-border/70 pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold">Readiness alerts</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Get notified when a critical gap is detected.</p>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`relative h-6 w-11 rounded-full ${notifications ? 'bg-primary' : 'bg-muted'}`}
                aria-label="Toggle readiness alerts"
                data-testid="button-toggle-alerts"
              >
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm ${notifications ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
          </div>
          <div className="mt-7 flex items-center gap-3">
            <button
              onClick={() => setSaved(true)}
              className="rounded-xl bg-brand-gradient px-4 py-2.5 text-xs font-bold text-white shadow-soft"
              data-testid="button-save-settings"
            >
              Save changes
            </button>
            {saved && (
              <span className="text-xs font-semibold text-[#438f70]">
                <Check className="mr-1 inline h-3.5 w-3.5" /> Saved just now
              </span>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
