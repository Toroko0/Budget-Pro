import React from 'react';
import { Eye, EyeOff, Palette, ShieldCheck } from 'lucide-react';
import { formatRelativeTime } from '../../lib/storage';

interface MobileHeaderProps {
  lastModified: string;
  stealth: boolean;
  toggleStealth: () => void;
  cycleTheme: () => void;
  currentTheme: string;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  lastModified,
  stealth,
  toggleStealth,
  cycleTheme,
  currentTheme
}) => {
  return (
    <header className="lg:hidden sticky top-0 z-30 pt-safe bg-[var(--card)]/95 backdrop-blur-md border-b border-[var(--line)] px-4 py-3 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-sm border border-teal-500/20">
            BP
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-[var(--ink)]">Budget Pro</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <p className="text-[10px] text-[var(--muted)] leading-tight">
              {formatRelativeTime(lastModified)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleStealth}
            className="p-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] hover:border-teal-500/40 transition"
            aria-label="Toggle Stealth Masking"
          >
            {stealth ? <EyeOff className="w-4 h-4 text-amber-500" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={cycleTheme}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)] capitalize font-medium transition"
            aria-label="Change Theme"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>{currentTheme}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
