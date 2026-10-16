import React, { useState, useEffect } from 'react';
import { Lock, Delete } from 'lucide-react';

interface PinLockOverlayProps {
  isLocked: boolean;
  storedPin: string | null;
  onUnlock: () => void;
  showToast: (msg: string) => void;
}

export const PinLockOverlay: React.FC<PinLockOverlayProps> = ({
  isLocked,
  storedPin,
  onUnlock,
  showToast
}) => {
  const [entered, setEntered] = useState('');

  // Reset entered PIN when locked state changes
  useEffect(() => {
    if (isLocked) {
      setEntered('');
    }
  }, [isLocked]);

  if (!isLocked || !storedPin) return null;

  const handleKey = (key: string) => {
    if (key === 'clear') {
      setEntered('');
    } else if (key === 'del') {
      setEntered(prev => prev.slice(0, -1));
    } else if (entered.length < 4 && !isNaN(Number(key))) {
      const next = entered + key;
      setEntered(next);
      if (next.length === 4) {
        if (next === storedPin) {
          onUnlock();
          showToast('Vault unlocked');
        } else {
          showToast('Incorrect PIN. Try again.');
          setTimeout(() => setEntered(''), 300);
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg)] p-6 select-none">
      <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center mb-3">
        <Lock className="w-6 h-6" />
      </div>

      <h2 className="text-xl font-bold text-[var(--ink)]">Budget Pro Locked</h2>
      <p className="text-xs text-[var(--muted)] mt-1 mb-6">Enter your 4-digit security PIN</p>

      {/* 4 Dots */}
      <div className="flex gap-4 mb-8">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full border-2 border-teal-600 transition-all ${
              i < entered.length ? 'bg-teal-600 scale-110' : 'bg-transparent'
            }`}
          />
        ))}
      </div>

      {/* 3x4 Pad */}
      <div className="grid grid-cols-3 gap-3.5 max-w-xs w-full">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'del'].map(k => (
          <button
            key={k}
            onClick={() => handleKey(k)}
            className="w-full aspect-square rounded-2xl bg-[var(--card)] border border-[var(--line)] text-xl font-bold font-mono-numbers text-[var(--ink)] shadow-xs hover:border-teal-500/40 active:scale-95 transition flex items-center justify-center"
          >
            {k === 'clear' ? (
              <span className="text-xs font-semibold text-[var(--muted)]">Clear</span>
            ) : k === 'del' ? (
              <Delete className="w-5 h-5 text-[var(--muted)]" />
            ) : (
              k
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
