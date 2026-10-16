export type AccountType = 'cash' | 'benefit' | 'savings';
export type TransactionKind = 'expense' | 'income' | 'move';

export interface Category {
  name: string;
  icon: string;
  limit: number;
}

export interface Transaction {
  id: string;
  kind: TransactionKind;
  date: string; // YYYY-MM-DD
  amount: number;
  note: string;
  account?: AccountType;
  from?: AccountType;
  to?: AccountType;
  category?: string;
  icon?: string;
  tags?: string;
  receipt?: string | null; // base64 compressed data URL
}

export type PersonLineType = 'lent' | 'borrowed' | 'received' | 'paid';

export interface PersonLine {
  id: string;
  type: PersonLineType;
  amount: number;
  note: string;
  date: string;
  dueDate?: string;
}

export interface Person {
  id: string;
  name: string;
  lines: PersonLine[];
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  allocated: number;
}

export interface Preset {
  id: string;
  name: string;
  amount: number;
  kind: 'expense' | 'income';
  category: string;
  account: 'cash' | 'benefit';
}

export type Cadence = 'monthly' | 'weekly' | 'yearly';

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  cadence: Cadence;
  category: string;
  account: 'cash' | 'benefit';
  dueDay: number; // 1-31 for monthly, 1-7 for weekly, or month-day
  nextDueDate: string; // YYYY-MM-DD
  note?: string;
  autoLog?: boolean;
  lastLoggedDate?: string;
}

export type ThemeName = 'teal' | 'dark' | 'midnight' | 'emerald' | 'sunset';

export interface VaultSettings {
  theme: ThemeName;
  stealth: boolean;
  currency: string;
  decimals: number;
  pin: string | null;
}

export interface VaultData {
  opening: Record<AccountType, number>;
  categories: {
    expense: Category[];
    income: Category[];
  };
  tx: Transaction[];
  people: Person[];
  budgets: Record<string, number>; // YYYY-MM -> budget limit
  goals: SavingsGoal[];
  presets: Preset[];
  subscriptions: Subscription[];
  settings: VaultSettings;
  lastExport: string | null;
  lastModified: string;
}

export type ActiveView = 'day' | 'month' | 'year' | 'recurring' | 'debt' | 'goals' | 'settings';
