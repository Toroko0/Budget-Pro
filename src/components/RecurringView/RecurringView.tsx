import React, { useState, useMemo } from 'react';
import {
  Repeat,
  Plus,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Edit2,
  Wallet
} from 'lucide-react';
import { Subscription, Cadence, AccountType, Category } from '../../types';
import { today, pad, addMoney } from '../../lib/storage';

interface RecurringViewProps {
  subscriptions: Subscription[];
  categories: Category[];
  onAddSubscription: (sub: Omit<Subscription, 'id'>) => void;
  onUpdateSubscription: (id: string, updates: Partial<Subscription>) => void;
  onDeleteSubscription: (id: string) => void;
  onLogPayment: (sub: Subscription) => void;
  money: (val: number | string) => string;
  num: (val: number | string) => string;
}

export const RecurringView: React.FC<RecurringViewProps> = ({
  subscriptions,
  categories,
  onAddSubscription,
  onUpdateSubscription,
  onDeleteSubscription,
  onLogPayment,
  money,
  num
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cadence, setCadence] = useState<Cadence>('monthly');
  const [category, setCategory] = useState(categories[0]?.name || 'Bills & Utilities');
  const [account, setAccount] = useState<'cash' | 'benefit'>('benefit');
  const [dueDay, setDueDay] = useState('1');
  const [note, setNote] = useState('');

  // Total monthly commitment calculation
  const totalMonthlyCommitment = useMemo(() => {
    let total = 0;
    for (const sub of subscriptions) {
      if (sub.cadence === 'monthly') total = addMoney(total, sub.amount);
      else if (sub.cadence === 'weekly') total = addMoney(total, sub.amount * 4.333);
      else if (sub.cadence === 'yearly') total = addMoney(total, sub.amount / 12);
    }
    return total;
  }, [subscriptions]);

  // Compute days until next due date for each subscription
  const itemsWithDueInfo = useMemo(() => {
    const todayDate = new Date(today() + 'T00:00:00');
    const currentYear = todayDate.getFullYear();
    const currentMonth = todayDate.getMonth() + 1;

    return subscriptions.map(sub => {
      // Calculate target date this month
      let targetDateStr = `${currentYear}-${pad(currentMonth)}-${pad(Math.min(28, sub.dueDay || 1))}`;
      let targetDate = new Date(targetDateStr + 'T00:00:00');

      // If already passed this month, look at next month
      if (targetDate.getTime() < todayDate.getTime()) {
        const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
        const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
        targetDateStr = `${nextYear}-${pad(nextMonth)}-${pad(Math.min(28, sub.dueDay || 1))}`;
        targetDate = new Date(targetDateStr + 'T00:00:00');
      }

      const diffDays = Math.ceil((targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
      const isLoggedToday = sub.lastLoggedDate === today();

      return {
        ...sub,
        computedNextDueDate: targetDateStr,
        diffDays,
        isLoggedToday
      };
    }).sort((a, b) => a.diffDays - b.diffDays);
  }, [subscriptions]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setAmount('');
    setCadence('monthly');
    setCategory(categories[0]?.name || 'Bills & Utilities');
    setAccount('benefit');
    setDueDay('1');
    setNote('');
    setIsModalOpen(true);
  };

  const handleEdit = (sub: Subscription) => {
    setEditingId(sub.id);
    setName(sub.name);
    setAmount(String(sub.amount));
    setCadence(sub.cadence);
    setCategory(sub.category);
    setAccount(sub.account);
    setDueDay(String(sub.dueDay));
    setNote(sub.note || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!name.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const dueDayNum = Math.max(1, Math.min(31, parseInt(dueDay, 10) || 1));
    const nextDate = `${currentYear}-${pad(currentMonth)}-${pad(Math.min(28, dueDayNum))}`;

    if (editingId) {
      onUpdateSubscription(editingId, {
        name: name.trim(),
        amount: parsedAmount,
        cadence,
        category,
        account,
        dueDay: dueDayNum,
        nextDueDate: nextDate,
        note: note.trim()
      });
    } else {
      onAddSubscription({
        name: name.trim(),
        amount: parsedAmount,
        cadence,
        category,
        account,
        dueDay: dueDayNum,
        nextDueDate: nextDate,
        note: note.trim()
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Header Commitment Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-700 text-white shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider opacity-85 block">
              Monthly Recurring Obligations
            </span>
            <b className="text-2xl font-mono-numbers block mt-1">{money(totalMonthlyCommitment)}</b>
            <p className="text-xs opacity-90 mt-1">
              {subscriptions.length} active bills & subscriptions in vault
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white text-teal-800 hover:bg-white/90 text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Bill</span>
          </button>
        </div>
      </div>

      {/* Subscriptions List */}
      <div className="space-y-3">
        {itemsWithDueInfo.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-[var(--card)] border border-[var(--line)]">
            <Repeat className="w-8 h-8 text-[var(--muted)] mx-auto mb-2 opacity-60" />
            <h3 className="font-semibold text-sm text-[var(--ink)]">No recurring bills added</h3>
            <p className="text-xs text-[var(--muted)] mt-1 max-w-sm mx-auto">
              Track your regular subscriptions (Netflix, broadband, rent, utilities) with automated due reminders.
            </p>
            <button
              onClick={handleOpenAdd}
              className="mt-3 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700"
            >
              Add First Recurring Bill
            </button>
          </div>
        ) : (
          itemsWithDueInfo.map(sub => {
            let dueBadgeColor = 'bg-[var(--bg)] text-[var(--muted)]';
            let dueText = `Due in ${sub.diffDays} days`;

            if (sub.diffDays === 0) {
              dueBadgeColor = 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30';
              dueText = 'Due Today';
            } else if (sub.diffDays <= 3) {
              dueBadgeColor = 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
              dueText = `Due in ${sub.diffDays} days`;
            }

            return (
              <div
                key={sub.id}
                className="p-3.5 rounded-2xl bg-[var(--card)] border border-[var(--line)] hover:border-teal-500/30 shadow-xs transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[var(--bg)] border border-[var(--line)] flex items-center justify-center text-teal-600 shrink-0">
                      <Repeat className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-[var(--ink)] truncate">{sub.name}</h4>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[var(--bg)] text-[var(--muted)]">
                          {sub.cadence}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--muted)] mt-0.5">
                        <span>{sub.category}</span>
                        <span>·</span>
                        <span className="capitalize">{sub.account}</span>
                        {sub.note && (
                          <>
                            <span>·</span>
                            <span className="truncate italic">{sub.note}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Amount & Due Tag */}
                  <div className="text-right shrink-0">
                    <span className="font-mono-numbers font-bold text-sm text-[var(--ink)] block">
                      {money(sub.amount)}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full inline-block mt-1 ${dueBadgeColor}`}>
                      {dueText}
                    </span>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-[var(--line)] text-xs">
                  <span className="text-[var(--muted)] text-[11px]">
                    {sub.isLoggedToday
                      ? '✓ Logged in today\'s ledger'
                      : sub.lastLoggedDate
                      ? `Last logged: ${sub.lastLoggedDate}`
                      : 'Not yet logged'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onLogPayment(sub)}
                      disabled={sub.isLoggedToday}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        sub.isLoggedToday
                          ? 'bg-emerald-500/10 text-emerald-600 cursor-default'
                          : 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
                      }`}
                      title="Record this bill in today's ledger"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{sub.isLoggedToday ? 'Recorded' : 'Log Payment'}</span>
                    </button>

                    <button
                      onClick={() => handleEdit(sub)}
                      className="p-1 text-[var(--muted)] hover:text-teal-600 transition"
                      title="Edit recurring rule"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteSubscription(sub.id)}
                      className="p-1 text-[var(--muted)] hover:text-red-500 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Subscription Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-[var(--card)] border border-[var(--line)] p-5 shadow-xl">
            <h3 className="font-bold text-base text-[var(--ink)] mb-4">
              {editingId ? 'Edit Recurring Obligation' : 'Add Recurring Bill / Subscription'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-[var(--muted)] mb-1">Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fiber Internet, Netflix, Gym"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--muted)] mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    required
                    placeholder="0.000"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-numbers rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)]"
                  />
                </div>

                <div>
                  <label className="block text-[var(--muted)] mb-1">Billing Cadence</label>
                  <select
                    value={cadence}
                    onChange={e => setCadence(e.target.value as Cadence)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)]"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--muted)] mb-1">Day of Month Due</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={dueDay}
                    onChange={e => setDueDay(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-numbers rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)]"
                  />
                </div>

                <div>
                  <label className="block text-[var(--muted)] mb-1">Account</label>
                  <select
                    value={account}
                    onChange={e => setAccount(e.target.value as 'cash' | 'benefit')}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)]"
                  >
                    <option value="benefit">Benefit</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[var(--muted)] mb-1">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)]"
                >
                  {categories.map(c => (
                    <option key={c.name} value={c.name}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[var(--muted)] mb-1">Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Auto-debits on 1st of month"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)]"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--line)] text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 shadow-sm"
                >
                  {editingId ? 'Save Changes' : 'Add Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
