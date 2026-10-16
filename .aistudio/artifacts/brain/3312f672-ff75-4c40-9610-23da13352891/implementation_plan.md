# Budget Pro — Local-First Personal Finance & Vault Application

A private, offline-first personal finance platform and Obsidian-style vault engineered with React 19, TypeScript, Tailwind CSS, and standard PWA compliance. It provides complete financial tracking—daily ledgers, interactive budget pacing, annual cash flow matrices, debt management, savings goal buckets, and recurring bill reminders—with zero cloud server requirements and total local data ownership.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Summary of Confirmed Choices & Product Directives:**
> - **Form Factor & Responsive Architecture**: Adaptive responsive layout featuring an ergonomic collapsible sidebar and multi-column dashboard on desktop (1440px+), transitioning seamlessly to a native-feeling mobile experience with thumb-zone bottom navigation and gesture sheets on Android and iOS.
> - **New Key Feature — Subscriptions & Recurring Bills Tracker**: Integrated recurring expense scheduler for utility bills, SaaS subscriptions, rent, and loan payments with frequency rules (monthly, weekly, annual), upcoming due date countdowns, status alerts, and one-tap ledger logging.
> - **Visual Analytics & Data Dashboards**: Interactive SVG and visual charts for category spending distributions, cash vs. benefit flow trajectories, and automated daily spending pace curves.
> - **Zero-Cloud Local Vault Engine**: Unified IndexedDB and LocalStorage persistence with JSON vault import/export, Web Share API support, File System Access API integration, CSV spreadsheet exports, and optional 4-digit privacy PIN protection.

---

### 1. Overview & Core Concept

- **What It Does**: Budget Pro turns personal budgeting into an autonomous, encrypted-feeling local experience. Users track income, expenses, and inter-account transfers across multiple balances (Cash, Benefit, Savings), track debts with individuals, allocate money to goal buckets, forecast recurring expenses, and visualize spending pacing without their financial data ever leaving their device.
- **Target Audience / Persona**: Privacy-conscious individuals, freelancers, and household budgeters seeking an intuitive, offline financial ledger that matches the speed and ownership model of tools like Obsidian.
- **Key Value**: 100% offline functionality, instantaneous data mutations, complete privacy, zero account sign-up friction, and native installability on Android, iOS, and Desktop.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Daily Tracking & Quick Presets**: The user opens the app to their live account balances (Cash, Benefit, Savings) and today's ledger. They can tap one-click preset buttons (e.g., Coffee, Fuel, Groceries) for instant logging, search transactions with live tag/amount filters, or tap the action button to open an entry sheet with optional compressed receipt photo capture.
2. **Monthly Budget Pacing & Mini-Calendar**: The user reviews their monthly spending allowance. An automated pace indicator calculates exact remaining daily budget allowances based on days remaining in the month. An interactive calendar grid highlights active spending days and allows instant navigation to any day's transactions.
3. **Subscriptions & Recurring Bills Management**: A dedicated management view displays active subscriptions and recurring obligations with due dates, payment cycles, and one-tap "Mark as Paid" actions that automatically record the entry into the daily ledger.
4. **Yearly Flow & Balance Projections**: A 12-month comparison table and net flow visualizer that lets users step through annual trends, comparing inflows and outflows between cash and benefit accounts.
5. **Debt & Loan Tracking**: Tracks money lent out or borrowed per person, tracks payment deadlines with overdue warning badges, and calculates real-time settlement status.
6. **Savings Buckets**: Allocates portions of total savings into specific goal targets (e.g., Emergency Fund, New Laptop) with visual progress gauges.
7. **Vault Operations & Settings**: Theme switching across 5 palettes (Teal, Dark Slate, Midnight, Emerald, Sunset), stealth privacy balance masking (`***.***`), currency customization with flexible decimal precisions, PIN lock security, and one-click JSON vault backup/restore.

#### Visual Identity & Theme
- **Aesthetic Direction**: High-utility fintech dashboard with calm editorial restraint, subtle hairline borders, and tactile touch-friendly components.
- **Color Palettes**:
  - *Teal (Default)*: Calming oceanic teal accents (`#4F9BB0`) on warm light slate canvas (`#EEF6F5`).
  - *Dark Slate*: Deep charcoal surfaces (`#1A2222`) with mint emerald accents (`#34D399`).
  - *Midnight*: High-contrast navy slate (`#0F172A`) with sapphire blue accents (`#38BDF8`).
  - *Emerald*: Botanical mint (`#ECFDF5`) with deep forest accents (`#059669`).
  - *Sunset*: Warm sandstone (`#FFF7ED`) with vibrant tangerine accents (`#F97316`).
- **Typography & Hierarchy**: Clean display type for financial headers paired with strict tabular figures (`tabular-nums font-mono`) for all monetary values, percentages, and dates to ensure vertical alignment without jitter.
- **Component Styling & Layout**:
  - **Desktop (1024px+)**: Fixed left navigation sidebar (260px) with active indicator, header with vault synchronization status and quick tools, and a 2-column or 3-column responsive dashboard.
  - **Mobile (<1024px)**: Native-feeling 52px top bar, thumb-zone bottom navigation bar, floating action trigger, and smooth spring-based bottom sheets.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual-Layer Persistence (IndexedDB + LocalStorage)**
  - *Chosen Approach*: Store the primary vault in IndexedDB with an automated LocalStorage fallback mirror, coupled with browser `navigator.storage.persist()` requests.
  - *Why*: Accommodates large historical ledgers and compressed receipt images without hitting LocalStorage's 5MB quota limit, while maintaining fast synchronous startup.
  - *Alternatives Considered*: SQLite in WebAssembly was considered, but pure IndexedDB provides superior mobile web worker compatibility and zero heavy binary bundle overhead.

