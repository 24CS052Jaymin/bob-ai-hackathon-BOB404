import {
  Activity,
  Bell,
  ChevronRight,
  ClipboardCheck,
  FileBarChart2,
  History,
  Layers3,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  ShieldCheck,
  CircleHelp,
  Table2,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';

const nav = [
  { href: '/safety', label: 'Overview', icon: LayoutDashboard },
  { href: '/safety/signals', label: 'Signals', icon: Activity },
  { href: '/safety/clusters', label: 'Clusters', icon: Layers3 },
  { href: '/safety/review', label: 'Review queue', icon: ClipboardCheck },
  { href: '/safety/reports', label: 'Reports', icon: FileBarChart2 },
  { href: '/safety/data', label: 'FAERS explorer', icon: Table2 },
  { href: '/safety/history', label: 'Analysis history', icon: History },
];

function IconMark() {
  return (
    <div className="sidebar-logo flex h-11 w-11 items-center justify-center rounded-2xl">
      <ShieldCheck size={23} strokeWidth={2.5} />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => (href === '/safety' ? location === href : location.startsWith(href));

  return (
    <div className="app-shell flex">
      {mobileOpen && (
        <button
          data-testid="button-close-sidebar"
          className="mobile-scrim md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <aside
        className={`sidebar flex min-h-[100dvh] shrink-0 flex-col px-3 py-5 ${mobileOpen ? 'mobile-open' : ''} ${
          collapsed ? 'lg:w-[78px]' : ''
        }`}
      >
        <div className="mb-8 flex items-center gap-3 px-2">
          <IconMark />
          <div className="sidebar-copy">
            <div className="text-[17px] font-bold tracking-tight text-white">ReguLens</div>
            <div className="text-[10px] uppercase tracking-[.16em] text-cyan-100/60">Safety signals</div>
          </div>
        </div>

        <div className="sidebar-copy mb-3 px-3 text-[10px] font-bold uppercase tracking-[.14em] text-cyan-100/45">
          Workspace
        </div>
        <nav className="flex flex-1 flex-col gap-1.5">
          {nav.map(({ href, label, icon: NavIcon }) => (
            <Link
              key={href}
              href={href}
              data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}
              onClick={() => setMobileOpen(false)}
              className={`nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold ${
                isActive(href) ? 'active' : 'text-cyan-50/75'
              }`}
            >
              <NavIcon size={17} />
              <span className="nav-label">{label}</span>
            </Link>
          ))}
          <div className="sidebar-copy mb-2 mt-7 px-3 text-[10px] font-bold uppercase tracking-[.14em] text-cyan-100/45">
            Workflow
          </div>
          <Link
            href="/safety/upload"
            data-testid="link-nav-new-analysis"
            onClick={() => setMobileOpen(false)}
            className={`nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold ${
              location.startsWith('/safety/upload') || location.startsWith('/safety/configure') || location.startsWith('/safety/analysis')
                ? 'active'
                : 'text-cyan-50/75'
            }`}
          >
            <Plus size={17} />
            <span className="nav-label">New analysis</span>
          </Link>
          <Link
            href="/settings"
            data-testid="link-nav-settings"
            onClick={() => setMobileOpen(false)}
            className={`nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold ${
              location === '/settings' ? 'active' : 'text-cyan-50/75'
            }`}
          >
            <Settings size={17} />
            <span className="nav-label">Settings</span>
          </Link>
        </nav>

        <div className="user-card flex items-center gap-3 rounded-2xl bg-cyan-950/20 px-3 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-300 text-xs font-bold text-teal-900">
            MC
          </div>
          <div className="user-copy min-w-0">
            <div className="truncate text-xs font-bold text-white">Maya Chen</div>
            <div className="truncate text-[10px] text-cyan-100/55">Safety analyst</div>
          </div>
          <button
            data-testid="button-collapse-sidebar"
            className="ml-auto text-cyan-100/60 hover:text-white"
            onClick={() => setCollapsed((v) => !v)}
            aria-label="Collapse sidebar"
          >
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>
        </div>
      </aside>

      <div className="main-wrap flex min-h-[100dvh] flex-1 flex-col">
        <header className="topbar sticky top-0 z-20 flex items-center justify-between border-b border-cyan-100/70 px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              data-testid="button-open-sidebar"
              className="rounded-lg p-2 text-slate-500 hover:bg-cyan-50 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>
            <div className="flex items-center gap-2 md:hidden">
              <IconMark />
              <div>
                <div className="text-sm font-bold tracking-tight text-slate-800">ReguLens</div>
                <div className="text-[8px] uppercase tracking-[.16em] text-teal-600">Safety signals</div>
              </div>
            </div>
            <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
              <span>Workspace</span>
              <ChevronRight size={13} />
              <span className="font-semibold text-slate-600">
                {location === '/safety' ? 'Safety overview' : location.split('/').pop()?.replaceAll('-', ' ')}
              </span>
            </div>
            <nav className="top-nav hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
              {nav.slice(0, 5).map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  data-testid={`link-top-nav-${label.toLowerCase().replaceAll(' ', '-')}`}
                  className={`top-nav-link ${isActive(href) ? 'active' : ''}`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              data-testid="button-help"
              className="rounded-xl p-2.5 text-slate-400 hover:bg-cyan-50 hover:text-teal-700"
              onClick={() => window.alert('ReguLens help center: start with the Review queue for analyst triage.')}
              aria-label="Help"
            >
              <CircleHelp size={18} />
            </button>
            <button
              data-testid="button-notifications"
              className="relative rounded-xl p-2.5 text-slate-400 hover:bg-cyan-50 hover:text-teal-700"
              onClick={() => window.alert('You have 3 new signal review updates.')}
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-amber-400" />
            </button>
            <div className="ml-1 hidden h-8 w-px bg-slate-200 sm:block" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-[11px] font-bold text-teal-800">
                MC
              </div>
              <span className="hidden text-xs font-semibold text-slate-600 sm:block">Maya Chen</span>
            </div>
          </div>
        </header>

        <nav className="mobile-nav flex gap-1 overflow-x-auto px-4 py-2 md:hidden" aria-label="Mobile primary navigation">
          {nav.slice(0, 5).map(({ href, label, icon: NavIcon }) => (
            <Link
              key={href}
              href={href}
              data-testid={`link-mobile-nav-${label.toLowerCase().replaceAll(' ', '-')}`}
              onClick={() => setMobileOpen(false)}
              className={`mobile-nav-link ${isActive(href) ? 'active' : ''}`}
            >
              <NavIcon size={14} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <main className="page-content flex-1 p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
