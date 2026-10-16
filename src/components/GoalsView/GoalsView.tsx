import React, { useState, useMemo } from 'react';
import { Target, Plus, Trash2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { SavingsGoal, AccountType } from '../../types';
import { toMilli, fromMilli, addMoney, subMoney } from '../../lib/storage';

interface GoalsViewProps {
  goals: SavingsGoal[];
  savingsBalance: number;
  onAddGoal: (name: string, target: number) => void;
  onUpdateAllocation: (id: string, deltaAmount: number) => void;
  onDeleteGoal: (id: string) => void;
  money: (val: number | string) => string;
  num: (val: number | string) => string;
}

export const GoalsView: React.FC<GoalsViewProps> = ({
  goals,
  savingsBalance,
  onAddGoal,
  onUpdateAllocation,
  onDeleteGoal,
  money,
  num
}) => {
  // New goal form
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');

  // Allocation modal
  const [allocatingGoal, setAllocatingGoal] = useState<{ goal: SavingsGoal; isDeposit: boolean } | null>(null);
  const [allocAmount, setAllocAmount] = useState('');

  const allocatedTotal = useMemo(() => {
    return goals.reduce((sum, g) => sum + toMilli(g.allocated || 0), 0) / 1000;
  }, [goals]);

  const availableSavings = subMoney(savingsBalance, allocatedTotal);
  const allocationPct = savingsBalance > 0 ? Math.min(100, Math.max(0, (allocatedTotal / savingsBalance) * 100)) : 0;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTarget = parseFloat(target);
    if (!name.trim() || isNaN(parsedTarget) || parsedTarget <= 0) return;

    onAddGoal(name.trim(), parsedTarget);
    setName('');
    setTarget('');
  };

  const handleConfirmAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocatingGoal) return;
    const parsed = parseFloat(allocAmount);
    if (isNaN(parsed) || parsed <= 0) return;

    const delta = allocatingGoal.isDeposit ? parsed : -parsed;
    onUpdateAllocation(allocatingGoal.goal.id, delta);
    setAllocatingGoal(null);
    setAllocAmount('');
  };

  return (
    <div className="space-y-4">
      {/* Savings Summary Banner */}
      <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-xs text-[var(--muted)] block">Total Savings Balance</span>
            <b className="text-xl font-mono-numbers text-amber-600 dark:text-amber-400">
              {money(savingsBalance)}
            </b>
          </div>
          <div className="text-right">
            <span className="text-xs text-[var(--muted)] block">Available (Unallocated)</span>
            <b
              className={`text-sm font-mono-numbers ${
                availableSavings < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {money(availableSavings)}
            </b>
          </div>
        </div>

        {/* Total Allocation Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-[var(--muted)]">
            <span>Allocated: {money(allocatedTotal)}</span>
            <span>{Math.round(allocationPct)}% of total</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[var(--bg)] overflow-hidden border border-[var(--line)]">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${allocationPct}%` }} />
          </div>
        </div>
      </div>

      {/* Create New Bucket Form */}
      <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs">
        <h3 className="font-bold text-sm text-[var(--ink)] mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-teal-600" />
          <span>Create Savings Goal Bucket</span>
        </h3>

        <form onSubmit={handleCreate} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--muted)] mb-1">Goal Name</label>
              <input
                type="text"
                required
                placeholder="e.g. New Laptop, Emergency Fund"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)]"
              />
            </div>
            <div>
              <label className="block text-[var(--muted)] mb-1">Target Amount</label>
              <input
                type="number"
                step="0.001"
                min="0"
                required
                placeholder="0.000"
                value={target}
                onChange={e => setTarget(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono-numbers rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition shadow-xs flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Bucket</span>
          </button>
        </form>
      </div>

      {/* Goal Buckets Grid */}
      <div className="space-y-3">
        {goals.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-[var(--card)] border border-[var(--line)]">
            <Target className="w-8 h-8 text-[var(--muted)] mx-auto mb-2 opacity-60" />
            <p className="text-sm text-[var(--muted)]">No savings goals created yet.</p>
          </div>
        ) : (
          goals.map(g => {
            const pct = g.target > 0 ? Math.min(100, Math.max(0, (g.allocated / g.target) * 100)) : 0;
            const isCompleted = g.allocated >= g.target && g.target > 0;

            return (
              <div
                key={g.id}
                className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] hover:border-teal-500/30 shadow-xs transition space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-[var(--ink)]">{g.name}</h4>
                    <span className="text-xs text-[var(--muted)]">
                      Target: <span className="font-mono-numbers font-medium">{money(g.target)}</span>
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-mono-numbers font-bold text-sm text-[var(--ink)] block">
                      {money(g.allocated)}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                        isCompleted
                          ? 'bg-emerald-500/15 text-emerald-600'
                          : 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
                      }`}
                    >
                      {Math.round(pct)}% {isCompleted ? '✓ Completed' : ''}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-[var(--bg)] overflow-hidden border border-[var(--line)]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isCompleted ? 'bg-emerald-500' : 'bg-teal-600'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Bucket Controls */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setAllocatingGoal({ goal: g, isDeposit: true });
                        setAllocAmount('10');
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--bg)] hover:border-teal-500/40 text-xs font-medium text-[var(--ink)] transition"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Allocate</span>
                    </button>

                    <button
                      onClick={() => {
                        setAllocatingGoal({ goal: g, isDeposit: false });
                        setAllocAmount('10');
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--bg)] hover:border-teal-500/40 text-xs font-medium text-[var(--ink)] transition"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5 text-amber-600" />
                      <span>Withdraw</span>
                    </button>
                  </div>

                  <button
                    onClick={() => onDeleteGoal(g.id)}
                    className="p-1.5 text-[var(--muted)] hover:text-red-500 transition"
                    title="Delete goal bucket"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Allocate / Withdraw Quick Modal */}
      {allocatingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--card)] border border-[var(--line)] p-5 shadow-xl">
            <h3 className="font-bold text-base text-[var(--ink)] mb-2">
              {allocatingGoal.isDeposit ? 'Allocate Funds to Bucket' : 'Withdraw Funds from Bucket'}
            </h3>
            <p className="text-xs text-[var(--muted)] mb-4">
              Bucket: <span className="font-semibold text-[var(--ink)]">{allocatingGoal.goal.name}</span>
            </p>

            <form onSubmit={handleConfirmAllocation} className="space-y-4">
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">Amount</label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  required
                  autoFocus
                  placeholder="0.000"
                  value={allocAmount}
                  onChange={e => setAllocAmount(e.target.value)}
                  className="w-full px-3 py-2 text-base font-mono-numbers rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)]"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAllocatingGoal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--line)] text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 shadow-sm"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