- **Decision 2: Adaptive Navigation (Sidebar vs. Bottom Tab Bar)**
  - *Chosen Approach*: Dynamic responsive layout rendering a full sidebar on desktop and a fixed ergonomic bottom bar on mobile viewports.
  - *Why*: Prevents mobile-app viewport squishing on wide 1440px monitors while ensuring effortless one-thumb navigation on Android phones.
  - *Alternatives Considered*: Hamburger drawer on desktop was rejected because large screens have ample horizontal space for immediate visual access.

- **Decision 3: In-App PWA Install Engine & Offline Service Worker**
  - *Chosen Approach*: Automatic service worker precaching of all core application bundles and manifest assets, paired with a custom `usePWAInstall` hook that captures `beforeinstallprompt` on Android/Chromium and presents custom step-by-step guidance on iOS Safari.
  - *Why*: Delivers an authentic native app installation experience without requiring Google Play Store or App Store distribution.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Budget Pro Client                             │
├────────────────────────────────────────────────────────────────────────┤
│  Responsive Viewport Framework (Tailwind CSS + Lucide + Motion)        │
│  ┌───────────────────────────┬──────────────────────────────────────┐  │
│  │ Desktop Sidebar (≥1024px) │ Main Content Viewport (Scrollable)   │  │
│  │ • Brand & Vault Status    │ • Day Ledger / Fast Presets          │  │
│  │ • 6 Primary View Links    │ • Month Dashboard & Budget Pace      │  │
│  │ • Stealth Mask Toggle     │ • Recurring Subscriptions & Bills    │  │
│  │ • Theme Switcher          │ • Annual Inflow/Outflow Breakdown    │  │
│  │ • In-App PWA Installer    │ • Debt Tracker & Loan Profiles       │  │
│  │                           │ • Savings Goal Buckets               │  │
│  │                           │ • Vault Management & Backup/Restore  │  │
│  ├───────────────────────────┴──────────────────────────────────────┤  │
│  │ Mobile Bottom Tab Bar (<1024px) & Floating Action Button (FAB)   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────┤
│  State & Reactive Domain Engine (`useVault` Store)                     │
│  ┌─────────────────┬─────────────────┬───────────────────────────────┐ │
│  │ Transactions    │ People & Debts  │ Subscriptions & Bills         │ │
│  │ Budgets & Goals │ Presets & Cats  │ Settings & PIN Lock           │ │
│  └─────────────────┴─────────────────┴───────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│  Persistence & Hardware Integration Layer                              │
│  ┌─────────────────┬─────────────────┬───────────────────────────────┐ │
│  │ IndexedDB Store │ LocalStorage    │ Service Worker Cache          │ │
│  │ (Active Vault)  │ (Sync Cache)    │ (Offline App Shell)           │ │
│  └─────────────────┴─────────────────┴───────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

#### Data Entities
- **Transaction**: `{ id, kind: 'expense'|'income'|'move', date, amount, note, account: 'cash'|'benefit'|'savings', from?, to?, category, tags, receipt? }`
- **Subscription / Recurring Bill**: `{ id, name, amount, category, account, cadence: 'monthly'|'weekly'|'yearly', dueDay: number, nextDueDate: string, autoLog: boolean, lastLoggedDate?: string }`
- **Person / Debt Profile**: `{ id, name, lines: [{ id, type: 'lent'|'borrowed'|'received'|'paid', amount, note, date, dueDate? }] }`
- **Savings Goal**: `{ id, name, target: number, allocated: number }`
- **Preset**: `{ id, name, amount: number, kind: 'expense'|'income', category: string, account: 'cash'|'benefit' }`
- **Settings**: `{ theme, stealth: boolean, currency: string, decimals: number, pin: string | null }`

#### Implementation Steps
1. **Manifest & Service Worker Assets**: Create compliant web app manifest with standalone display, maskable and standard icons, and offline caching service worker.
2. **Core Data & Storage Engine**: Modernize the vault logic into TypeScript models with robust financial calculations (milli-unit integer precision to eradicate float drift) and IndexedDB persistence.
3. **Adaptive Shell & Navigation**: Construct the responsive layout with desktop sidebar, mobile top bar, mobile bottom bar, and in-app PWA install prompts.
4. **Views & Visual Analytics**:
   - Day view with live account balances, quick-presets scroller, receipt viewer modal, and tag filters.
   - Month view with budget pace computation, mini-calendar, and interactive visual category bars.
   - Recurring bills & subscriptions view with payment schedules, countdown tags, and one-tap logging.
   - Year view with annual flow charts and monthly comparison matrix.
   - Debt & savings goals views with progress tracking and settlement management.
   - Settings & vault manager with JSON export/import, CSV generator, PIN lock screen, and theme picker.
