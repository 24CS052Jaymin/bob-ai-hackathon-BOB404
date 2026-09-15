import {
  Bell,
  ChevronDown,
  ClipboardCheck,
  FileText,
  FolderKanban,
  History,
  LayoutDashboard,
  LibraryBig,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/submissions', label: 'Submissions', icon: FolderKanban },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/requirements', label: 'Requirements', icon: ClipboardCheck },
  { href: '/official-ctd', label: 'Official CTD library', icon: LibraryBig },
];

const workspaceItems = [
  { href: '/history', label: 'Version history', icon: History },
  { href: '/settings', label: 'Workspace settings', icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentLabel =
    [...navItems, ...workspaceItems].find((item) => location.startsWith(item.href))
      ?.label ?? 'Overview';

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[246px] bg-brand-gradient p-4 text-white shadow-lift transition-transform duration-300 md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-3 py-3">
            <Link href="/dashboard" className="flex items-center gap-2.5" data-testid="link-brand">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="font-display text-[19px] font-extrabold tracking-[-0.04em]">
                Regu<span className="text-white/75">Lens</span>
              </span>
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-1.5 hover:bg-white/15 md:hidden"
              aria-label="Close navigation"
              data-testid="button-close-navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
            Workspace
          </div>
          <nav className="mt-3 space-y-1" aria-label="Workspace navigation">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active =
                location === href || (href === '/submissions' && location.startsWith('/submissions'));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold ${
                    active ? 'bg-white text-[#3da9ad] shadow-sm' : 'text-white/80 hover:bg-white/15 hover:text-white'
                  }`}
                  data-testid={`link-nav-${label.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <Icon className="h-[17px] w-[17px]" strokeWidth={active ? 2.5 : 2} />
                  <span>{label}</span>
                  {label === 'Submissions' && (
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-[10px] ${
                        active ? 'bg-[#e6f6f4] text-[#3da9ad]' : 'bg-white/15 text-white'
                      }`}
                    >
                      5
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
            Manage
          </div>
          <nav className="mt-3 space-y-1" aria-label="Manage navigation">
            {workspaceItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold ${
                  location === href ? 'bg-white text-[#3da9ad] shadow-sm' : 'text-white/80 hover:bg-white/15 hover:text-white'
                }`}
                data-testid={`link-nav-${label.toLowerCase().replace(/\s/g, '-')}`}
              >
                <Icon className="h-[17px] w-[17px]" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-white/15 bg-white/10 p-3.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#fff0ac]" />
              <span className="text-xs font-bold">ReguLens Assist</span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-white/70">
              Your dossier copilot is ready to surface the next risk.
            </p>
            <Link
              href="/submissions/sub-2408/analysis"
              className="mt-3 flex items-center text-[11px] font-bold text-white hover:underline"
              data-testid="link-open-assist"
            >
              Open analysis <span className="ml-auto">&rarr;</span>
            </Link>
          </div>

          <div className="mt-3 flex items-center gap-3 rounded-xl px-2 py-2 text-white/80">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#2f9fa7] text-xs font-bold text-white">
              MC
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-bold">Morgan Cole</div>
              <div className="truncate text-[10px] text-white/60">Regulatory affairs</div>
            </div>
            <ChevronDown className="ml-auto h-4 w-4" />
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <button
          className="fixed inset-0 z-30 bg-[#18343a]/30 backdrop-blur-[2px] md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu overlay"
          data-testid="button-close-menu-overlay"
        />
      )}

      <div className="md:pl-[246px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-border/80 bg-background/90 px-5 backdrop-blur-md md:px-9">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-xl border border-border bg-card p-2 md:hidden"
              aria-label="Open navigation"
              data-testid="button-open-navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-sm font-semibold text-muted-foreground md:hidden">{currentLabel}</div>
            <div className="relative hidden w-[300px] lg:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-xs outline-none placeholder:text-muted-foreground/70 focus:border-primary"
                placeholder="Search submissions, documents..."
                aria-label="Search workspace"
                data-testid="input-global-search"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="relative rounded-xl p-2.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="View notifications"
              data-testid="button-notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#e7806e]" />
            </button>
            <div className="hidden h-6 w-px bg-border sm:block" />
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold">Good morning, Morgan</p>
              <p className="text-[10px] text-muted-foreground">Monday, September 9, 2024</p>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#d9f2ee] text-xs font-bold text-[#3b9c9d]">
              MC
            </div>
          </div>
        </header>
        <main className="animate-enter mx-auto max-w-[1440px] px-5 py-7 md:px-9 md:py-9">{children}</main>
      </div>
    </div>
  );
}
