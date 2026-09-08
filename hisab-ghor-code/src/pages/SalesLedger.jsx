import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight, Search, HelpCircle, FileDown, Receipt, CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { startOfDay, startOfMonth, startOfYear, endOfDay, endOfMonth, endOfYear, addDays, addMonths, addYears, format as fnsFormat } from 'date-fns';
import { useLanguage } from '../components/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import CalendarPopup from '../components/shared/CalendarPopup';
import EmptyState from '../components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';

export default function SalesLedger() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const bn = language === 'bn';
  const navigate = useNavigate();

  const [periodFilter, setPeriodFilter] = useState('day'); // day | month | year | all | custom
  const [periodOffset, setPeriodOffset] = useState(0);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [search, setSearch] = useState('');

  const today = new Date();

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales', user?.email],
    queryFn: () => base44.entities.Sale.filter({}, '-sale_date'),
    enabled: !!user,
  });

  const num = (n) => (Number(n) || 0).toLocaleString(bn ? 'bn-BD' : 'en-US');

  const earliestDate = useMemo(() => {
    const dates = sales
      .map(s => s.sale_date || s.created_date)
      .filter(Boolean)
      .map(d => fnsFormat(new Date(d), 'yyyy-MM-dd'))
      .sort();
    return dates[0] || null;
  }, [sales]);

  const getPeriodRange = () => {
    if (periodFilter === 'all') return { from: null, to: null };
    if (periodFilter === 'custom') return { from: customFrom || null, to: customTo || null };
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
        return `${fnsFormat(new Date(earliestDate), 'dd MMM yy')} - ${fnsFormat(today, 'dd MMM yy')}`;
      }
      return bn ? 'সব সময়' : 'All Time';
    }
    if (periodFilter === 'custom') {
      if (customFrom && customTo) {
        return `${fnsFormat(new Date(customFrom), 'dd MMM yy')} - ${fnsFormat(new Date(customTo), 'dd MMM yy')}`;
      }
      return bn ? 'তারিখ বেছে নিন' : 'Pick dates';
    }
    if (periodFilter === 'day') return fnsFormat(addDays(today, periodOffset), 'dd MMM yyyy');
    if (periodFilter === 'month') return fnsFormat(addMonths(today, periodOffset), bn ? 'MMM yyyy' : 'MMMM yyyy');
    if (periodFilter === 'year') return fnsFormat(addYears(today, periodOffset), 'yyyy');
    return '';
  };

  const canGoNext = periodFilter !== 'all' && periodFilter !== 'custom' && periodOffset < 0;
  const { from: periodFrom, to: periodTo } = getPeriodRange();

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return sales.filter(s => {
      const dateStr = fnsFormat(new Date(s.sale_date || s.created_date), 'yyyy-MM-dd');
      if (periodFrom && dateStr < periodFrom) return false;
      if (periodTo && dateStr > periodTo) return false;
      if (!q) return true;
      const text = [s.receipt_no, s.customer_name, s.customer_phone, s.items_summary].filter(Boolean).join(' ').toLowerCase();
      return text.includes(q);
    });
  }, [sales, periodFrom, periodTo, search]);

  const totalSale = filtered.reduce((s, r) => s + (Number(r.total) || 0), 0);

  const methodBadge = (s) => {
    if (s.sale_type === 'quick') return { label: bn ? 'দ্রুত বিক্রি' : 'Quick Sale', cls: 'bg-amber-400 text-amber-950' };
    if (s.payment_method === 'due') return { label: bn ? 'বাকি' : 'Due', cls: 'bg-red-500 text-white' };
    if (s.payment_method === 'qr') return { label: bn ? 'কিউআর' : 'QR', cls: 'bg-pink-500 text-white' };
    return { label: bn ? 'নগদ টাকা' : 'Cash', cls: 'bg-blue-600 text-white' };
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 dark:bg-slate-900 z-10">
      {/* Header */}
      <div className="bg-brand-green text-white px-4 pb-5 rounded-b-3xl flex-shrink-0" style={{ paddingTop: 'calc(0.35rem + env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-white/20 rounded-lg active:opacity-70">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold flex-1">{bn ? 'বেচার খাতা' : 'Sales Ledger'}</h1>
          <button
            onClick={() => toast.info(bn ? 'শীঘ্রই আসবে!' : 'Coming Soon!', { duration: 1500 })}
            className="p-1.5 hover:bg-white/20 rounded-lg active:opacity-70"
          >
            <FileDown className="w-5 h-5" />
          </button>
          <button
            onClick={() => toast.info(bn ? 'শীঘ্রই আসবে!' : 'Coming Soon!', { duration: 1500 })}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center active:opacity-70"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col px-4 pb-6 -mt-3">
        {/* Total card */}
        <div className="rounded-xl bg-blue-600 text-white px-3 py-2 shadow-sm flex items-center justify-center gap-2">
          <p className="text-xs font-semibold text-amber-300">{bn ? 'মোট বিক্রি' : 'Total Sales'}</p>
          <p className="text-base font-bold">{num(totalSale)} ৳</p>
        </div>


        {/* Period navigator */}
        <div className="flex items-center justify-between mt-2 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 px-2 py-1.5">
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
        <div className="flex gap-1.5 mt-2">
          {[
            { value: 'day', label: bn ? 'দিন' : 'Day' },
            { value: 'month', label: bn ? 'মাস' : 'Month' },
            { value: 'year', label: bn ? 'বছর' : 'Year' },
            { value: 'all', label: bn ? 'সব সময়' : 'All Time' },
            { value: 'custom', label: bn ? 'কাস্টম' : 'Custom', icon: CalendarDays },
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

        {/* Search */}
        <div className="mt-2 flex items-center gap-2 px-3 h-12 rounded-xl bg-white dark:bg-slate-800 border-2 border-blue-600">
          <Search className="w-5 h-5 text-blue-600 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={bn ? 'অনুসন্ধান করুন (নাম, মোবাইল, রিসিপ্ট)' : 'Search (name, mobile, receipt)'}
            className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none dark:text-slate-100"
          />
        </div>

        {/* List */}
        <div className="mt-3 space-y-3 flex-1 min-h-0 overflow-y-auto">
          {isLoading ? (
            [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)
          ) : filtered.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
              <EmptyState
                icon={Receipt}
                title={bn ? 'কোনো বিক্রি নেই' : 'No sales found'}
                subtitle={bn ? 'এই সময়ে কোনো বিক্রির রেকর্ড পাওয়া যায়নি' : 'No sales recorded in this period'}
              />
            </div>
          ) : (
            filtered.map(s => {
              const badge = methodBadge(s);
              const dt = new Date(s.sale_date || s.created_date);
              return (
                <div key={s.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-600 dark:text-slate-300 break-all">
                      {bn ? 'রিসিপ্ট # ' : 'Receipt # '}{s.receipt_no}
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-slate-100 shrink-0">{num(s.total)} ৳</p>
                  </div>
                  <div className="flex items-end justify-between gap-3 mt-2">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-600 dark:text-slate-300">
                        {num(s.item_count)} {bn ? 'আইটেম' : 'items'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-slate-400 truncate">
                        {s.items_summary || (bn ? 'অন্যান্য' : 'others')}
                      </p>
                      {(s.customer_name || s.customer_phone) && (
                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 truncate">
                          {s.customer_name || (s.customer_phone || '').replace(/^\+?88/, '')}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold ${badge.cls}`}>{badge.label}</span>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1.5">
                        {dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} | {dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
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
