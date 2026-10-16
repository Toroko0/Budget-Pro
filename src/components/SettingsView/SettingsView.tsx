import React, { useState, useRef } from 'react';
import {
  ShieldCheck,
  Download,
  Share2,
  FolderOpen,
  FileSpreadsheet,
  AlertTriangle,
  Smartphone,
  Lock,
  Unlock,
  Coins,
  Palette,
  Layers,
  Plus,
  Trash2,
  Check,
  ExternalLink,
  Copy,
  Terminal,
  Monitor
} from 'lucide-react';
import { VaultData, AccountType, ThemeName, Category, Preset } from '../../types';
import { formatFullDate, today, uid, round3 } from '../../lib/storage';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface SettingsViewProps {
  vault: VaultData;
  onThemeChange: (th: ThemeName) => void;
  onCurrencyChange: (c: string) => void;
  onDecimalsChange: (d: number) => void;
  onSetPin: (pin: string | null) => void;
  onUpdateOpeningBalance: (acc: AccountType, amt: number) => void;
  onAddCategory: (kind: 'expense' | 'income', cat: Category) => void;
  onDeleteCategory: (kind: 'expense' | 'income', idx: number) => void;
  onAddPreset: (p: Omit<Preset, 'id'>) => void;
  onDeletePreset: (id: string) => void;
  onResetVault: () => void;
  onImportVault: (newVault: VaultData) => void;
  showToast: (msg: string) => void;
  money: (val: number | string) => string;
  num: (val: number | string) => string;
}

const CATEGORY_ICONS = ['🍔', '🛒', '🛍️', '🚗', '📄', '🎁', '💰', '🏠', '💊', '🎓', '📦', '💵', '⚡', '☕', '🎮', '👕', '✈️', '🎉', '🏋️', '📱'];
const CURRENCIES = ['BHD', 'USD', 'EUR', 'GBP', 'SAR', 'AED', 'KWD'];
const THEMES: ThemeName[] = ['teal', 'dark', 'midnight', 'emerald', 'sunset'];

