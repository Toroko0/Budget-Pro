import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Percent,
  Edit3
} from 'lucide-react';
import { Transaction, Category, AccountType } from '../../types';
import {
  shiftMonth,
  prettyMonth,
  today,
  pad,
  addMoney,
  subMoney,
  round3,
  calculateBalancesAt,
  ymd
} from '../../lib/storage';

interface MonthViewProps {
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
  selectedDate: string;
  onSelectDate: (d: string) => void;
  transactions: Transaction[];
  categories: Category[];
  opening: Record<AccountType, number>;
  budgets: Record<string, number>;
  onSetBudget: (month: string, amount: number | null) => void;
  money: (val: number | string) => string;
  num: (val: number | string) => string;
}

export const MonthView: React.FC<MonthViewProps> = ({
  selectedMonth,
  setSelectedMonth,
  selectedDate,
  onSelectDate,
  transactions,
  categories,
  opening,
  budgets,
  onSetBudget,
  money,
  num
}) => {
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  const [year, month] = useMemo(() => selectedMonth.split('-').map(Number), [selectedMonth]);

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month - 1, 1).getDay();
    const totalDays = new Date(year, month, 0).getDate();
    const days: { day: number; dateStr: string; hasTx: boolean; isToday: boolean; isSelected: boolean }[] = [];

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${pad(month)}-${pad(day)}`;
      const hasTx = transactions.some(t => t.date === dateStr);
      days.push({
        day,
        dateStr,
        hasTx,
        isToday: dateStr === today(),
        isSelected: dateStr === selectedDate
      });
    }

    return { firstDayIndex, days, totalDays };
  }, [year, month, transactions, selectedDate]);

  // Aggregated monthly metrics
  const monthMetrics = useMemo(() => {
    const txs = transactions.filter(t => t.date.startsWith(selectedMonth));
    let incCash = 0,
      incBen = 0,
      expCash = 0,
      expBen = 0,
      moves = 0;
    const catExp: Record<string, number> = {};

    for (const t of txs) {
      if (t.kind === 'income') {
        if (t.account === 'cash') incCash = addMoney(incCash, t.amount);
        else if (t.account === 'benefit') incBen = addMoney(incBen, t.amount);
      } else if (t.kind === 'expense') {
        if (t.account === 'cash') expCash = addMoney(expCash, t.amount);
        else if (t.account === 'benefit') expBen = addMoney(expBen, t.amount);
        catExp[t.category || 'Other'] = addMoney(catExp[t.category || 'Other'] || 0, t.amount);
      } else if (t.kind === 'move') {
        moves = addMoney(moves, t.amount);
      }
    }

    const totalInc = addMoney(incCash, incBen);
    const totalExp = addMoney(expCash, expBen);
    const net = subMoney(totalInc, totalExp);

    return { incCash, incBen, expCash, expBen, totalInc, totalExp, net, moves, catExp };
  }, [transactions, selectedMonth]);

  // Budget Pacing Computation
  const budget = budgets[selectedMonth] || 0;
  const pacing = useMemo(() => {
    if (budget <= 0) return null;

    const remainingBudget = subMoney(budget, monthMetrics.totalExp);
    const nowD = new Date();
    const isCurrentMonth = nowD.getFullYear() === year && nowD.getMonth() + 1 === month;
    const daysInMonth = calendarDays.totalDays;
    const daysPassed = isCurrentMonth ? nowD.getDate() : selectedMonth < today().slice(0, 7) ? daysInMonth : 0;
    const daysRemaining = Math.max(1, daysInMonth - daysPassed);
    const dailyPace = remainingBudget > 0 ? round3(remainingBudget / daysRemaining) : 0;
    const pct = Math.min(100, Math.max(0, (monthMetrics.totalExp / budget) * 100));

    let statusColor = 'bg-emerald-500';
    if (monthMetrics.totalExp > budget) statusColor = 'bg-red-500';
    else if (pct > 80) statusColor = 'bg-amber-500';

    return {
      remainingBudget,
      daysRemaining,
      dailyPace,
      pct,
      statusColor
    };
  }, [budget, monthMetrics.totalExp, year, month, calendarDays.totalDays, selectedMonth]);

  // End of month balances
  const endOfMonthBalances = useMemo(() => {
    const endDay = ymd(new Date(year, month, 0));
    return calculateBalancesAt(transactions, opening, endDay);
  }, [transactions, opening, year, month]);

  const handleSaveBudget = () => {
    const parsed = parseFloat(budgetInput);
    if (!isNaN(parsed) && parsed > 0) {
      onSetBudget(selectedMonth, parsed);
    } else {
      onSetBudget(selectedMonth, null);
    }
    setIsEditingBudget(false);
  };

  return (
    <div className="space-y-4">
      {/* Month Navigator */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs">
        <button
          onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
          className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h2 className="font-bold text-base text-[var(--ink)]">{prettyMonth(selectedMonth)}</h2>

        <button
          onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
          className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Interactive Mini-Calendar */}
      <div className="p-3.5 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs">
        <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <span key={d} className="text-[11px] font-semibold text-[var(--muted)] py-1">
              {d}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {Array.from({ length: calendarDays.firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {calendarDays.days.map(d => (
            <button
              key={d.dateStr}
              onClick={() => onSelectDate(d.dateStr)}
              className={`aspect-square relative flex flex-col items-center justify-center rounded-xl text-xs font-medium transition ${
                d.isSelected
                  ? 'bg-teal-600 text-white font-bold shadow-xs'
                  : d.isToday
                  ? 'border border-teal-500 text-teal-600 dark:text-teal-400 font-bold bg-teal-500/10'
                  : d.hasTx
                  ? 'bg-[var(--bg)] text-[var(--ink)] hover:border-teal-500/40 border border-[var(--line)]'
                  : 'text-[var(--muted)] hover:bg-[var(--bg)]'
              }`}
            >
              <span>{d.day}</span>
              {d.hasTx && (
                <span
                  className={`w-1 h-1 rounded-full absolute bottom-1 ${
                    d.isSelected ? 'bg-white' : 'bg-emerald-500'
                  }`}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Monthly Budget & Daily Pace Calculator */}
      <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-[var(--ink)]">Monthly Budget Limit</h3>
            <button
              onClick={() => {
                setBudgetInput(budget > 0 ? String(budget) : '');
                setIsEditingBudget(!isEditingBudget);
              }}
              className="text-xs text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{budget > 0 ? 'Edit' : 'Set Budget'}</span>
            </button>
          </div>
          <span className="font-mono-numbers font-bold text-sm text-[var(--ink)]">
            {budget > 0 ? money(budget) : 'None'}
          </span>
        </div>

        {isEditingBudget && (
          <div className="my-3 p-3 rounded-xl bg-[var(--bg)] border border-[var(--line)] flex gap-2">
            <input
              type="number"
              placeholder="e.g. 500"
              value={budgetInput}
              onChange={e => setBudgetInput(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-[var(--card)] border border-[var(--line)] text-[var(--ink)]"
            />
            <button
              onClick={handleSaveBudget}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditingBudget(false)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
            >
              Cancel
            </button>
          </div>
        )}

        {pacing ? (
          <div className="space-y-2 mt-2">
            <div className="flex justify-between text-xs text-[var(--muted)]">
              <span>Spent: {money(monthMetrics.totalExp)}</span>
              <span className={pacing.remainingBudget < 0 ? 'text-red-500 font-bold' : ''}>
                Remaining: {money(pacing.remainingBudget)}
              </span>
            </div>

            {/* Visual Budget Progress Bar */}
            <div className="w-full h-2 rounded-full bg-[var(--bg)] overflow-hidden border border-[var(--line)]">
              <div
                className={`h-full ${pacing.statusColor} transition-all duration-300`}
                style={{ width: `${pacing.pct}%` }}
              />
            </div>

            {/* Daily Pacing Recommendation */}
            <div className="pt-2 border-t border-[var(--line)] flex items-center justify-between text-xs">
              <span className="text-[var(--muted)]">Recommended Daily Pace:</span>
              <span className="font-mono-numbers font-bold text-teal-600 dark:text-teal-400">
                {money(pacing.dailyPace)} / day ({pacing.daysRemaining}d left)
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[var(--muted)] mt-1">
            Setting a monthly budget calculates your automated daily spending pace.
          </p>
        )}
      </div>

      {/* Net Cash Flow Summary */}
      <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-[var(--muted)] block">Total Inflow</span>
              <span className="text-xs text-[var(--muted)]">Cash: {money(monthMetrics.incCash)} · Benefit: {money(monthMetrics.incBen)}</span>
            </div>
          </div>
          <span className="font-mono-numbers font-bold text-sm text-emerald-600 dark:text-emerald-400">
            +{num(monthMetrics.totalInc)}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[var(--line)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-[var(--muted)] block">Total Outflow</span>
              <span className="text-xs text-[var(--muted)]">Cash: {money(monthMetrics.expCash)} · Benefit: {money(monthMetrics.expBen)}</span>
            </div>
          </div>
          <span className="font-mono-numbers font-bold text-sm text-red-500 dark:text-red-400">
            −{num(monthMetrics.totalExp)}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-dashed border-[var(--line)] font-semibold text-sm">
          <span className="text-[var(--ink)]">Monthly Net Cash Flow</span>
          <span
            className={`font-mono-numbers font-bold ${
              monthMetrics.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
            }`}
          >
            {money(monthMetrics.net)}
          </span>
        </div>
      </div>

      {/* Top Spending Distribution Breakdown */}
      {monthMetrics.totalExp > 0 && Object.keys(monthMetrics.catExp).length > 0 && (
        <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs">
          <h3 className="font-bold text-sm text-[var(--ink)] mb-3">Spending by Category</h3>
          <div className="space-y-3">
            {Object.entries(monthMetrics.catExp)
              .sort((a, b) => b[1] - a[1])
              .map(([catName, amt]) => {
                const pct = Math.min(100, Math.round((amt / monthMetrics.totalExp) * 100));
                return (
                  <div key={catName} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--ink)] font-medium">{catName}</span>
                      <span className="font-mono-numbers text-[var(--muted)]">
                        {money(amt)} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[var(--bg)] overflow-hidden border border-[var(--line)]">
                      <div className="h-full bg-teal-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Projected End of Month Balances */}
      <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs">
        <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--muted)] mb-2">
          Balances at Month End
        </h3>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)]">
            <span className="text-[var(--muted)] block">Cash</span>
            <span className="font-mono-numbers font-semibold text-[var(--ink)] block mt-0.5">
              {money(endOfMonthBalances.cash)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)]">
            <span className="text-[var(--muted)] block">Benefit</span>
            <span className="font-mono-numbers font-semibold text-[var(--ink)] block mt-0.5">
              {money(endOfMonthBalances.benefit)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)]">
            <span className="text-[var(--muted)] block">Savings</span>
            <span className="font-mono-numbers font-semibold text-amber-600 dark:text-amber-400 block mt-0.5">
              {money(endOfMonthBalances.savings)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
