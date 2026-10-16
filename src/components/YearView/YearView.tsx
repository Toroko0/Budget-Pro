import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { Transaction, AccountType } from '../../types';
import { pad, addMoney, subMoney, calculateBalancesAt, ymd } from '../../lib/storage';

interface YearViewProps {
  selectedYear: number;
  setSelectedYear: (y: number) => void;
  transactions: Transaction[];
  opening: Record<AccountType, number>;
  onJumpToMonth: (monthStr: string) => void;
  money: (val: number | string) => string;
  num: (val: number | string) => string;
}

export const YearView: React.FC<YearViewProps> = ({
  selectedYear,
  setSelectedYear,
  transactions,
  opening,
  onJumpToMonth,
  money,
  num
}) => {
  const yearData = useMemo(() => {
    let annualCashInc = 0,
      annualBenInc = 0,
      annualCashExp = 0,
      annualBenExp = 0;

    const months = Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      const monthKey = `${selectedYear}-${pad(monthNum)}`;
      const monthName = new Date(selectedYear, i, 1).toLocaleDateString(undefined, {
        month: 'short'
      });

      let mCashInc = 0,
        mBenInc = 0,
        mCashExp = 0,
        mBenExp = 0;

      for (const t of transactions) {
        if (!t.date.startsWith(monthKey)) continue;
        if (t.kind === 'income') {
          if (t.account === 'cash') mCashInc = addMoney(mCashInc, t.amount);
          else if (t.account === 'benefit') mBenInc = addMoney(mBenInc, t.amount);
        } else if (t.kind === 'expense') {
          if (t.account === 'cash') mCashExp = addMoney(mCashExp, t.amount);
          else if (t.account === 'benefit') mBenExp = addMoney(mBenExp, t.amount);
        }
      }

      annualCashInc = addMoney(annualCashInc, mCashInc);
      annualBenInc = addMoney(annualBenInc, mBenInc);
      annualCashExp = addMoney(annualCashExp, mCashExp);
      annualBenExp = addMoney(annualBenExp, mBenExp);

      const totalInc = addMoney(mCashInc, mBenInc);
      const totalExp = addMoney(mCashExp, mBenExp);
      const net = subMoney(totalInc, totalExp);
      const hasActivity = totalInc > 0 || totalExp > 0;

      return {
        key: monthKey,
        name: monthName,
        totalInc,
        totalExp,
        net,
        hasActivity
      };
    });

    const totalInc = addMoney(annualCashInc, annualBenInc);
    const totalExp = addMoney(annualCashExp, annualBenExp);
    const netFlow = subMoney(totalInc, totalExp);

    return {
      months,
      annualCashInc,
      annualBenInc,
      annualCashExp,
      annualBenExp,
      totalInc,
      totalExp,
      netFlow
    };
  }, [transactions, selectedYear]);

  // Year end balances
  const yearEndBalances = useMemo(() => {
    const endDay = ymd(new Date(selectedYear, 11, 31));
    return calculateBalancesAt(transactions, opening, endDay);
  }, [transactions, opening, selectedYear]);

  return (
    <div className="space-y-4">
      {/* Year Stepper Header */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs">
        <button
          onClick={() => setSelectedYear(selectedYear - 1)}
          className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition"
          aria-label="Previous year"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h2 className="font-bold text-lg text-[var(--ink)]">{selectedYear}</h2>

        <button
          onClick={() => setSelectedYear(selectedYear + 1)}
          className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition"
          aria-label="Next year"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Annual Summary Card */}
      <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-[var(--ink)]">Annual Account Inflow & Outflow</h3>

        <div className="flex justify-between items-center text-xs">
          <div>
            <span className="text-[var(--muted)] block">Total Annual Income</span>
            <span className="text-[var(--muted)] text-[11px]">
              Cash: {money(yearData.annualCashInc)} · Benefit: {money(yearData.annualBenInc)}
            </span>
          </div>
          <span className="font-mono-numbers font-bold text-sm text-emerald-600 dark:text-emerald-400">
            +{money(yearData.totalInc)}
          </span>
        </div>

        <div className="flex justify-between items-center text-xs pt-2 border-t border-[var(--line)]">
          <div>
            <span className="text-[var(--muted)] block">Total Annual Expenses</span>
            <span className="text-[var(--muted)] text-[11px]">
              Cash: {money(yearData.annualCashExp)} · Benefit: {money(yearData.annualBenExp)}
            </span>
          </div>
          <span className="font-mono-numbers font-bold text-sm text-red-500 dark:text-red-400">
            −{money(yearData.totalExp)}
          </span>
        </div>

        <div className="flex justify-between items-center text-sm font-semibold pt-2 border-t border-dashed border-[var(--line)]">
          <span className="text-[var(--ink)]">Annual Net Flow</span>
          <span
            className={`font-mono-numbers font-bold ${
              yearData.netFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
            }`}
          >
            {money(yearData.netFlow)}
          </span>
        </div>
      </div>

      {/* 12-Month Matrix */}
      <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs">
        <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--muted)] mb-3">
          Monthly Ledger Summary (Tap month to inspect)
        </h3>

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center text-[var(--muted)] px-2 py-1 font-semibold border-b border-[var(--line)]">
            <span className="flex-1">Month</span>
            <span className="w-24 text-right">Income</span>
            <span className="w-24 text-right">Spent</span>
            <span className="w-20 text-right">Net</span>
          </div>

          {yearData.months.map(m => (
            <div
              key={m.key}
              onClick={() => onJumpToMonth(m.key)}
              className="flex items-center px-2 py-2 rounded-xl hover:bg-[var(--bg)] cursor-pointer transition group"
            >
              <div className="flex-1 font-medium text-[var(--ink)] flex items-center gap-1 group-hover:text-teal-600">
                <span>{m.name}</span>
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="w-24 text-right font-mono-numbers text-emerald-600 dark:text-emerald-400">
                {m.hasActivity ? `+${num(m.totalInc)}` : '–'}
              </span>
              <span className="w-24 text-right font-mono-numbers text-red-500 dark:text-red-400">
                {m.hasActivity ? `−${num(m.totalExp)}` : '–'}
              </span>
              <span
                className={`w-20 text-right font-mono-numbers font-bold ${
                  m.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                }`}
              >
                {m.hasActivity ? num(m.net) : '–'}
              </span>
            </div>
          ))}

          {/* Matrix Total Row */}
          <div className="flex items-center px-2 pt-3 border-t border-[var(--line)] font-bold text-xs">
            <span className="flex-1 text-[var(--ink)]">Total</span>
            <span className="w-24 text-right font-mono-numbers text-emerald-600">
              +{num(yearData.totalInc)}
            </span>
            <span className="w-24 text-right font-mono-numbers text-red-500">
              −{num(yearData.totalExp)}
            </span>
            <span
              className={`w-20 text-right font-mono-numbers ${
                yearData.netFlow >= 0 ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              {num(yearData.netFlow)}
            </span>
          </div>
        </div>
      </div>

      {/* Year-End Balances */}
      <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs">
        <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--muted)] mb-2">
          Balances at Year End ({selectedYear})
        </h3>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)]">
            <span className="text-[var(--muted)] block">Cash</span>
            <span className="font-mono-numbers font-semibold text-[var(--ink)] block mt-0.5">
              {money(yearEndBalances.cash)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)]">
            <span className="text-[var(--muted)] block">Benefit</span>
            <span className="font-mono-numbers font-semibold text-[var(--ink)] block mt-0.5">
              {money(yearEndBalances.benefit)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)]">
            <span className="text-[var(--muted)] block">Savings</span>
            <span className="font-mono-numbers font-semibold text-amber-600 dark:text-amber-400 block mt-0.5">
              {money(yearEndBalances.savings)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
