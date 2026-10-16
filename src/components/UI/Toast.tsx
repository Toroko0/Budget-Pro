import React from 'react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-200">
      <div className="px-4 py-2.5 rounded-full bg-[var(--ink)] text-[var(--bg)] text-xs font-semibold shadow-lg border border-[var(--line)]/20 whitespace-nowrap">
        {message}
      </div>
    </div>
  );
};
