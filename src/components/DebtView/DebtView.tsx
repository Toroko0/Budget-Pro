import React, { useState } from 'react';
import { Users, Plus, Trash2, Calendar, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { Person, PersonLine, PersonLineType } from '../../types';
import { toMilli, fromMilli, today } from '../../lib/storage';

interface DebtViewProps {
  people: Person[];
  onAddDebtLine: (personName: string, line: Omit<PersonLine, 'id'>) => void;
  onDeleteDebtLine: (personId: string, lineId: string) => void;
  onDeletePerson: (personId: string) => void;
  money: (val: number | string) => string;
  num: (val: number | string) => string;
}

const PERSON_TYPES: Record<PersonLineType, [string, number]> = {
  lent: ['Lent (they owe you)', 1],
  borrowed: ['Borrowed (you owe)', -1],
  received: ['They paid you back', -1],
  paid: ['You paid them back', 1]
};

export const DebtView: React.FC<DebtViewProps> = ({
  people,
  onAddDebtLine,
  onDeleteDebtLine,
  onDeletePerson,
  money,
  num
}) => {
  const [openPersonId, setOpenPersonId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<PersonLineType>('lent');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!name.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    onAddDebtLine(name.trim(), {
      type,
      amount: parsedAmount,
      date: today(),
      dueDate: dueDate || undefined,
      note: note.trim()
    });

    setName('');
    setAmount('');
    setDueDate('');
    setNote('');
  };

  const existingNames = [...new Set(people.map(p => p.name))];

  return (
    <div className="space-y-4">
      {/* Add Debt / Loan Entry Card */}
      <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs">
        <h3 className="font-bold text-sm text-[var(--ink)] mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-teal-600" />
          <span>Add Debt / Loan Record</span>
        </h3>

        <form onSubmit={handleAdd} className="space-y-3 text-xs">
          <div>
            <label className="block text-[var(--muted)] mb-1">Person's Name</label>
            <input
              type="text"
              list="people-list"
              required
              placeholder="e.g. Alex, Sarah"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)]"
            />
            <datalist id="people-list">
              {existingNames.map(n => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--muted)] mb-1">Transaction Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as PersonLineType)}
                className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)]"
              >
                {Object.entries(PERSON_TYPES).map(([k, [label]]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--muted)] mb-1">Due Date (Optional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)]"
              />
            </div>

            <div>
              <label className="block text-[var(--muted)] mb-1">Note (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Dinner split, loan"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition shadow-xs flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Record Debt Entry</span>
          </button>
        </form>
      </div>

      {/* People Directory List */}
      <div className="space-y-3">
        {people.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-[var(--card)] border border-[var(--line)]">
            <Users className="w-8 h-8 text-[var(--muted)] mx-auto mb-2 opacity-60" />
            <p className="text-sm text-[var(--muted)]">No active loans or debts logged yet.</p>
          </div>
        ) : (
          people.map(p => {
            const netMilli = p.lines.reduce(
              (acc, line) => acc + PERSON_TYPES[line.type][1] * toMilli(line.amount),
              0
            );
            const net = fromMilli(netMilli);
            const isSettled = Math.abs(net) < 0.0005;
            const owesYou = net > 0.0005;
            const youOwe = net < -0.0005;

            const isOpen = openPersonId === p.id;

            return (
              <div
                key={p.id}
                className="rounded-2xl bg-[var(--card)] border border-[var(--line)] overflow-hidden shadow-xs transition"
              >
                {/* Person Header Strip */}
                <div
                  onClick={() => setOpenPersonId(isOpen ? null : p.id)}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-[var(--bg)] transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold text-sm">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[var(--ink)]">{p.name}</h4>
                      <span className="text-[11px] text-[var(--muted)]">{p.lines.length} ledger records</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono-numbers font-bold text-sm ${
                        isSettled
                          ? 'text-[var(--muted)]'
                          : owesYou
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-500'
                      }`}
                    >
                      {isSettled ? 'Settled' : owesYou ? `Owes you ${money(net)}` : `You owe ${money(-net)}`}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[var(--muted)]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[var(--muted)]" />
                    )}
                  </div>
                </div>

                {/* History Drawer */}
                {isOpen && (
                  <div className="p-3.5 bg-[var(--bg)] border-t border-[var(--line)] space-y-2 text-xs">
                    <div className="space-y-1.5">
                      {p.lines.map(line => {
                        let dueBadge = '';
                        if (line.dueDate) {
                          const diffDays = Math.ceil(
                            (new Date(line.dueDate + 'T00:00:00').getTime() -
                              new Date(today() + 'T00:00:00').getTime()) /
                              (1000 * 60 * 60 * 24)
                          );
                          if (diffDays < 0) {
                            dueBadge = `Overdue (${Math.abs(diffDays)}d ago)`;
                          } else if (diffDays === 0) {
                            dueBadge = 'Due Today';
                          } else {
                            dueBadge = `Due in ${diffDays}d`;
                          }
                        }

                        return (
                          <div
                            key={line.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-[var(--card)] border border-[var(--line)]"
                          >
                            <div>
                              <span className="font-semibold text-[var(--ink)] block">
                                {PERSON_TYPES[line.type][0]}
                              </span>
                              <div className="flex items-center gap-2 text-[11px] text-[var(--muted)] mt-0.5">
                                <span>{line.date}</span>
                                {line.note && <span>· {line.note}</span>}
                                {dueBadge && (
                                  <span className="text-amber-600 font-medium">· {dueBadge}</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="font-mono-numbers font-bold text-sm text-[var(--ink)]">
                                {num(line.amount)}
                              </span>
                              <button
                                onClick={() => onDeleteDebtLine(p.id, line.id)}
                                className="p-1 text-[var(--muted)] hover:text-red-500"
                                title="Remove line"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => onDeletePerson(p.id)}
                        className="px-3 py-1.5 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10 text-xs font-medium"
                      >
                        Delete {p.name}'s Profile
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
