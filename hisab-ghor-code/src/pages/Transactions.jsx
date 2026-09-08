import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

import { Input } from '@/components/ui/input';
import { Search, ArrowUpDown, Wallet, X, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { startOfDay, startOfMonth, startOfYear, endOfDay, endOfMonth, endOfYear, addDays, addMonths, addYears, format as fnsFormat } from 'date-fns';
import { formatLocalDateTime } from '@/lib/utils';
import CalendarPopup from '../components/shared/CalendarPopup';
import AmountBadge from '../components/shared/AmountBadge';
import EmptyState from '../components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useLanguage } from '../components/LanguageContext';
import { useAuth } from '@/lib/AuthContext';

const CATEGORIES_BN = {
  sale: 'বিক্রি', purchase: 'ক্রয়', salary: 'বেতন', rent: 'ভাড়া',
  transport: 'পরিবহন', food: 'খাবার', utility: 'ইউটিলিটি',
  loan_given: 'ধার দিলাম', loan_received: 'ধার পেলাম',
  investment: 'বিনিয়োগ', withdrawal: 'উত্তোলন', other: 'অন্যান্য',
  cash_payment: 'ক্যাশ প্রদান', cash_receipt: 'ক্যাশ গ্রহণ',
};
const CATEGORIES_EN = {
  sale: 'Sale', purchase: 'Purchase', salary: 'Salary', rent: 'Rent',
  transport: 'Transport', food: 'Food', utility: 'Utility',
  loan_given: 'Loan Given', loan_received: 'Loan Received',
  investment: 'Investment', withdrawal: 'Withdrawal', other: 'Other',
  cash_payment: 'Cash Payment', cash_receipt: 'Cash Receipt',
};


export default function Transactions() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState('month');
  const [periodOffset, setPeriodOffset] = useState(0);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);

  const today = new Date();

  const { data: transactions = [], isLoading: loadingTxn } = useQuery({
    queryKey: ['transactions', user?.email],
    queryFn: () => base44.entities.Transaction.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user,
  });

  const { data: cashEntries = [], isLoading: loadingCash } = useQuery({
    queryKey: ['cashEntries', user?.email],
    queryFn: () => base44.entities.CashEntry.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user,
  });

  const isLoading = loadingTxn || loadingCash;

  const allEntries = useMemo(() => [
    ...transactions.map(t => ({
      ...t,
      _source: 'transaction',
      _displayType: t.type,
      _date: t.date,
    })),
    ...cashEntries.filter(e => !e.transaction_id).map(e => ({
      ...e,
      _source: 'cash',
      _displayType: e.type === 'cash_in' ? 'credit' : 'debit',
      _date: e.date,
      party_name: e.party_name || (language === 'bn' ? 'ক্যাশ' : 'Cash'),
    })),
  ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)), [transactions, cashEntries, language]);

  // Earliest entry date across all entries
  const earliestDate = useMemo(() => {
    const dates = allEntries.map(e => e._date || (e.created_date ? e.created_date.split('T')[0] : '')).filter(Boolean);
    if (!dates.length) return null;
    return dates.sort()[0];
  }, [allEntries]);

  const getPeriodRange = () => {
    if (periodFilter === 'all') return { from: earliestDate, to: fnsFormat(today, 'yyyy-MM-dd') };
    if (periodFilter === 'custom') return { from: customFrom, to: customTo };
    if (periodFilter === 'day') {
      const d = addDays(today, periodOffset);
      return { from: fnsFormat(startOfDay(d), 'yyyy-MM-dd'), to: fnsFormat(endOfDay(d), 'yyyy-MM-dd') };
    }
    if (periodFilter === 'month') {
      const d = addMonths(today, periodOffset);
      return { from: fnsFormat(startOfMonth(d), 'yyyy-MM-dd'), to: fnsFormat(endOfMonth(d), 'yyyy-MM-dd') };
    }
    if (periodFilter === 'year') {
      const d = addYears(today, periodOffset);
      return { from: fnsFormat(startOfYear(d), 'yyyy-MM-dd'), to: fnsFormat(endOfYear(d), 'yyyy-MM-dd') };
    }
    return { from: null, to: null };
  };

  const getPeriodLabel = () => {
    if (periodFilter === 'all') {
      if (earliestDate) {
        const fromLabel = fnsFormat(new Date(earliestDate), 'dd MMM yy');
        const toLabel = fnsFormat(today, 'dd MMM yy');
        return `${fromLabel} - ${toLabel}`;
      }
      return language === 'bn' ? 'সব সময়' : 'All Time';
    }
    if (periodFilter === 'custom') {
      if (customFrom && customTo) {
        return `${fnsFormat(new Date(customFrom), 'dd MMM yy')} - ${fnsFormat(new Date(customTo), 'dd MMM yy')}`;
      }
      return language === 'bn' ? 'তারিখ বেছে নিন' : 'Pick dates';
    }
    if (periodFilter === 'day') return fnsFormat(addDays(today, periodOffset), 'dd MMM yyyy');
    if (periodFilter === 'month') return fnsFormat(addMonths(today, periodOffset), language === 'bn' ? 'MMM yyyy' : 'MMMM yyyy');
    if (periodFilter === 'year') return fnsFormat(addYears(today, periodOffset), 'yyyy');
    return '';
  };

  const canGoNext = periodFilter !== 'all' && periodFilter !== 'custom' && periodOffset < 0;

  const { from: periodFrom, to: periodTo } = getPeriodRange();

  const filtered = allEntries
    .filter(e =>
      (e.party_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.description || '').toLowerCase().includes(search.toLowerCase())
    )
    .filter(e => {
      const dateStr = e._date || (e.created_date ? e.created_date.split('T')[0] : '');
      if (periodFrom && dateStr < periodFrom) return false;
      if (periodTo && dateStr > periodTo) return false;
      return true;
    });

  const totalDebit = filtered.filter(e => e._displayType === 'debit').reduce((s, e) => s + e.amount, 0);
  const totalCredit = filtered.filter(e => e._displayType === 'credit').reduce((s, e) => s + e.amount, 0);
  const CATEGORIES = language === 'bn' ? CATEGORIES_BN : CATEGORIES_EN;

  // Navigator always shows for all period types

  return (
    <div className="fixed inset-0 bottom-[4.5rem] flex flex-col bg-gray-50 dark:bg-slate-900 z-10">
      {/* Header */}
      <div className="bg-brand-green text-white px-5 pb-8 rounded-b-3xl flex-shrink-0" style={{ paddingTop: 'calc(0.35rem + env(safe-area-inset-top))' }}>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ArrowUpDown className="w-6 h-6" /> {t('transactions')}
        </h1>
        <p className="text-emerald-100 text-sm mt-1">{language === 'bn' ? 'আপনার সকল লেনদেন' : 'All your transactions'}</p>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-white/15 backdrop-blur rounded-xl p-3 text-center">
            <p className="text-emerald-100 text-xs">{t('totalGave')}</p>
            <p className="text-lg font-bold text-red-200 mt-1">৳{totalDebit.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}</p>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-xl p-3 text-center">
            <p className="text-emerald-100 text-xs">{t('totalReceived')}</p>
            <p className="text-lg font-bold text-emerald-200 mt-1">৳{totalCredit.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}</p>
          </div>
        </div>
      </div>

      {/* Filters + List */}
      <div className="flex flex-col flex-1 min-h-0 px-4 -mt-4">
        <div className="flex-shrink-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={t('searchTransaction')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12 rounded-xl bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 shadow-sm border-gray-100"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Period navigator - always visible */}
          <div className="flex items-center justify-between mt-2 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 px-2 py-1.5">
            <button
              onClick={() => periodFilter !== 'all' && periodFilter !== 'custom' && setPeriodOffset(o => o - 1)}
              className={`w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-slate-700 active:opacity-60 ${periodFilter === 'all' || periodFilter === 'custom' ? 'opacity-0 pointer-events-none' : ''}`}
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-slate-300" />
            </button>

            {periodFilter === 'custom' ? (
              <button
                onClick={() => setShowCalendar(true)}
                className="flex items-center gap-1.5 flex-1 justify-center"
              >
                <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{getPeriodLabel()}</span>
              </button>
            ) : (
              <span className="text-sm font-semibold text-gray-800 dark:text-slate-100 flex-1 text-center">{getPeriodLabel()}</span>
            )}

            <button
              onClick={() => periodFilter !== 'all' && periodFilter !== 'custom' && setPeriodOffset(o => o + 1)}
              disabled={!canGoNext}
              className={`w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-slate-700 active:opacity-60 ${periodFilter === 'all' || periodFilter === 'custom' ? 'opacity-0 pointer-events-none' : ''} ${!canGoNext ? 'opacity-30' : ''}`}
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-slate-300" />
            </button>
          </div>

          {/* Period filter tabs */}
          <div className="flex gap-1.5 mt-2">
            {[
              { value: 'day', label: language === 'bn' ? 'দিন' : 'Day' },
              { value: 'month', label: language === 'bn' ? 'মাস' : 'Month' },
              { value: 'year', label: language === 'bn' ? 'বছর' : 'Year' },
              { value: 'all', label: language === 'bn' ? 'সব সময়' : 'All Time' },
              { value: 'custom', label: language === 'bn' ? 'কাস্টম' : 'Custom', icon: CalendarDays },
            ].map(({ value, label, icon: TabIcon }) => (
              <button
                key={value}
                onClick={() => {
                  setPeriodFilter(value);
                  setPeriodOffset(0);
                  if (value === 'custom') setShowCalendar(true);
                }}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-semibold border transition-all active:opacity-70 flex-1 justify-center ${
                  periodFilter === value
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600'
                }`}
              >
                {TabIcon && <TabIcon className="w-3.5 h-3.5" />}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Entry list - scrollable */}
        <div className="mt-2 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-y-auto flex-1 mb-4">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={ArrowUpDown}
              title={t('noTransactions')}
              subtitle={t('selectFromLedger')}
            />
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-slate-700">
              {filtered.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-3.5 active:opacity-70 transition-opacity">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    entry._displayType === 'debit' ? 'bg-red-50 dark:bg-red-900/30' : 'bg-emerald-50 dark:bg-emerald-900/30'
                  }`}>
                    <Wallet className={`w-4 h-4 ${entry._displayType === 'debit' ? 'text-red-600' : 'text-emerald-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-slate-100 truncate">{entry.party_name}</p>
                    {entry.category && (
                      <p className="text-xs text-emerald-500 dark:text-emerald-400 mt-0.5">{CATEGORIES[entry.category] || entry.category}</p>
                    )}
                    {entry.description && <p className="text-xs text-gray-400 dark:text-slate-400 truncate mt-0.5">{entry.description}</p>}
                    <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">
                      {entry.created_date ? formatLocalDateTime(entry.created_date, entry._date, entry.time) : (entry._date ? entry._date : '')}
                    </p>
                  </div>
                  <AmountBadge amount={entry.amount} type={entry._displayType} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Calendar Popup */}
      <CalendarPopup
        open={showCalendar}
        onClose={() => setShowCalendar(false)}
        from={customFrom}
        to={customTo}
        language={language}
        onApply={(from, to) => { setCustomFrom(from); setCustomTo(to); }}
      />
    </div>
  );
}