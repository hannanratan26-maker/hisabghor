import React from 'react';
import { X, Package, Banknote } from 'lucide-react';

/**
 * Bottom sheet to pick the kind of due entry: product due or money due.
 * Slides up from the bottom.
 */
export default function DueTypeSheet({ open, onClose, onSelect, language }) {
  if (!open) return null;
  const bn = language !== 'en';

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 animate-sheet-fade" />
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-t-3xl px-5 pt-5 animate-sheet-up"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 pt-1.5 leading-snug">
            {bn ? 'আপনি কি ধরনের বাকী দিচ্ছেন নির্বাচন করুন' : 'Select the type of due you are giving'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 active:opacity-70 shrink-0"
          >
            <X className="w-6 h-6 text-gray-800 dark:text-slate-100" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <button
            onClick={() => onSelect('product')}
            className="flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 border-sky-300/70 dark:border-sky-500/40 bg-white dark:bg-slate-800 shadow-sm active:scale-[0.97] transition-transform"
          >
            <Package className="w-14 h-14 text-amber-500" strokeWidth={1.5} />
            <span className="text-base font-bold text-gray-900 dark:text-slate-100">
              {bn ? 'পণ্য বাকী' : 'Product Due'}
            </span>
          </button>
          <button
            onClick={() => onSelect('money')}
            className="flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 border-sky-300/70 dark:border-sky-500/40 bg-white dark:bg-slate-800 shadow-sm active:scale-[0.97] transition-transform"
          >
            <Banknote className="w-14 h-14 text-brand-green" strokeWidth={1.5} />
            <span className="text-base font-bold text-gray-900 dark:text-slate-100">
              {bn ? 'টাকা বাকী' : 'Money Due'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
