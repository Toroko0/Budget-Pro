import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  VaultData,
  Transaction,
  Subscription,
  PersonLine,
  AccountType,
  ThemeName,
  ActiveView,
  Category,
  Preset
} from '../types';
import {
  createBlankVault,
  loadSyncVault,
  persistVault,
  getPersistedVault,
  calculateBalancesAt,
  today,
  round3,
  toMilli,
  addMoney,
  subMoney,
  uid
} from '../lib/storage';

export function useVault() {
  const [vault, setVault] = useState<VaultData>(() => loadSyncVault());
  const [activeView, setActiveView] = useState<ActiveView>('day');
  const [selectedDate, setSelectedDate] = useState<string>(() => today());
  const [selectedMonth, setSelectedMonth] = useState<string>(() => today().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  const [searchQuery, setSearchQuery] = useState('');
  const [minAmt, setMinAmt] = useState('');
  const [maxAmt, setMaxAmt] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(() => !!vault.settings.pin);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  // Hydrate from IndexedDB on initial mount
  useEffect(() => {
    // Request persistent storage
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }

    getPersistedVault().then(idbVault => {
      if (idbVault) {
        setVault(prev => {
          const localTime = new Date(prev.lastModified || 0).getTime();
          const idbTime = new Date(idbVault.lastModified || 0).getTime();
          if (idbTime >= localTime) {
            return idbVault;
          }
          return prev;
        });
      }
    });
  }, []);

  // Synchronize document data-theme
  useEffect(() => {
    const theme = vault.settings.theme || 'teal';
    document.documentElement.setAttribute('data-theme', theme);
  }, [vault.settings.theme]);

  // Save vault state changes
  const saveVault = useCallback((newVault: VaultData, touchTime = true) => {
    setVault(newVault);
    persistVault(newVault, touchTime);
  }, []);

  // Currency & formatting helpers
  const currency = vault.settings.currency || 'BHD';
  const decimals = vault.settings.decimals ?? 3;
  const stealth = vault.settings.stealth;

  const num = useCallback(
    (n: number | string): string => {
      if (stealth) return '***.***';
      const factor = Math.pow(10, decimals);
      const val = Math.round((Number(n) || 0) * factor) / factor;
      const cleanVal = Math.abs(val) < 0.5 / factor ? 0 : val;
      return cleanVal.toFixed(decimals);
    },
    [stealth, decimals]
  );

  const money = useCallback(
    (n: number | string): string => {
      if (stealth) return `${currency} ***.***`;
      return `${currency} ${num(n)}`;
    },
    [currency, num, stealth]
  );

  // Live account balances at selected date
  const balances = useMemo(() => {
    return calculateBalancesAt(vault.tx, vault.opening, selectedDate);
  }, [vault.tx, vault.opening, selectedDate]);

  // ----------------------------------------
  // Transactions
  // ----------------------------------------
  const addTransaction = useCallback(
    (tx: Omit<Transaction, 'id'>) => {
      const newTx: Transaction = {
        ...tx,
        id: uid(),
        amount: round3(tx.amount)
      };
      const updated = {
        ...vault,
        tx: [newTx, ...vault.tx]
      };
      saveVault(updated);
      showToast('Entry saved to vault');
    },
    [vault, saveVault, showToast]
  );

  const updateTransaction = useCallback(
    (id: string, updates: Partial<Transaction>) => {
      const updatedList = vault.tx.map(t => (t.id === id ? { ...t, ...updates } : t));
      saveVault({ ...vault, tx: updatedList });
      showToast('Entry updated');
    },
    [vault, saveVault, showToast]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      const updatedList = vault.tx.filter(t => t.id !== id);
      saveVault({ ...vault, tx: updatedList });
      showToast('Entry deleted');
    },
    [vault, saveVault, showToast]
  );

  // ----------------------------------------
  // Subscriptions & Recurring Bills
  // ----------------------------------------
  const addSubscription = useCallback(
    (sub: Omit<Subscription, 'id'>) => {
      const newSub: Subscription = {
        ...sub,
        id: uid(),
        amount: round3(sub.amount)
      };
      saveVault({
        ...vault,
        subscriptions: [...(vault.subscriptions || []), newSub]
      });
      showToast(`Added recurring ${sub.name}`);
    },
    [vault, saveVault, showToast]
  );

  const updateSubscription = useCallback(
    (id: string, updates: Partial<Subscription>) => {
      const list = (vault.subscriptions || []).map(s => (s.id === id ? { ...s, ...updates } : s));
      saveVault({ ...vault, subscriptions: list });
      showToast('Subscription updated');
    },
    [vault, saveVault, showToast]
  );

  const deleteSubscription = useCallback(
    (id: string) => {
      const list = (vault.subscriptions || []).map(s => s).filter(s => s.id !== id);
      saveVault({ ...vault, subscriptions: list });
      showToast('Subscription removed');
    },
    [vault, saveVault, showToast]
  );

  const logSubscriptionPayment = useCallback(
    (sub: Subscription) => {
      const currentDate = today();
      const newTx: Transaction = {
        id: uid(),
        kind: 'expense',
        date: currentDate,
        amount: sub.amount,
        note: `Recurring: ${sub.name} #recurring`,
        account: sub.account,
        category: sub.category,
        tags: 'recurring'
      };

      const updatedSubs = (vault.subscriptions || []).map(s =>
        s.id === sub.id ? { ...s, lastLoggedDate: currentDate } : s
      );

      saveVault({
        ...vault,
        tx: [newTx, ...vault.tx],
        subscriptions: updatedSubs
      });
      showToast(`Logged payment for ${sub.name}`);
    },
    [vault, saveVault, showToast]
  );

  // ----------------------------------------
  // People & Debt Tracking
  // ----------------------------------------
  const addDebtLine = useCallback(
    (personName: string, line: Omit<PersonLine, 'id'>) => {
      const trimmed = personName.trim();
      let person = vault.people.find(p => p.name.toLowerCase() === trimmed.toLowerCase());
      const newLine: PersonLine = { ...line, id: uid(), amount: round3(line.amount) };

      let updatedPeople: typeof vault.people;
      if (person) {
        updatedPeople = vault.people.map(p =>
          p.id === person!.id ? { ...p, lines: [...p.lines, newLine] } : p
        );
      } else {
        const newPerson = { id: uid(), name: trimmed, lines: [newLine] };
        updatedPeople = [...vault.people, newPerson];
      }

      saveVault({ ...vault, people: updatedPeople });
      showToast('Debt record saved');
    },
    [vault, saveVault, showToast]
  );

  const deleteDebtLine = useCallback(
    (personId: string, lineId: string) => {
      const updatedPeople = vault.people.map(p => {
        if (p.id !== personId) return p;
        return { ...p, lines: p.lines.filter(l => l.id !== lineId) };
      });
      saveVault({ ...vault, people: updatedPeople });
      showToast('Debt line removed');
    },
    [vault, saveVault, showToast]
  );

  const deletePerson = useCallback(
    (personId: string) => {
      const updatedPeople = vault.people.filter(p => p.id !== personId);
      saveVault({ ...vault, people: updatedPeople });
      showToast('Profile deleted');
    },
    [vault, saveVault, showToast]
  );

  // ----------------------------------------
  // Savings Goals
  // ----------------------------------------
  const addGoal = useCallback(
    (name: string, target: number) => {
      const newGoal = {
        id: uid(),
        name: name.trim(),
        target: round3(target),
        allocated: 0
      };
      saveVault({ ...vault, goals: [...vault.goals, newGoal] });
      showToast('Savings goal created');
    },
    [vault, saveVault, showToast]
  );

  const updateGoalAllocation = useCallback(
    (id: string, deltaAmount: number) => {
      const updatedGoals = vault.goals.map(g => {
        if (g.id !== id) return g;
        const newAlloc = Math.max(0, addMoney(g.allocated, deltaAmount));
        return { ...g, allocated: newAlloc };
      });
      saveVault({ ...vault, goals: updatedGoals });
      showToast(deltaAmount >= 0 ? 'Funds allocated' : 'Funds withdrawn');
    },
    [vault, saveVault, showToast]
  );

  const deleteGoal = useCallback(
    (id: string) => {
      const updatedGoals = vault.goals.filter(g => g.id !== id);
      saveVault({ ...vault, goals: updatedGoals });
      showToast('Savings goal removed');
    },
    [vault, saveVault, showToast]
  );

  // ----------------------------------------
  // Monthly Budgets
  // ----------------------------------------
  const setMonthlyBudget = useCallback(
    (month: string, amount: number | null) => {
      const newBudgets = { ...vault.budgets };
      if (amount === null || amount <= 0) {
        delete newBudgets[month];
      } else {
        newBudgets[month] = round3(amount);
      }
      saveVault({ ...vault, budgets: newBudgets });
      showToast('Monthly budget updated');
    },
    [vault, saveVault, showToast]
  );

  // ----------------------------------------
  // Quick-Add Presets
  // ----------------------------------------
  const addPreset = useCallback(
    (preset: Omit<Preset, 'id'>) => {
      const newP: Preset = { ...preset, id: uid(), amount: round3(preset.amount) };
      saveVault({ ...vault, presets: [...vault.presets, newP] });
      showToast('Quick preset created');
    },
    [vault, saveVault, showToast]
  );

  const deletePreset = useCallback(
    (id: string) => {
      const updated = vault.presets.filter(p => p.id !== id);
      saveVault({ ...vault, presets: updated });
      showToast('Preset removed');
    },
    [vault, saveVault, showToast]
  );

  const applyPreset = useCallback(
    (presetId: string) => {
      const p = vault.presets.find(x => x.id === presetId);
      if (!p) return;
      const newTx: Transaction = {
        id: uid(),
        kind: p.kind,
        date: selectedDate,
        amount: p.amount,
        note: p.name,
        account: p.account,
        category: p.category,
        tags: 'quick'
      };
      saveVault({ ...vault, tx: [newTx, ...vault.tx] });
      showToast(`Logged ${p.name}`);
    },
    [vault, selectedDate, saveVault, showToast]
  );

  // ----------------------------------------
  // Categories
  // ----------------------------------------
  const addCategory = useCallback(
    (kind: 'expense' | 'income', cat: Category) => {
      const list = [...vault.categories[kind]];
      if (list.some(c => c.name.toLowerCase() === cat.name.trim().toLowerCase())) {
        showToast('Category already exists');
        return;
      }
      list.push({ ...cat, name: cat.name.trim(), limit: round3(cat.limit || 0) });
      saveVault({
        ...vault,
        categories: { ...vault.categories, [kind]: list }
      });
      showToast('Category added');
    },
    [vault, saveVault, showToast]
  );

  const deleteCategory = useCallback(
    (kind: 'expense' | 'income', index: number) => {
      const list = [...vault.categories[kind]];
      list.splice(index, 1);
      saveVault({
        ...vault,
        categories: { ...vault.categories, [kind]: list }
      });
      showToast('Category removed');
    },
    [vault, saveVault, showToast]
  );

  // ----------------------------------------
  // Settings & Theme
  // ----------------------------------------
  const setTheme = useCallback(
    (theme: ThemeName) => {
      const updated = {
        ...vault,
        settings: { ...vault.settings, theme }
      };
      saveVault(updated, false);
      showToast(`Theme changed to ${theme}`);
    },
    [vault, saveVault, showToast]
  );

  const cycleTheme = useCallback(() => {
    const themes: ThemeName[] = ['teal', 'dark', 'midnight', 'emerald', 'sunset'];
    const currentIdx = themes.indexOf(vault.settings.theme || 'teal');
    const next = themes[(currentIdx + 1) % themes.length];
    setTheme(next);
  }, [vault.settings.theme, setTheme]);

  const toggleStealth = useCallback(() => {
    const updated = {
      ...vault,
      settings: { ...vault.settings, stealth: !vault.settings.stealth }
    };
    saveVault(updated, false);
    showToast(updated.settings.stealth ? 'Stealth mode enabled' : 'Stealth mode disabled');
  }, [vault, saveVault, showToast]);

  const setCurrency = useCallback(
    (curr: string) => {
      const updated = {
        ...vault,
        settings: { ...vault.settings, currency: curr }
      };
      saveVault(updated, false);
      showToast(`Currency set to ${curr}`);
    },
    [vault, saveVault, showToast]
  );

  const setDecimals = useCallback(
    (dec: number) => {
      const updated = {
        ...vault,
        settings: { ...vault.settings, decimals: dec }
      };
      saveVault(updated, false);
      showToast(`Decimals set to ${dec}`);
    },
    [vault, saveVault, showToast]
  );

  const setPin = useCallback(
    (pin: string | null) => {
      const updated = {
        ...vault,
        settings: { ...vault.settings, pin }
      };
      saveVault(updated, false);
      setIsLocked(false);
      showToast(pin ? 'PIN lock enabled' : 'PIN lock removed');
    },
    [vault, saveVault, showToast]
  );

  const updateOpeningBalance = useCallback(
    (account: AccountType, amount: number) => {
      const updated = {
        ...vault,
        opening: { ...vault.opening, [account]: round3(amount) }
      };
      saveVault(updated);
      showToast(`Starting balance updated`);
    },
    [vault, saveVault, showToast]
  );

  const resetVault = useCallback(() => {
    const blank = createBlankVault();
    saveVault(blank);
    showToast('Vault erased and reset');
  }, [saveVault, showToast]);

  const importVault = useCallback(
    (newVault: VaultData) => {
      saveVault(newVault);
      showToast('Vault restored successfully');
    },
    [saveVault, showToast]
  );

  return {
    vault,
    activeView,
    setActiveView,
    selectedDate,
    setSelectedDate,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    searchQuery,
    setSearchQuery,
    minAmt,
    setMinAmt,
    maxAmt,
    setMaxAmt,
    stealth,
    toggleStealth,
    isLocked,
    setIsLocked,
    balances,
    toastMessage,
    showToast,
    money,
    num,
    currency,
    decimals,
    // Transactions
    addTransaction,
    updateTransaction,
    deleteTransaction,
    // Subscriptions
    addSubscription,
    updateSubscription,
    deleteSubscription,
    logSubscriptionPayment,
    // Debts
    addDebtLine,
    deleteDebtLine,
    deletePerson,
    // Goals
    addGoal,
    updateGoalAllocation,
    deleteGoal,
    // Budgets
    setMonthlyBudget,
    // Presets
    addPreset,
    deletePreset,
    applyPreset,
    // Categories
    addCategory,
    deleteCategory,
    // Settings
    setTheme,
    cycleTheme,
    setCurrency,
    setDecimals,
    setPin,
    updateOpeningBalance,
    resetVault,
    importVault
  };
}
