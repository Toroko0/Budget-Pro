import React from 'react';
import {
  Calendar,
  CalendarRange,
  TrendingUp,
  Repeat,
  Users,
  Target,
  Settings,
  Eye,
  EyeOff,
  Palette,
  Download,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { ActiveView } from '../../types';
import { formatRelativeTime } from '../../lib/storage';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface DesktopSidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  lastModified: string;
  stealth: boolean;
  toggleStealth: () => void;
  cycleTheme: () => void;
  currentTheme: string;
  balances: { cash: number; benefit: number; savings: number };
  money: (val: number) => string;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeView,
  setActiveView,
  lastModified,
  stealth,
  toggleStealth,
  cycleTheme,
  currentTheme,
  balances,
  money
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const navItems: { id: ActiveView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'day', label: 'Daily Ledger', icon: Calendar },
    { id: 'month', label: 'Month & Budget', icon: CalendarRange },
    { id: 'recurring', label: 'Recurring & Bills', icon: Repeat },
    { id: 'year', label: 'Annual Flow', icon: TrendingUp },
    { id: 'debt', label: 'Debt Tracker', icon: Users },
    { id: 'goals', label: 'Savings Goals', icon: Target },
    { id: 'settings', label: 'Vault & Settings', icon: Settings }
  ];

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-[var(--line)] bg-[var(--card)] h-screen sticky top-0 p-5 select-none transition-colors">
      {/* Brand & Local Vault Status */}
      <div className="flex items-center gap-3 pb-5 border-b border-[var(--line)]">
        <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-xl border border-teal-500/20 shadow-sm">
          BP
        </div>
        <div>
          <h1 className="font-bold text-base leading-tight tracking-tight text-[var(--ink)]">
            Budget Pro
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-[var(--muted)] mt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{formatRelativeTime(lastModified)}</span>
          </div>
        </div>
      </div>

      {/* Mini Account Balances Strip */}
      <div className="my-4 p-3 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs space-y-1.5">
        <div className="flex justify-between items-center text-[var(--muted)]">
          <span>Cash</span>
          <span className="font-mono-numbers font-medium text-[var(--ink)]">{money(balances.cash)}</span>
        </div>
        <div className="flex justify-between items-center text-[var(--muted)]">
          <span>Benefit</span>
          <span className="font-mono-numbers font-medium text-[var(--ink)]">{money(balances.benefit)}</span>
        </div>
        <div className="flex justify-between items-center text-[var(--muted)]">
          <span>Savings</span>
          <span className="font-mono-numbers font-semibold text-amber-600 dark:text-amber-400">
            {money(balances.savings)}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 py-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300 font-semibold shadow-xs'
                  : 'text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--ink)]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-[var(--muted)]'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Controls & PWA Install Footer */}
      <div className="pt-4 border-t border-[var(--line)] space-y-2">
        {isInstallable && !isInstalled && (
          <button
            onClick={install}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App on Desktop</span>
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={toggleStealth}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)] hover:border-teal-500/40 transition"
            title="Toggle Stealth Balance Masking"
          >
            {stealth ? <EyeOff className="w-3.5 h-3.5 text-amber-500" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{stealth ? 'Masked' : 'Normal'}</span>
          </button>

          <button
            onClick={cycleTheme}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)] hover:border-teal-500/40 capitalize transition"
            title="Change Visual Theme"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>{currentTheme}</span>
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--muted)] pt-1">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span>Local Vault Encrypted</span>
        </div>
      </div>
    </aside>
  );
};
