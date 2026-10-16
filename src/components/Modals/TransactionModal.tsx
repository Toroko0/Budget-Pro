import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Image as ImageIcon, Trash2, ArrowRightLeft } from 'lucide-react';
import { Transaction, TransactionKind, AccountType, Category } from '../../types';
import { today, compressImageFile, round3 } from '../../lib/storage';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Omit<Transaction, 'id'>, id?: string) => void;
  editingTransaction?: Transaction | null;
  categories: {
    expense: Category[];
    income: Category[];
  };
  defaultDate: string;
}

const ACCOUNTS: AccountType[] = ['cash', 'benefit', 'savings'];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTransaction,
  categories,
  defaultDate
}) => {
  const [kind, setKind] = useState<TransactionKind>('expense');
  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState<AccountType>('cash');
  const [fromAccount, setFromAccount] = useState<AccountType>('cash');
  const [toAccount, setToAccount] = useState<AccountType>('benefit');
  const [category, setCategory] = useState(categories.expense[0]?.name || 'Food & Dining');
  const [date, setDate] = useState(defaultDate || today());
  const [note, setNote] = useState('');
  const [receipt, setReceipt] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when editing or opening
  useEffect(() => {
    if (editingTransaction) {
      setKind(editingTransaction.kind);
      setAmount(String(editingTransaction.amount));
      setAccount(editingTransaction.account || 'cash');
      setFromAccount(editingTransaction.from || 'cash');
      setToAccount(editingTransaction.to || 'benefit');
      setCategory(editingTransaction.category || categories.expense[0]?.name || 'Other');
      setDate(editingTransaction.date);
      setNote(editingTransaction.note || '');
      setReceipt(editingTransaction.receipt || null);
    } else {
      setKind('expense');
      setAmount('');
      setAccount('cash');
      setFromAccount('cash');
      setToAccount('benefit');
      setCategory(categories.expense[0]?.name || 'Food & Dining');
      setDate(defaultDate || today());
      setNote('');
      setReceipt(null);
    }
  }, [editingTransaction, isOpen, categories, defaultDate]);

  // Adjust category if kind changes
  const handleKindChange = (newKind: TransactionKind) => {
    setKind(newKind);
    if (newKind === 'expense') {
      setCategory(categories.expense[0]?.name || 'Food & Dining');
    } else if (newKind === 'income') {
      setCategory(categories.income[0]?.name || 'Salary / Allowance');
    }
  };

  // Image Upload handler
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const compressed = await compressImageFile(file, 1200, 0.78);
      setReceipt(compressed);
    } catch (err) {
      console.error('Failed to compress receipt image:', err);
    }
    e.target.value = '';
  };

  // Clipboard Paste listener (Ctrl+V)
  useEffect(() => {
    if (!isOpen) return;
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            const compressed = await compressImageFile(file, 1200, 0.78);
            setReceipt(compressed);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    const tagMatch = note.match(/#([a-zA-Z0-9_]+)/);
    const tags = tagMatch ? tagMatch[1] : undefined;

    const currentCatList = kind === 'income' ? categories.income : categories.expense;
    const selectedCatObj = currentCatList.find(c => c.name === category);

    const txData: Omit<Transaction, 'id'> = {
      kind,
      date,
      amount: round3(parsedAmount),
      note: note.trim(),
      receipt: receipt || null,
      tags
    };

    if (kind === 'move') {
      if (fromAccount === toAccount) return;
      txData.from = fromAccount;
      txData.to = toAccount;
    } else {
      txData.account = account;
      txData.category = category;
      txData.icon = selectedCatObj?.icon || '•';
    }

    onSave(txData, editingTransaction?.id);
    onClose();
  };

  if (!isOpen) return null;

  const currentCategories = kind === 'income' ? categories.income : categories.expense;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-xs p-0 md:p-4">
      <div className="w-full max-w-lg rounded-t-3xl md:rounded-3xl bg-[var(--card)] border border-[var(--line)] p-5 max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line)] mb-4">
          <h3 className="font-bold text-base text-[var(--ink)]">
            {editingTransaction
              ? 'Edit Transaction'
              : kind === 'move'
              ? 'Move Money Between Accounts'
              : kind === 'income'
              ? 'Add Income Entry'
              : 'Add Expense Entry'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Kind Selector Pills */}
        <div className="flex p-1 rounded-xl bg-[var(--bg)] border border-[var(--line)] mb-4 text-xs font-semibold">
          {(['expense', 'income', 'move'] as TransactionKind[]).map(k => (
            <button
              key={k}
              type="button"
              onClick={() => handleKindChange(k)}
              className={`flex-1 py-2 rounded-lg capitalize transition ${
                kind === k
                  ? 'bg-[var(--card)] text-[var(--ink)] shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              {k === 'expense' ? 'Spend' : k === 'income' ? 'Income' : 'Transfer'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Big Amount Input */}
          <div>
            <label className="block text-[var(--muted)] mb-1 text-center">Amount</label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              required
              autoFocus
              placeholder="0.000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full text-center text-3xl font-bold font-mono-numbers py-3 rounded-2xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Account Selection */}
          {kind === 'move' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[var(--muted)] mb-1">From Account</label>
                <select
                  value={fromAccount}
                  onChange={e => setFromAccount(e.target.value as AccountType)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)] capitalize"
                >
                  {ACCOUNTS.map(a => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[var(--muted)] mb-1">To Account</label>
                <select
                  value={toAccount}
                  onChange={e => setToAccount(e.target.value as AccountType)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)] capitalize"
                >
                  {ACCOUNTS.map(a => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[var(--muted)] mb-1.5">Account</label>
              <div className="flex gap-2">
                {(['cash', 'benefit'] as AccountType[]).map(acc => (
                  <button
                    key={acc}
                    type="button"
                    onClick={() => setAccount(acc)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize border transition ${
                      account === acc
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-[var(--bg)] border-[var(--line)] text-[var(--ink)] hover:border-teal-500/30'
                    }`}
                  >
                    {acc}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category Selector */}
          {kind !== 'move' && (
            <div>
              <label className="block text-[var(--muted)] mb-1.5">Category</label>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 rounded-xl bg-[var(--bg)] border border-[var(--line)]">
                {currentCategories.map(c => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setCategory(c.name)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                      category === c.name
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-[var(--card)] border border-[var(--line)] text-[var(--ink)] hover:border-teal-500/30'
                    }`}
                  >
                    <span>{c.icon}</span>
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date & Note Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--muted)] mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)]"
              />
            </div>

            <div>
              <label className="block text-[var(--muted)] mb-1">Note & #tags</label>
              <input
                type="text"
                placeholder="e.g. Lunch with team #work"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)]"
              />
            </div>
          </div>

          {/* Receipt Attachment Section */}
          <div>
            <label className="block text-[var(--muted)] mb-1.5">Receipt Attachment (Local Vault)</label>
            {receipt ? (
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)]">
                <img
                  src={receipt}
                  alt="Receipt Preview"
                  className="w-12 h-12 rounded-lg object-cover border border-[var(--line)]"
                />
                <div className="flex-1 min-w-0 text-xs">
                  <span className="font-semibold text-[var(--ink)] block">Receipt Attached</span>
                  <span className="text-[var(--muted)] text-[11px] block">
                    Compressed & stored on device
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setReceipt(null)}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition"
                  title="Remove receipt"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 rounded-xl border border-dashed border-[var(--line)] hover:border-teal-500 bg-[var(--bg)] flex items-center justify-center gap-2 text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] transition"
              >
                <Camera className="w-4 h-4 text-teal-600" />
                <span>Take Photo / Attach Receipt / Paste (Ctrl+V)</span>
              </button>
            )}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleReceiptUpload}
              className="hidden"
            />
          </div>

          {/* Action Footer */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-[var(--line)] text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs"
            >
              {editingTransaction ? 'Update Entry' : 'Save to Vault'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
