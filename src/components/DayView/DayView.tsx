import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  RotateCcw,
  Receipt,
  Trash2,
  Edit2,
  ArrowRightLeft,
  Tag
} from 'lucide-react';
import { Transaction, Preset, AccountType } from '../../types';
import { shiftDay, today, prettyDate, addMoney } from '../../lib/storage';

interface DayViewProps {
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  balances: Record<AccountType, number>;
  transactions: Transaction[];
  presets: Preset[];
  onApplyPreset: (presetId: string) => void;
  onOpenAddModal: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onViewReceipt: (receiptSrc: string, tx: Transaction) => void;
  money: (val: number | string) => string;
  num: (val: number | string) => string;
}

export const DayView: React.FC<DayViewProps> = ({
  selectedDate,
  setSelectedDate,
  balances,
  transactions,
  presets,
  onApplyPreset,
  onOpenAddModal,
  onEditTransaction,
  onDeleteTransaction,
  onViewReceipt,
  money,
  num
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [minAmt, setMinAmt] = useState('');
  const [maxAmt, setMaxAmt] = useState('');

  // Transactions on the selected day
  const dayTransactions = useMemo(() => {
    let list = transactions.filter(t => t.date === selectedDate);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        t =>
          (t.note && t.note.toLowerCase().includes(q)) ||
          (t.category && t.category.toLowerCase().includes(q)) ||
          String(t.amount).includes(q) ||
          (t.tags && t.tags.toLowerCase().includes(q))
      );
    }

    if (minAmt !== '') list = list.filter(t => t.amount >= Number(minAmt));
    if (maxAmt !== '') list = list.filter(t => t.amount <= Number(maxAmt));

    return list;
  }, [transactions, selectedDate, searchQuery, minAmt, maxAmt]);

  // Compute daily spending and income
  const { dailySpent, dailyIncome } = useMemo(() => {
    let spent = 0;
    let income = 0;
    for (const t of dayTransactions) {
      if (t.kind === 'expense') spent = addMoney(spent, t.amount);
      else if (t.kind === 'income') income = addMoney(income, t.amount);
    }
    return { dailySpent: spent, dailyIncome: income };
  }, [dayTransactions]);

  const isToday = selectedDate === today();

  return (
    <div className="space-y-4">
      {/* Date Navigation Bar */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs">
        <button
          onClick={() => setSelectedDate(shiftDay(selectedDate, -1))}
          className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition"
          aria-label="Previous day"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={() => setSelectedDate(today())}
          className="text-center group transition"
          title="Jump to Today"
        >
          <h2 className="font-bold text-base text-[var(--ink)] group-hover:text-teal-600 dark:group-hover:text-teal-400">
            {prettyDate(selectedDate)}
          </h2>
          {!isToday && (
            <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
              Tap for Today
            </span>
          )}
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setSelectedDate(shiftDay(selectedDate, 1))}
            className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition"
            aria-label="Next day"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Account Balances Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-85 block">Cash</span>
          <b className="text-sm md:text-base font-mono-numbers block mt-1 truncate">{money(balances.cash)}</b>
        </div>
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-700 text-white shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-85 block">Benefit</span>
          <b className="text-sm md:text-base font-mono-numbers block mt-1 truncate">{money(balances.benefit)}</b>
        </div>
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-85 block">Savings</span>
          <b className="text-sm md:text-base font-mono-numbers block mt-1 truncate">{money(balances.savings)}</b>
        </div>
      </div>

      {/* Day Flow Totals & Add Action */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs">
        <div className="flex gap-4 text-xs">
          <div>
            <span className="text-[var(--muted)] block">Daily Spent:</span>
            <span className="font-mono-numbers font-bold text-red-500 dark:text-red-400">
              {money(dailySpent)}
            </span>
          </div>
          <div className="border-l border-[var(--line)] pl-4">
            <span className="text-[var(--muted)] block">Daily Income:</span>
            <span className="font-mono-numbers font-bold text-emerald-600 dark:text-emerald-400">
              {money(dailyIncome)}
            </span>
          </div>
        </div>

        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Entry</span>
        </button>
      </div>

      {/* Quick Add Presets Bar */}
      {presets.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs text-[var(--muted)] font-medium shrink-0">Quick:</span>
          {presets.map(p => (
            <button
              key={p.id}
              onClick={() => onApplyPreset(p.id)}
              className="shrink-0 px-3 py-1.5 rounded-full bg-[var(--card)] hover:bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)] font-medium shadow-xs transition flex items-center gap-1"
            >
              <span>{p.name}</span>
              <span className="font-mono-numbers text-[var(--muted)] text-[11px]">({num(p.amount)})</span>
            </button>
          ))}
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search note, category, #tag..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 text-xs md:text-sm rounded-xl bg-[var(--card)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-teal-500 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min amount"
            value={minAmt}
            onChange={e => setMinAmt(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-[var(--card)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-teal-500"
          />
          <input
            type="number"
            placeholder="Max amount"
            value={maxAmt}
            onChange={e => setMaxAmt(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-[var(--card)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-teal-500"
          />
          {(searchQuery || minAmt || maxAmt) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setMinAmt('');
                setMaxAmt('');
              }}
              className="p-2 rounded-xl bg-[var(--card)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
              title="Reset Search"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-2 pt-1">
        {dayTransactions.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-[var(--card)] border border-[var(--line)]">
            <p className="text-sm text-[var(--muted)]">No transactions recorded for this day.</p>
            <button
              onClick={onOpenAddModal}
              className="mt-3 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition"
            >
              Log First Entry
            </button>
          </div>
        ) : (
          dayTransactions.map(t => {
            const isMove = t.kind === 'move';
            const isExpense = t.kind === 'expense';
            const sign = isExpense ? '−' : isMove ? '⇄' : '+';
            const amountColor = isExpense
              ? 'text-red-500 dark:text-red-400'
              : isMove
              ? 'text-[var(--muted)]'
              : 'text-emerald-600 dark:text-emerald-400';

            return (
              <div
                key={t.id}
                className="group flex items-center gap-3 p-3 rounded-2xl bg-[var(--card)] border border-[var(--line)] hover:border-teal-500/30 shadow-xs transition"
              >
                {/* Icon box */}
                <div className="w-10 h-10 rounded-xl bg-[var(--bg)] border border-[var(--line)] flex items-center justify-center text-lg shrink-0">
                  {isMove ? <ArrowRightLeft className="w-5 h-5 text-teal-600" /> : t.icon || '•'}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0" onClick={() => onEditTransaction(t)}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[var(--ink)] truncate">
                      {isMove ? `${t.from} → ${t.to}` : t.category}
                    </span>
                    {!isMove && t.account && (
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-[var(--bg)] text-[var(--muted)]">
                        {t.account}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--muted)] truncate mt-0.5">
                    {t.note || <span className="italic">No note</span>}
                  </div>
                  {t.tags && (
                    <div className="flex items-center gap-1 text-[11px] text-teal-600 dark:text-teal-400 mt-1">
                      <Tag className="w-3 h-3" />
                      <span>#{t.tags}</span>
                    </div>
                  )}
                </div>

                {/* Receipt Thumbnail if attached */}
                {t.receipt && (
                  <button
                    onClick={() => onViewReceipt(t.receipt!, t)}
                    className="relative w-9 h-9 rounded-lg overflow-hidden border border-[var(--line)] shrink-0 hover:opacity-85 transition"
                    title="View Receipt Image"
                  >
                    <img src={t.receipt} alt="Receipt" className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 right-0 bg-black/60 text-[9px] text-white px-1 rounded-tl">
                      📷
                    </span>
                  </button>
                )}

                {/* Amount */}
                <div className="text-right shrink-0">
                  <span className={`font-mono-numbers font-bold text-sm ${amountColor}`}>
                    {sign}
                    {num(t.amount)}
                  </span>
                </div>

                {/* Quick Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onEditTransaction(t)}
                    className="p-1.5 text-[var(--muted)] hover:text-teal-600 transition"
                    title="Edit transaction"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteTransaction(t.id)}
                    className="p-1.5 text-[var(--muted)] hover:text-red-500 transition"
                    title="Delete transaction"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
