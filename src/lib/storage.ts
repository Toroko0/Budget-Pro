import { VaultData, AccountType, Transaction } from '../types';

export const STORAGE_KEY = 'budget-pro-vault-v3';
const DB_NAME = 'BudgetProVaultDB';
const DB_VERSION = 2;
const STORE_NAME = 'vault';
const VAULT_RECORD_KEY = 'active_vault';

// Accurate financial calculations in milli-units to prevent IEEE-754 floating point issues
export const toMilli = (n: number | string): number => Math.round((Number(n) || 0) * 1000);
export const fromMilli = (m: number): number => m / 1000;
export const round3 = (n: number | string): number => Math.round((Number(n) || 0) * 1000) / 1000;
export const addMoney = (a: number | string, b: number | string): number => (toMilli(a) + toMilli(b)) / 1000;
export const subMoney = (a: number | string, b: number | string): number => (toMilli(a) - toMilli(b)) / 1000;

export const pad = (n: number): string => String(n).padStart(2, '0');
export const ymd = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = (): string => ymd(new Date());

export const shiftDay = (dateStr: string, deltaDays: number): string => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + deltaDays);
  return ymd(d);
};

export const shiftMonth = (monthStr: string, deltaMonths: number): string => {
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(y, m - 1 + deltaMonths, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

export const prettyDate = (dateStr: string): string => {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

export const prettyMonth = (monthStr: string): string => {
  const [y, m] = monthStr.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric'
  });
};

export const uid = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const formatRelativeTime = (iso: string | null): string => {
  if (!iso) return 'Vault ready';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'Saved just now';
  if (diff < 3600000) return `Saved ${Math.floor(diff / 60000)}m ago`;
  const d = new Date(iso);
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (ymd(d) === today()) return `Saved today ${timeStr}`;
  return `Saved ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${timeStr}`;
};

export const formatFullDate = (iso: string | null): string => {
  if (!iso) return 'No modifications recorded';
  const d = new Date(iso);
  return d.toLocaleString([], {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export function createBlankVault(): VaultData {
  return {
    opening: { cash: 0, benefit: 0, savings: 0 },
    categories: {
      expense: [
        { name: 'Food & Dining', icon: '🍔', limit: 0 },
        { name: 'Groceries', icon: '🛒', limit: 0 },
        { name: 'Shopping', icon: '🛍️', limit: 0 },
        { name: 'Transport & Fuel', icon: '🚗', limit: 0 },
        { name: 'Bills & Utilities', icon: '📄', limit: 0 },
        { name: 'Subscriptions', icon: '📱', limit: 0 },
        { name: 'Health & Wellness', icon: '💊', limit: 0 },
        { name: 'Other', icon: '📦', limit: 0 }
      ],
      income: [
        { name: 'Salary / Allowance', icon: '💰', limit: 0 },
        { name: 'Freelance & Side', icon: '💻', limit: 0 },
        { name: 'Gift & Reward', icon: '🎁', limit: 0 },
        { name: 'Other Income', icon: '💵', limit: 0 }
      ]
    },
    tx: [],
    people: [],
    budgets: {},
    goals: [
      { id: uid(), name: 'Emergency Reserve', target: 500, allocated: 0 },
      { id: uid(), name: 'Travel & Vacation', target: 300, allocated: 0 }
    ],
    presets: [
      { id: uid(), name: '☕ Coffee', amount: 0.500, kind: 'expense', category: 'Food & Dining', account: 'cash' },
      { id: uid(), name: '⛽ Fuel', amount: 5.000, kind: 'expense', category: 'Transport & Fuel', account: 'benefit' },
      { id: uid(), name: '🥪 Lunch Meal', amount: 1.500, kind: 'expense', category: 'Food & Dining', account: 'cash' },
      { id: uid(), name: '🛒 Supermarket', amount: 10.000, kind: 'expense', category: 'Groceries', account: 'benefit' }
    ],
    subscriptions: [
      {
        id: uid(),
        name: 'Internet & Fiber',
        amount: 15.000,
        cadence: 'monthly',
        category: 'Bills & Utilities',
        account: 'benefit',
        dueDay: 1,
        nextDueDate: `${today().slice(0, 7)}-01`,
        note: 'Home high-speed broadband'
      },
      {
        id: uid(),
        name: 'Streaming Service',
        amount: 4.500,
        cadence: 'monthly',
        category: 'Subscriptions',
        account: 'benefit',
        dueDay: 15,
        nextDueDate: `${today().slice(0, 7)}-15`,
        note: 'Entertainment family plan'
      }
    ],
    settings: {
      theme: 'teal',
      stealth: false,
      currency: 'BHD',
      decimals: 3,
      pin: null
    },
    lastExport: null,
    lastModified: new Date().toISOString()
  };
}

// ------------------------------------------
// IndexedDB Vault Storage Engine
// ------------------------------------------
function openVaultDB(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openVaultDB();
    if (!db) return null;
    return new Promise(resolve => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function idbSet<T>(key: string, value: T): Promise<boolean> {
  try {
    const db = await openVaultDB();
    if (!db) return false;
    return new Promise(resolve => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export function loadSyncVault(): VaultData {
  if (typeof window === 'undefined') return createBlankVault();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.tx)) {
        return {
          ...createBlankVault(),
          ...parsed,
          settings: { ...createBlankVault().settings, ...(parsed.settings || {}) },
          subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : createBlankVault().subscriptions
        };
      }
    }
  } catch {
    // fallback
  }
  return createBlankVault();
}

export async function persistVault(vault: VaultData, touchTime = true): Promise<void> {
  if (touchTime) {
    vault.lastModified = new Date().toISOString();
  }
  // 1. Write to IndexedDB
  await idbSet(VAULT_RECORD_KEY, vault);

  // 2. Mirror to LocalStorage for instant sync reads
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vault));
  } catch (err) {
    console.warn('LocalStorage limit reached; vault safely preserved in IndexedDB.', err);
  }
}

export async function getPersistedVault(): Promise<VaultData | null> {
  const fromDb = await idbGet<VaultData>(VAULT_RECORD_KEY);
  if (fromDb && Array.isArray(fromDb.tx)) {
    return {
      ...createBlankVault(),
      ...fromDb,
      settings: { ...createBlankVault().settings, ...(fromDb.settings || {}) },
      subscriptions: Array.isArray(fromDb.subscriptions) ? fromDb.subscriptions : createBlankVault().subscriptions
    };
  }
  return null;
}

// ------------------------------------------
// Balance Calculator
// ------------------------------------------
export function calculateBalancesAt(transactions: Transaction[], opening: Record<AccountType, number>, date: string): Record<AccountType, number> {
  const b = {
    cash: toMilli(opening.cash),
    benefit: toMilli(opening.benefit),
    savings: toMilli(opening.savings)
  };

  for (const t of transactions) {
    if (t.date > date) continue;
    const amt = toMilli(t.amount);
    if (t.kind === 'expense' && t.account) {
      b[t.account] -= amt;
    } else if (t.kind === 'income' && t.account) {
      b[t.account] += amt;
    } else if (t.kind === 'move' && t.from && t.to) {
      b[t.from] -= amt;
      b[t.to] += amt;
    }
  }

  return {
    cash: fromMilli(b.cash),
    benefit: fromMilli(b.benefit),
    savings: fromMilli(b.savings)
  };
}

// ------------------------------------------
// Offscreen Canvas Image Compressor
// ------------------------------------------
export function compressImageFile(file: File, maxDimension = 1200, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Image decode failed'));
      img.src = ev.target?.result as string;
    };
    reader.onerror = () => reject(new Error('File reading failed'));
    reader.readAsDataURL(file);
  });
}
