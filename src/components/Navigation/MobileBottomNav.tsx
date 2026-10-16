import React from 'react';
import {
  Calendar,
  CalendarRange,
  Repeat,
  TrendingUp,
  Users,
  Target,
  Settings
} from 'lucide-react';
import { ActiveView } from '../../types';

interface MobileBottomNavProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  setActiveView
}) => {
  const tabs: { id: ActiveView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'day', label: 'Day', icon: Calendar },
    { id: 'month', label: 'Month', icon: CalendarRange },
    { id: 'recurring', label: 'Bills', icon: Repeat },
    { id: 'year', label: 'Year', icon: TrendingUp },
    { id: 'debt', label: 'Debt', icon: Users },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'settings', label: 'Vault', icon: Settings }
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--card)]/95 backdrop-blur-md border-t border-[var(--line)] pb-safe select-none">
      <div className="grid grid-cols-7 h-15 items-center px-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`flex flex-col items-center justify-center py-1 transition-colors ${
                isActive
                  ? 'text-teal-600 dark:text-teal-400 font-semibold'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
