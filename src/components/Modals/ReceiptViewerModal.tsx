import React from 'react';
import { X, Share2, Download } from 'lucide-react';
import { Transaction } from '../../types';

interface ReceiptViewerModalProps {
  receiptSrc: string | null;
  transaction: Transaction | null;
  onClose: () => void;
  money: (val: number | string) => string;
}

export const ReceiptViewerModal: React.FC<ReceiptViewerModalProps> = ({
  receiptSrc,
  transaction,
  onClose,
  money
}) => {
  if (!receiptSrc) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = receiptSrc;
    a.download = `receipt-${transaction?.date || 'entry'}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleShare = async () => {
    try {
      const res = await fetch(receiptSrc);
      const blob = await res.blob();
      const file = new File([blob], `receipt-${transaction?.date || 'entry'}.jpg`, {
        type: 'image/jpeg'
      });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Receipt Attachment',
          text: `Receipt from Budget Pro (${transaction?.category || 'Expense'})`
        });
        return;
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
    }
    handleDownload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-[var(--card)] border border-[var(--line)] p-4 max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line)] mb-3">
          <div>
            <h3 className="font-bold text-sm text-[var(--ink)]">
              {transaction?.category || 'Receipt Attachment'}
            </h3>
            {transaction && (
              <span className="text-xs text-[var(--muted)]">
                {transaction.date} · {money(transaction.amount)} {transaction.note ? `· ${transaction.note}` : ''}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image viewport */}
        <div className="flex-1 min-h-[220px] max-h-[60vh] overflow-auto rounded-xl bg-[var(--bg)] border border-[var(--line)] flex items-center justify-center p-2">
          <img
            src={receiptSrc}
            alt="Attached Receipt"
            className="max-w-full max-h-[56vh] object-contain rounded-lg"
          />
        </div>

        {/* Action footer */}
        <div className="flex gap-2 pt-3">
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] hover:border-teal-500/40 text-xs font-semibold text-[var(--ink)] transition"
          >
            <Share2 className="w-3.5 h-3.5 text-teal-600" />
            <span>Share Image</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] hover:border-teal-500/40 text-xs font-semibold text-[var(--ink)] transition"
          >
            <Download className="w-3.5 h-3.5 text-teal-600" />
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  );
};
