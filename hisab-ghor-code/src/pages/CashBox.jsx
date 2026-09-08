import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, CalendarDays, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AddCashEntryDialog from '../components/cashbox/AddCashEntryDialog';
import CashEntryActions from '../components/cashbox/CashEntryActions';
import EmptyState from '../components/shared/EmptyState';
import AmountBadge from '../components/shared/AmountBadge';
import CalendarPopup from '../components/shared/CalendarPopup';
import { Skeleton } from '@/components/ui/skeleton';
import { startOfDay, startOfMonth, startOfYear, endOfDay, endOfMonth, endOfYear, addDays, addMonths, addYears, format as fnsFormat } from 'date-fns';
import { formatLocalDateTime } from '@/lib/utils';
import { useLanguage } from '../components/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { useAccountStatus } from '@/hooks/useAccountStatus';
import TrialExpiredPopup from '../components/TrialExpiredPopup';

const CATEGORY_LABELS_BN = {
  sale: 'বিক্রি', purchase: 'ক্রয়', salary: 'বেতন', rent: 'ভাড়া',
  transport: 'পরিবহন', food: 'খাবার', utility: 'ইউটিলিটি',
  loan_given: 'ধার দিলাম', loan_received: 'ধার পেলাম',
  investment: 'বিনিয়োগ', withdrawal: 'উত্তোলন', other: 'অন্যান্য',
};

const CATEGORY_LABELS_EN = {
  sale: 'Sale', purchase: 'Purchase', salary: 'Salary', rent: 'Rent',
  transport: 'Transport', food: 'Food', utility: 'Utility',
  loan_given: 'Loan Given', loan_received: 'Loan Received',
  investment: 'Investment', withdrawal: 'Withdrawal', other: 'Other',
};