export const SettingsView: React.FC<SettingsViewProps> = ({
  vault,
  onThemeChange,
  onCurrencyChange,
  onDecimalsChange,
  onSetPin,
  onUpdateOpeningBalance,
  onAddCategory,
  onDeleteCategory,
  onAddPreset,
  onDeletePreset,
  onResetVault,
  onImportVault,
  showToast,
  money,
  num
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Category form
  const [catKind, setCatKind] = useState<'expense' | 'income'>('expense');
  const [catName, setCatName] = useState('');
  const [catLimit, setCatLimit] = useState('');
  const [catIcon, setCatIcon] = useState('📦');

  // New Preset form
  const [presetName, setPresetName] = useState('');
  const [presetAmount, setPresetAmount] = useState('');

  // PIN modal
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [newPin, setNewPin] = useState('');

  // iOS Guide modal
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Reset confirmation modal
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Standalone Packaging Hub tab
  const [packagingTab, setPackagingTab] = useState<'pwabuilder' | 'electron' | 'capacitor'>('pwabuilder');

  const receiptCount = vault.tx.filter(t => !!t.receipt).length;

  // Save vault to file (.json)
  const handleSaveVaultFile = async () => {
    const jsonContent = JSON.stringify(vault, null, 2);
    const fileName = `budget-pro-vault-${today()}.json`;

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as unknown as {
          showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle>;
        }).showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: 'Budget Pro Vault File (*.json)',
              accept: { 'application/json': ['.json'] }
            }
          ]
        });
        const writable = await handle.createWritable();
        await writable.write(jsonContent);
        await writable.close();
        showToast('Vault file saved to disk');
        return;
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') return;
      }
    }

    // Fallback download
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    showToast('Vault file downloaded');
  };

  // Share vault via Web Share API
  const handleShareVault = async () => {
    const jsonContent = JSON.stringify(vault, null, 2);
    const fileName = `budget-pro-vault-${today()}.json`;
    const file = new File([jsonContent], fileName, { type: 'application/json' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Budget Pro Vault Backup',
          text: `Budget Pro Vault data file (${vault.tx.length} transactions)`
        });
        showToast('Vault backup shared');
        return;
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') return;
      }
    }
    handleSaveVaultFile();
  };

  // Import JSON file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.tx) || !parsed.opening || !parsed.categories) {
        throw new Error('Invalid format');
      }
      onImportVault(parsed);
    } catch {
      showToast('Invalid Budget Pro vault JSON file');
    }
    e.target.value = '';
  };

  // Export CSV
  const handleExportCSV = () => {
    let csv = 'ID,Date,Kind,Category,Account,From,To,Amount,Note,HasReceipt\n';
    for (const t of vault.tx) {
      const hasR = t.receipt ? 'Yes' : 'No';
      const cleanNote = (t.note || '').replace(/"/g, '""');
      csv += `"${t.id}","${t.date}","${t.kind}","${t.category || ''}","${t.account || ''}","${
        t.from || ''
      }","${t.to || ''}","${t.amount}","${cleanNote}","${hasR}"\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-ledger-${today()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    showToast('CSV ledger exported');
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    onAddCategory(catKind, {
      name: catName.trim(),
      icon: catIcon,
      limit: parseFloat(catLimit) || 0
    });
    setCatName('');
    setCatLimit('');
  };

  const handleCreatePreset = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(presetAmount);
    if (!presetName.trim() || isNaN(parsed) || parsed <= 0) return;
    onAddPreset({
      name: presetName.trim(),
      amount: round3(parsed),
      kind: 'expense',
      category: vault.categories.expense[0]?.name || 'Food & Dining',
      account: 'cash'
    });
    setPresetName('');
    setPresetAmount('');
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin && !/^\d{4}$/.test(newPin.trim())) {
      showToast('PIN must be exactly 4 digits');
      return;
    }
    onSetPin(newPin.trim() || null);
    setIsPinModalOpen(false);
    setNewPin('');
  };

  return (
    <div className="space-y-4">
      {/* Vault Status Card */}
      <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--ink)]">Local-First Vault Storage</h3>
              <p className="text-xs text-[var(--muted)]">100% on device · Zero cloud servers</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div className="p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)]">
            <span className="text-[var(--muted)] block">Vault Records</span>
            <span className="font-semibold text-[var(--ink)] block mt-0.5">
              {vault.tx.length} transactions · {receiptCount} receipts
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)]">
            <span className="text-[var(--muted)] block">Last Synchronized</span>
            <span className="font-semibold text-[var(--ink)] block mt-0.5 truncate">
              {formatFullDate(vault.lastModified)}
            </span>
          </div>
        </div>

        {/* Vault Actions */}
        <div className="space-y-2 pt-2">
          <button
            onClick={handleShareVault}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Share2 className="w-4 h-4" />
            <span>Share / Send Vault Backup (.json)</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSaveVaultFile}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] hover:border-teal-500/40 text-xs font-medium text-[var(--ink)] transition"
            >
              <Download className="w-3.5 h-3.5 text-teal-600" />
              <span>Save to Disk</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] hover:border-teal-500/40 text-xs font-medium text-[var(--ink)] transition"
            >
              <FolderOpen className="w-3.5 h-3.5 text-teal-600" />
              <span>Open Vault File</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="application/json,.json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <button
            onClick={handleExportCSV}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-[var(--line)] text-xs text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Spreadsheet Ledger (CSV)</span>
          </button>
        </div>
      </div>

      {/* Standalone Android APK & Desktop .exe Packaging Hub */}
      <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-teal-600">
              <Smartphone className="w-4 h-4" />
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--ink)]">
                Standalone Android APK & Desktop (.exe) Hub
              </h3>
              <p className="text-xs text-[var(--muted)]">Package as native mobile & desktop binaries</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400">
            Ready to Package
          </span>
        </div>

        {/* Packaging Options Tabs */}
        <div className="flex p-1 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-semibold gap-1">
          <button
            type="button"
            onClick={() => setPackagingTab('pwabuilder')}
            className={`flex-1 py-1.5 rounded-lg transition ${
              packagingTab === 'pwabuilder'
                ? 'bg-[var(--card)] text-[var(--ink)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            Instant APK & Store
          </button>
          <button
            type="button"
            onClick={() => setPackagingTab('electron')}
            className={`flex-1 py-1.5 rounded-lg transition ${
              packagingTab === 'electron'
                ? 'bg-[var(--card)] text-[var(--ink)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            Windows (.exe)
          </button>
          <button
            type="button"
            onClick={() => setPackagingTab('capacitor')}
            className={`flex-1 py-1.5 rounded-lg transition ${
              packagingTab === 'capacitor'
                ? 'bg-[var(--card)] text-[var(--ink)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            Android (Capacitor)
          </button>
        </div>

        {/* Tab 1: PWABuilder & Cloud APK */}
        {packagingTab === 'pwabuilder' && (
          <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--line)] space-y-3 text-xs">
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300">
              <span className="font-bold block mb-1">Why did PWABuilder show an error for the AI Studio URL?</span>
              <p className="text-[11px] leading-relaxed">
                Google AI Studio preview URLs are private workspaces protected by Google authentication checks (<code className="font-mono">__cookie_check.html</code>). When PWABuilder's automated bot crawls the URL, Google blocks the bot with a login redirect, preventing it from reading your manifest.
              </p>
            </div>

            <p className="text-[var(--muted)] leading-relaxed">
              <strong>Quick 2-Step Solution (Free &amp; No Account Needed):</strong>
            </p>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                <span>Download the self-contained production bundle below:</span>
              </div>
              <a
                href="/budget-pro-web-bundle.zip"
                download="budget-pro-web-bundle.zip"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-xs transition"
              >
                <Download className="w-4 h-4" />
                <span>📥 Download Web Bundle (ZIP)</span>
              </a>

              <div className="flex items-center gap-2 pt-1">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                <span>Drag the ZIP onto Netlify Drop (or Vercel / GitHub Pages) to get a public URL:</span>
              </div>
              <div className="flex gap-2">
                <a
                  href="https://app.netlify.com/drop"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-[var(--line)] bg-[var(--card)] hover:border-teal-500 text-[var(--ink)] font-semibold transition"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-teal-600" />
                  <span>Open Netlify Drop ↗</span>
                </a>
                <a
                  href="https://www.pwabuilder.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-[var(--line)] bg-[var(--card)] hover:border-teal-500 text-[var(--ink)] font-semibold transition"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-teal-600" />
                  <span>Open PWABuilder ↗</span>
                </a>
              </div>
            </div>
            <p className="text-[11px] text-[var(--muted)] italic pt-1">
              Once dropped, paste your new public URL into PWABuilder. It will score 100% and generate your signed Android APK immediately!
            </p>
          </div>
        )}

        {/* Tab 2: Windows Desktop (.exe) via Electron */}
        {packagingTab === 'electron' && (
          <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--line)] space-y-2.5 text-xs">
            <p className="text-[var(--muted)] leading-relaxed">
              Your codebase includes ready-to-run Electron configuration files (<code className="text-teal-600">electron/main.cjs</code> and <code className="text-teal-600">electron-builder.yml</code>) to compile an authentic Windows <code className="font-bold">.exe</code> installer and portable binary.
            </p>
            <div className="p-2.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] space-y-1 select-all overflow-x-auto">
              <div className="text-slate-400"># 1. Install Electron packaging tools</div>
              <div>npm install -D electron electron-builder</div>
              <div className="text-slate-400 mt-1"># 2. Compile standalone Windows .exe</div>
              <div>npm run build:electron</div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
              <Terminal className="w-3.5 h-3.5 text-teal-600" />
              <span>Creates installer and portable .exe in the <code className="font-semibold">release/</code> folder.</span>
            </div>
          </div>
        )}

        {/* Tab 3: Local Android APK via Capacitor */}
        {packagingTab === 'capacitor' && (
          <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--line)] space-y-2.5 text-xs">
            <p className="text-[var(--muted)] leading-relaxed">
              Compile Budget Pro into a native Android Studio project using Capacitor (<code className="text-teal-600">capacitor.config.json</code> is pre-configured).
            </p>
            <div className="p-2.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] space-y-1 select-all overflow-x-auto">
              <div className="text-slate-400"># 1. Install Capacitor Android tools</div>
              <div>npm install @capacitor/core @capacitor/cli @capacitor/android</div>
              <div className="text-slate-400 mt-1"># 2. Generate native Android Studio project</div>
              <div>npx cap add android</div>
              <div className="text-slate-400 mt-1"># 3. Synchronize & open in Android Studio</div>
              <div>npm run build:apk</div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
              <Terminal className="w-3.5 h-3.5 text-teal-600" />
              <span>Build APK in Android Studio via <code className="font-semibold">Build &gt; Build APK(s)</code>.</span>
            </div>
          </div>
        )}

        {/* Direct In-App Browser PWA Install fallback */}
        <div className="pt-2 border-t border-[var(--line)] flex items-center justify-between text-xs">
          <span className="text-[var(--muted)]">
            {isInstalled ? '✓ Running in standalone mode' : 'Direct Home Screen / Desktop Dock Install'}
          </span>
          {isInstallable && !isInstalled && (
            <button
              onClick={install}
              className="px-3 py-1.5 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 transition"
            >
              Install in Browser
            </button>
          )}
          {isIOS && !isInstalled && (
            <button
              onClick={() => setShowIOSGuide(true)}
              className="px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--bg)] font-semibold text-[var(--ink)]"
            >
              iOS Safari Instructions
            </button>
          )}
        </div>
      </div>

      {/* Security & PIN Lock */}
      <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-teal-600" />
            <h3 className="font-bold text-sm text-[var(--ink)]">PIN Lock Protection</h3>
          </div>
          <span className="text-xs font-semibold text-[var(--muted)]">
            {vault.settings.pin ? '🔒 Active' : '🔓 Disabled'}
          </span>
        </div>
        <p className="text-xs text-[var(--muted)]">
          Lock the app with a 4-digit PIN whenever switching away or closing the browser.
        </p>
        <button
          onClick={() => {
            setNewPin(vault.settings.pin || '');
            setIsPinModalOpen(true);
          }}
          className="w-full py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-semibold text-[var(--ink)] hover:border-teal-500/40 transition"
        >
          {vault.settings.pin ? 'Change or Disable PIN' : 'Enable 4-Digit PIN Lock'}
        </button>
      </div>

      {/* Currency & Formatting */}
      <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-[var(--ink)] flex items-center gap-2">
          <Coins className="w-4 h-4 text-teal-600" />
          <span>Currency & Formatting</span>
        </h3>

        <div>
          <label className="block text-xs text-[var(--muted)] mb-1.5">Currency Symbol / Code</label>
          <div className="flex flex-wrap gap-1.5">
            {CURRENCIES.map(curr => (
              <button
                key={curr}
                onClick={() => onCurrencyChange(curr)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  vault.settings.currency === curr
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)] hover:border-teal-500/30'
                }`}
              >
                {curr}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-[var(--muted)] mb-1.5">Decimal Precision</label>
          <div className="flex gap-2">
            {[2, 3].map(d => (
              <button
                key={d}
                onClick={() => onDecimalsChange(d)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  (vault.settings.decimals ?? 3) === d
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)]'
                }`}
              >
                {d} Decimals (e.g. {d === 3 ? '0.000' : '0.00'})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Visual Theme */}
      <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-[var(--ink)] flex items-center gap-2">
          <Palette className="w-4 h-4 text-teal-600" />
          <span>Visual Theme Palette</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {THEMES.map(th => (
            <button
              key={th}
              onClick={() => onThemeChange(th)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold capitalize transition ${
                vault.settings.theme === th
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)]'
              }`}
            >
              {th}
            </button>
          ))}
        </div>
      </div>

      {/* Starting Balances */}
      <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-[var(--ink)]">Starting Account Balances</h3>
        <p className="text-xs text-[var(--muted)]">
          Initial balances before tracking began. All ledger transactions build on top of these.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(['cash', 'benefit', 'savings'] as AccountType[]).map(acc => (
            <div key={acc}>
              <label className="block text-xs text-[var(--muted)] capitalize mb-1">{acc}</label>
              <input
                type="number"
                step="0.001"
                value={vault.opening[acc]}
                onChange={e => onUpdateOpeningBalance(acc, parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 text-xs font-mono-numbers rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)]"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Custom Categories & Limits */}
      <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-[var(--ink)]">Categories & Limits</h3>

        <div className="space-y-2">
          <span className="text-xs font-semibold text-[var(--muted)] block">Spending Categories</span>
          <div className="space-y-1.5">
            {vault.categories.expense.map((c, i) => (
              <div
                key={c.name}
                className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs"
              >
                <span>
                  {c.icon} {c.name} {c.limit > 0 ? `(Limit: ${money(c.limit)})` : ''}
                </span>
                <button
                  onClick={() => onDeleteCategory('expense', i)}
                  className="p-1 text-[var(--muted)] hover:text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Add Category Form */}
        <form onSubmit={handleCreateCategory} className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--line)] space-y-2 text-xs">
          <span className="font-semibold text-[var(--ink)] block">Add Custom Category</span>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={catKind}
              onChange={e => setCatKind(e.target.value as 'expense' | 'income')}
              className="px-2 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--line)] text-[var(--ink)]"
            >
              <option value="expense">Spending</option>
              <option value="income">Income</option>
            </select>
            <select
              value={catIcon}
              onChange={e => setCatIcon(e.target.value)}
              className="px-2 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--line)] text-[var(--ink)]"
            >
              {CATEGORY_ICONS.map(ic => (
                <option key={ic} value={ic}>
                  {ic}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              required
              placeholder="Name"
              value={catName}
              onChange={e => setCatName(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--line)] text-[var(--ink)]"
            />
            <input
              type="number"
              step="0.001"
              placeholder="Monthly Limit"
              value={catLimit}
              onChange={e => setCatLimit(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--line)] text-[var(--ink)]"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700"
          >
            Add Category
          </button>
        </form>
      </div>

      {/* Quick-Add Presets Manager */}
      <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-[var(--ink)]">Quick-Add Presets</h3>
        <div className="space-y-1.5">
          {vault.presets.map(p => (
            <div
              key={p.id}
              className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs"
            >
              <span className="font-medium text-[var(--ink)]">
                {p.name} ({num(p.amount)})
              </span>
              <button
                onClick={() => onDeletePreset(p.id)}
                className="p-1 text-[var(--muted)] hover:text-red-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={handleCreatePreset} className="flex gap-2">
          <input
            type="text"
            required
            placeholder="Preset Name (e.g. ☕ Coffee)"
            value={presetName}
            onChange={e => setPresetName(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)]"
          />
          <input
            type="number"
            step="0.001"
            min="0"
            required
            placeholder="Amount"
            value={presetAmount}
            onChange={e => setPresetAmount(e.target.value)}
            className="w-24 px-3 py-1.5 text-xs font-mono-numbers rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)]"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700"
          >
            Add
          </button>
        </form>
      </div>

      {/* Danger Zone: Erase Data */}
      <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-4 h-4" />
          <h3 className="font-bold text-sm">Danger Zone</h3>
        </div>
        <p className="text-xs text-[var(--muted)]">
          Erasing all data resets your local IndexedDB and LocalStorage vault to an empty state. Make sure to download a backup file first.
        </p>
        <button
          onClick={() => setIsResetConfirmOpen(true)}
          className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition"
        >
          Erase All Local Data (Reset Vault)
        </button>
      </div>

      {/* PIN Setup Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-xs rounded-2xl bg-[var(--card)] border border-[var(--line)] p-5 shadow-xl">
            <h3 className="font-bold text-sm text-[var(--ink)] mb-2">Set 4-Digit Security PIN</h3>
            <p className="text-xs text-[var(--muted)] mb-3">
              Leave blank to remove the PIN lock.
            </p>
            <form onSubmit={handleSavePin} className="space-y-3">
              <input
                type="password"
                maxLength={4}
                autoFocus
                placeholder="4-digit PIN (e.g. 1234)"
                value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full px-3 py-2 text-center text-lg font-mono-numbers rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)] tracking-widest"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-[var(--line)] text-xs text-[var(--muted)] hover:text-[var(--ink)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700"
                >
                  Save PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--card)] border border-[var(--line)] p-5 shadow-xl space-y-3">
            <h3 className="font-bold text-base text-red-600">Erase All Vault Data?</h3>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              This action cannot be undone. All transactions, recurring bills, debts, and custom categories stored in this browser will be permanently deleted.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--line)] text-xs font-semibold text-[var(--muted)]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsResetConfirmOpen(false);
                  onResetVault();
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
              >
                Yes, Erase Everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--card)] border border-[var(--line)] p-5 shadow-xl space-y-3">
            <h3 className="font-bold text-sm text-[var(--ink)]">Install on iPhone / iPad</h3>
            <ol className="text-xs text-[var(--muted)] space-y-2 list-decimal list-inside leading-relaxed">
              <li>Tap the <strong>Share</strong> button (square with arrow ⎋) in Safari.</li>
              <li>Scroll down and tap <strong>Add to Home Screen ➕</strong>.</li>
              <li>Tap <strong>Add</strong> in the top-right corner.</li>
            </ol>
            <p className="text-[11px] text-[var(--muted)]">
              Budget Pro will launch as a full-screen, offline-capable app directly from your home screen.
            </p>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
