import React, { useState, useEffect } from 'react';
import { Plus, ShieldAlert } from 'lucide-react';
import { useVault } from './hooks/useVault';
import { DesktopSidebar } from './components/Navigation/DesktopSidebar';
import { MobileHeader } from './components/Navigation/MobileHeader';
import { MobileBottomNav } from './components/Navigation/MobileBottomNav';
import { DayView } from './components/DayView/DayView';
import { MonthView } from './components/MonthView/MonthView';
import { RecurringView } from './components/RecurringView/RecurringView';
import { YearView } from './components/YearView/YearView';
import { DebtView } from './components/DebtView/DebtView';
import { GoalsView } from './components/GoalsView/GoalsView';
import { SettingsView } from './components/SettingsView/SettingsView';
import { TransactionModal } from './components/Modals/TransactionModal';
import { ReceiptViewerModal } from './components/Modals/ReceiptViewerModal';
import { PinLockOverlay } from './components/Security/PinLockOverlay';
import { Toast } from './components/UI/Toast';
import { Transaction } from './types';

export default function App() {
  const {
    vault,
    activeView,
    setActiveView,
    selectedDate,
    setSelectedDate,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    balances,
    stealth,
    toggleStealth,
    cycleTheme,
    setTheme,
    setCurrency,
    setDecimals,
    setPin,
    isLocked,
    setIsLocked,
    toastMessage,
    showToast,
    money,
    num,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    logSubscriptionPayment,
    addDebtLine,
    deleteDebtLine,
    deletePerson,
    addGoal,
    updateGoalAllocation,
    deleteGoal,
    setMonthlyBudget,
    addPreset,
    deletePreset,
    applyPreset,
    addCategory,
    deleteCategory,
    updateOpeningBalance,
    resetVault,
    importVault
  } = useVault();

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const [receiptModalSrc, setReceiptModalSrc] = useState<string | null>(null);
  const [receiptModalTx, setReceiptModalTx] = useState<Transaction | null>(null);

  // Auto-lock when tab or app loses focus if PIN configured
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && vault.settings.pin) {
        setIsLocked(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [vault.settings.pin, setIsLocked]);

  // Register offline service worker
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
          console.warn('Service worker registration failed:', err);
        });
      });
    }
  }, []);

  const handleOpenAddTx = () => {
    setEditingTx(null);
    setIsTxModalOpen(true);
  };

  const handleEditTx = (tx: Transaction) => {
    setEditingTx(tx);
    setIsTxModalOpen(true);
  };

  const handleSaveTx = (txData: Omit<Transaction, 'id'>, id?: string) => {
    if (id) {
      updateTransaction(id, txData);
    } else {
      addTransaction(txData);
    }
  };

  const handleViewReceipt = (receiptSrc: string, tx: Transaction) => {
    setReceiptModalSrc(receiptSrc);
    setReceiptModalTx(tx);
  };

  // Backup reminder if > 7 days since last export
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const showBackupReminder =
    !vault.lastExport || Date.now() - new Date(vault.lastExport).getTime() > sevenDays;

  return (
    <div className="min-h-screen flex bg-[var(--bg)] text-[var(--ink)]">
      {/* Desktop Left Sidebar */}
      <DesktopSidebar
        activeView={activeView}
        setActiveView={setActiveView}
        lastModified={vault.lastModified}
        stealth={stealth}
        toggleStealth={toggleStealth}
        cycleTheme={cycleTheme}
        currentTheme={vault.settings.theme}
        balances={balances}
        money={money}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <MobileHeader
          lastModified={vault.lastModified}
          stealth={stealth}
          toggleStealth={toggleStealth}
          cycleTheme={cycleTheme}
          currentTheme={vault.settings.theme}
        />

        {/* Scrollable Main Viewport */}
        <main className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-6 pb-24 lg:pb-8">
          {/* Backup Reminder Banner */}
          {showBackupReminder && activeView !== 'settings' && (
            <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Local-first reminder: Save a local vault backup (.json) to disk.</span>
              </div>
              <button
                onClick={() => setActiveView('settings')}
                className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-semibold text-[11px] shrink-0 hover:bg-amber-700"
              >
                Vault Settings
              </button>
            </div>
          )}

          {/* Active View Dispatcher */}
          {activeView === 'day' && (
            <DayView
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              balances={balances}
              transactions={vault.tx}
              presets={vault.presets}
              onApplyPreset={applyPreset}
              onOpenAddModal={handleOpenAddTx}
              onEditTransaction={handleEditTx}
              onDeleteTransaction={deleteTransaction}
              onViewReceipt={handleViewReceipt}
              money={money}
              num={num}
            />
          )}

          {activeView === 'month' && (
            <MonthView
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              selectedDate={selectedDate}
              onSelectDate={d => {
                setSelectedDate(d);
                setActiveView('day');
              }}
              transactions={vault.tx}
              categories={vault.categories.expense}
              opening={vault.opening}
              budgets={vault.budgets}
              onSetBudget={setMonthlyBudget}
              money={money}
              num={num}
            />
          )}

          {activeView === 'recurring' && (
            <RecurringView
              subscriptions={vault.subscriptions || []}
              categories={vault.categories.expense}
              onAddSubscription={addSubscription}
              onUpdateSubscription={updateSubscription}
              onDeleteSubscription={deleteSubscription}
              onLogPayment={logSubscriptionPayment}
              money={money}
              num={num}
            />
          )}

          {activeView === 'year' && (
            <YearView
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
              transactions={vault.tx}
              opening={vault.opening}
              onJumpToMonth={m => {
                setSelectedMonth(m);
                setActiveView('month');
              }}
              money={money}
              num={num}
            />
          )}

          {activeView === 'debt' && (
            <DebtView
              people={vault.people}
              onAddDebtLine={addDebtLine}
              onDeleteDebtLine={deleteDebtLine}
              onDeletePerson={deletePerson}
              money={money}
              num={num}
            />
          )}

          {activeView === 'goals' && (
            <GoalsView
              goals={vault.goals}
              savingsBalance={balances.savings}
              onAddGoal={addGoal}
              onUpdateAllocation={updateGoalAllocation}
              onDeleteGoal={deleteGoal}
              money={money}
              num={num}
            />
          )}

          {activeView === 'settings' && (
            <SettingsView
              vault={vault}
              onThemeChange={setTheme}
              onCurrencyChange={setCurrency}
              onDecimalsChange={setDecimals}
              onSetPin={setPin}
              onUpdateOpeningBalance={updateOpeningBalance}
              onAddCategory={addCategory}
              onDeleteCategory={deleteCategory}
              onAddPreset={addPreset}
              onDeletePreset={deletePreset}
              onResetVault={resetVault}
              onImportVault={importVault}
              showToast={showToast}
              money={money}
              num={num}
            />
          )}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav activeView={activeView} setActiveView={setActiveView} />

        {/* Mobile Floating Action Button (FAB) on Day View */}
        {activeView === 'day' && (
          <button
            onClick={handleOpenAddTx}
            className="lg:hidden fixed right-4 bottom-20 z-40 w-14 h-14 rounded-full bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center shadow-lg active:scale-95 transition"
            aria-label="Add transaction"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Transaction Modal (Add / Edit) */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTx(null);
        }}
        onSave={handleSaveTx}
        editingTransaction={editingTx}
        categories={vault.categories}
        defaultDate={selectedDate}
      />

      {/* Receipt Viewer Modal */}
      <ReceiptViewerModal
        receiptSrc={receiptModalSrc}
        transaction={receiptModalTx}
        onClose={() => {
          setReceiptModalSrc(null);
          setReceiptModalTx(null);
        }}
        money={money}
      />

      {/* Security PIN Lock Overlay */}
      <PinLockOverlay
        isLocked={isLocked}
        storedPin={vault.settings.pin}
        onUnlock={() => setIsLocked(false)}
        showToast={showToast}
      />

      {/* Toast Notification */}
      <Toast message={toastMessage} />
    </div>
  );
}