export default function CashBox() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { canAct } = useAccountStatus();
  const navigate = useNavigate();
  const [showTrialPopup, setShowTrialPopup] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('all');
  const [editingEntry, setEditingEntry] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [typeToAdd, setTypeToAdd] = useState(null);
  const [periodFilter, setPeriodFilter] = useState('month');
  const [periodOffset, setPeriodOffset] = useState(0);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const queryClient = useQueryClient();
  const today = new Date();

  const CATEGORY_LABELS = language === 'bn' ? CATEGORY_LABELS_BN : CATEGORY_LABELS_EN;

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['cashEntries', user?.email],
    queryFn: () => base44.entities.CashEntry.filter({ created_by: user.email }, '-created_date'),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', user?.email],
    queryFn: () => base44.entities.Transaction.filter({ created_by: user.email }, '-date'),
    enabled: !!user,
  });

  const qKey = ['cashEntries', user?.email];

  const createEntry = useMutation({
    mutationFn: (data) => base44.entities.CashEntry.create(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: qKey });
      const prev = queryClient.getQueryData(qKey);
      const optimistic = { ...data, id: `temp-${Date.now()}`, created_date: new Date().toISOString() };
      queryClient.setQueryData(qKey, (old = []) => [optimistic, ...old]);
      return { prev };
    },
    onError: (_, __, ctx) => queryClient.setQueryData(qKey, ctx.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey: qKey }),
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, data, oldEntry }) => {
      await base44.entities.CashEntry.update(id, data);
      if (oldEntry?.transaction_id) {
        await base44.entities.Transaction.update(oldEntry.transaction_id, {
          type: data.type === 'cash_in' ? 'credit' : 'debit',
          amount: data.amount,
          date: data.date,
          description: data.description || oldEntry.description,
        });
      }
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: qKey });
      const prev = queryClient.getQueryData(qKey);
      queryClient.setQueryData(qKey, (old = []) => old.map(e => e.id === id ? { ...e, ...data } : e));
      return { prev };
    },
    onError: (_, __, ctx) => queryClient.setQueryData(qKey, ctx.prev),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qKey });
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.email] });
      setShowEditDialog(false);
      setEditingEntry(null);
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async ({ id, transactionId }) => {
      if (transactionId) {
        await base44.entities.Transaction.delete(transactionId);
      }
      await base44.entities.CashEntry.delete(id);
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: qKey });
      const prev = queryClient.getQueryData(qKey);
      queryClient.setQueryData(qKey, (old = []) => old.filter(e => e.id !== id));
      return { prev };
    },
    onError: (_, __, ctx) => queryClient.setQueryData(qKey, ctx.prev),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qKey });
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['parties', user?.email] });
    },
  });

  const handleEdit = (entry) => {
    if (!canAct) { setShowTrialPopup(true); return; }
    setEditingEntry(entry);
    setShowEditDialog(true);
  };

  const handleDelete = (id, transactionId) => {
    if (!canAct) { setShowTrialPopup(true); return; }
    deleteEntry.mutate({ id, transactionId });
  };

  const handleSaveEdit = (data) => {
    updateEntry.mutate({ id: editingEntry.id, data, oldEntry: editingEntry });
  };

  const handleAddClick = (type) => {
    if (!canAct) { setShowTrialPopup(true); return; }
    setTypeToAdd(type);
    setShowAdd(true);
  };

  const earliestDate = useMemo(() => {
    const dates = entries.map(e => e.date || (e.created_date ? e.created_date.split('T')[0] : '')).filter(Boolean);
    if (!dates.length) return null;
    return dates.sort()[0];
  }, [entries]);

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
    if (periodFilter === 'all') return language === 'bn' ? 'সব সময়' : 'All Time';
    if (periodFilter === 'custom') {
      if (customFrom && customTo) return `${fnsFormat(new Date(customFrom), 'dd MMM yy')} - ${fnsFormat(new Date(customTo), 'dd MMM yy')}`;
      return language === 'bn' ? 'তারিখ বেছে নিন' : 'Pick dates';
    }
    if (periodFilter === 'day') return fnsFormat(addDays(today, periodOffset), 'dd MMM yyyy');
    if (periodFilter === 'month') return fnsFormat(addMonths(today, periodOffset), language === 'bn' ? 'MMM yyyy' : 'MMMM yyyy');
    if (periodFilter === 'year') return fnsFormat(addYears(today, periodOffset), 'yyyy');
    return '';
  };

  const canGoNext = periodFilter !== 'all' && periodFilter !== 'custom' && periodOffset < 0;
  const { from: periodFrom, to: periodTo } = getPeriodRange();

  const dateFiltered = entries.filter(e => {
    const dateStr = e.date || (e.created_date ? e.created_date.split('T')[0] : '');
    if (periodFrom && dateStr < periodFrom) return false;
    if (periodTo && dateStr > periodTo) return false;
    return true;
  });

  const totalIn = dateFiltered.reduce((s, e) => s + (e.type === 'cash_in' ? e.amount : 0), 0);
  const totalOut = dateFiltered.reduce((s, e) => s + (e.type === 'cash_out' ? e.amount : 0), 0);
  const balance = entries.reduce((s, e) => s + (e.type === 'cash_in' ? e.amount : -e.amount), 0);

  const filtered = (filter === 'all' ? dateFiltered : dateFiltered.filter(e => e.type === filter));

  return (
    <div className="fixed inset-0 bottom-[4.5rem] flex flex-col bg-gray-50 dark:bg-slate-900 z-10">
      {/* Header - fixed, no scroll */}
      <div className="bg-brand-green text-white px-5 pb-10 rounded-b-3xl flex-shrink-0" style={{ paddingTop: 'calc(0.35rem + env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-white/20 rounded-lg active:opacity-70">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Wallet className="w-6 h-6" /> {t('cashbox')}
              </h1>
              <p className="text-emerald-100 text-sm mt-1">{t('yourCash')}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-emerald-100 text-xs">{t('currentBalance')}</p>
            <p className="text-xl font-bold mt-0.5">৳{balance.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={() => handleAddClick('cash_in')}
            className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-md active:scale-95 transition-transform border-2 border-emerald-400"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <ArrowDownCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">{t('cashIn')} +</p>
              <p className="text-base font-bold text-emerald-600">৳{totalIn.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}</p>
            </div>
          </button>
          <button
            onClick={() => handleAddClick('cash_out')}
            className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-md active:scale-95 transition-transform border-2 border-red-400"
          >
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <ArrowUpCircle className="w-6 h-6 text-red-500" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-red-600 uppercase tracking-wide">{t('cashOut')} -</p>
              <p className="text-base font-bold text-red-500">৳{totalOut.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}</p>
            </div>
          </button>
        </div>
      </div>

      {/* Tabs + List - scrollable area */}
      <div className="flex flex-col flex-1 min-h-0 px-4 -mt-5">
        <div className="flex-shrink-0">
          {/* Period navigator */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 px-2 py-1.5 mb-2">
            <button
              onClick={() => periodFilter !== 'all' && periodFilter !== 'custom' && setPeriodOffset(o => o - 1)}
              className={`w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-slate-700 active:opacity-60 ${periodFilter === 'all' || periodFilter === 'custom' ? 'opacity-0 pointer-events-none' : ''}`}
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-slate-300" />
            </button>
            {periodFilter === 'custom' ? (
              <button onClick={() => setShowCalendar(true)} className="flex items-center gap-1.5 flex-1 justify-center">
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
          <div className="flex gap-1.5 mb-2">
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

          {/* Cash type filter tabs */}
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="grid w-full grid-cols-3 h-10 bg-gray-100 dark:bg-slate-800 rounded-xl">
              <TabsTrigger value="all" className="rounded-lg text-xs">{t('all')}</TabsTrigger>
              <TabsTrigger value="cash_in" className="rounded-lg text-xs">{t('cashIn')}</TabsTrigger>
              <TabsTrigger value="cash_out" className="rounded-lg text-xs">{t('cashOut')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Entry list - scrollable */}
        <div className="mt-4 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-y-auto flex-1 mb-4">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title={t('noEntry')}
              subtitle={t('addCashEntry')}
              action={
                <Button onClick={() => handleAddClick(null)} className="bg-blue-600 hover:bg-blue-700 rounded-xl">
                  {t('addEntry')}
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-slate-700">
              {filtered.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    entry.type === 'cash_in' ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-red-50 dark:bg-red-900/30'
                  }`}>
                    {entry.type === 'cash_in'
                      ? <ArrowDownCircle className="w-4 h-4 text-emerald-600" />
                      : <ArrowUpCircle className="w-4 h-4 text-red-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-slate-100 truncate">
                      {CATEGORY_LABELS[entry.category] || entry.category}
                      {entry.party_name ? ` • ${entry.party_name}` : ''}
                    </p>
                    {entry.description && <p className="text-xs text-gray-400 dark:text-slate-400 truncate mt-0.5">{entry.description}</p>}
                    <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">
                      {entry.created_date ? formatLocalDateTime(entry.created_date, entry.date, entry.time) : (entry.date || '')}
                    </p>
                  </div>
                  <AmountBadge amount={entry.amount} type={entry.type} />
                  <CashEntryActions
                    entry={entry}
                    transaction={transactions.find(t => t.id === entry.transaction_id)}
                    onEdit={handleEdit}
                    onDelete={(id) => handleDelete(id, entry.transaction_id)}
                    canAct={canAct}
                    onTrialExpired={() => setShowTrialPopup(true)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <TrialExpiredPopup open={showTrialPopup} onOpenChange={setShowTrialPopup} />

      <CalendarPopup
        open={showCalendar}
        onClose={() => setShowCalendar(false)}
        from={customFrom}
        to={customTo}
        language={language}
        onApply={(from, to) => { setCustomFrom(from); setCustomTo(to); }}
      />

      <AddCashEntryDialog 
        open={showAdd} 
        onOpenChange={(open) => {
          setShowAdd(open);
          if (!open) setTypeToAdd(null);
        }} 
        onSave={(data) => createEntry.mutate(data)}
        defaultType={typeToAdd}
      />
      
      {editingEntry && (
        <AddCashEntryDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSave={handleSaveEdit}
          entry={editingEntry}
        />
      )}
    </div>
  );
}