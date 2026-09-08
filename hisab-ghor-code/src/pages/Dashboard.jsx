import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useLanguage } from '../components/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { getActiveShopId } from '@/lib/shop';
import { toast } from 'sonner';

const comingSoon = (language) => {
  toast.info(language === 'bn' ? 'শীঘ্রই আসবে!' : 'Coming Soon!', { duration: 1500 });
};

// Section icon component
const MenuIcon = ({ emoji, label, onClick, to, language }) => {
  if (to) {
    return (
      <Link to={to} className="flex flex-col items-center gap-1.5 active:opacity-70">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-slate-800 flex items-center justify-center text-3xl shadow-sm border border-emerald-100 dark:border-slate-700">
          {emoji}
        </div>
        <span className="text-xs text-gray-700 dark:text-slate-300 font-medium text-center leading-tight">{label}</span>
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => comingSoon(language)}
      className="flex flex-col items-center gap-1.5 active:opacity-70"
    >
      <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-slate-800 flex items-center justify-center text-3xl shadow-sm border border-emerald-100 dark:border-slate-700">
        {emoji}
      </div>
      <span className="text-xs text-gray-500 dark:text-slate-400 font-medium text-center leading-tight">{label}</span>
    </button>
  );
};

const BigMenuIcon = ({ emoji, label, onClick, to, language }) => {
  if (to) {
    return (
      <Link to={to} className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl bg-emerald-50 dark:bg-slate-800 border border-emerald-100 dark:border-slate-700 shadow-sm active:opacity-70">
        <span className="text-4xl">{emoji}</span>
        <span className="text-sm font-semibold text-emerald-700 dark:text-slate-200">{label}</span>
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => comingSoon(language)}
      className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl bg-emerald-50 dark:bg-slate-800 border border-emerald-100 dark:border-slate-700 shadow-sm active:opacity-70"
    >
      <span className="text-4xl">{emoji}</span>
      <span className="text-sm font-semibold text-emerald-700 dark:text-slate-400">{label}</span>
    </button>
  );
};

export default function Dashboard() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const bn = language === 'bn';
  const [period, setPeriod] = useState('day');
  const activeShopId = getActiveShopId();

  const { data: activeShop } = useQuery({
    queryKey: ['activeShop', activeShopId],
    queryFn: () => base44.entities.Shop.get(activeShopId),
    enabled: !!activeShopId,
  });

  const { data: parties = [] } = useQuery({
    queryKey: ['parties', user?.email],
    queryFn: () => base44.entities.Party.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', user?.email],
    queryFn: () => base44.entities.Transaction.filter({ created_by: user.email }, '-created_date', 100),
    enabled: !!user,
  });

  const { data: cashEntries = [] } = useQuery({
    queryKey: ['cashEntries', user?.email],
    queryFn: () => base44.entities.CashEntry.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales', user?.email],
    queryFn: () => base44.entities.Sale.filter({}, '-sale_date'),
    enabled: !!user,
  });

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.slice(0, 7);

  const filterByPeriod = (items, dateField) => {
    return items.filter(i => {
      const d = (i[dateField] || i.created_date || '').slice(0, 10);
      return period === 'day' ? d === today : d.startsWith(thisMonth);
    });
  };

  const periodTxn = filterByPeriod(transactions, 'date');
  const periodCash = filterByPeriod(cashEntries, 'date');
  const periodSales = filterByPeriod(sales, 'sale_date');

  const salesTotal = periodSales.reduce((s, r) => s + (Number(r.total) || 0), 0);

  const todaySale = periodTxn.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0)
    + periodCash.filter(e => e.type === 'cash_in' && !e.transaction_id).reduce((s, e) => s + e.amount, 0)
    + salesTotal;

  const todayExpense = periodTxn.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0)
    + periodCash.filter(e => e.type === 'cash_out' && !e.transaction_id).reduce((s, e) => s + e.amount, 0);

  const totalCashIn = cashEntries.reduce((s, e) => s + (e.type === 'cash_in' ? e.amount : 0), 0);
  const totalCashOut = cashEntries.reduce((s, e) => s + (e.type === 'cash_out' ? e.amount : 0), 0);
  const cashBalance = totalCashIn - totalCashOut;

  const totalDebit = parties.reduce((s, p) => {
    const bal = (p.total_debit || 0) - (p.total_credit || 0);
    return bal > 0 ? s + bal : s;
  }, 0);
  const totalCredit = parties.reduce((s, p) => {
    const bal = (p.total_credit || 0) - (p.total_debit || 0);
    return bal > 0 ? s + bal : s;
  }, 0);

  const fmt = (n) => '৳' + Math.abs(n).toLocaleString(bn ? 'bn-BD' : 'en-US');

  const now = new Date();
  const dateLabel = `${now.getDate().toString().padStart(2,'0')} ${now.toLocaleString(bn ? 'bn-BD' : 'en', { month: 'short' })}, ${now.toLocaleTimeString(bn ? 'bn-BD' : 'en', { hour: '2-digit', minute: '2-digit' })}`;

  return (
    <div className="fixed inset-0 bottom-[4.5rem] flex flex-col bg-gray-50 dark:bg-slate-900">
      {/* Emerald Header */}
      <div
        className="bg-brand-green px-4 flex items-center justify-between rounded-b-2xl flex-shrink-0"
        style={{ paddingTop: 'calc(0.35rem + env(safe-area-inset-top))', paddingBottom: '0.35rem' }}
      >
        <div>
          <h1 className="text-xl font-bold text-white leading-tight">{activeShop?.name || user?.full_name || (bn ? 'আমার ব্যবসা' : 'My Business')}</h1>
          <p className="text-xs text-emerald-100">{bn ? 'সর্বশেষ ব্যাকআপঃ' : 'Last backup:'} {dateLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => comingSoon(language)} className="text-white active:opacity-70">
            <span className="text-2xl">📱</span>
          </button>
          <button onClick={() => comingSoon(language)} className="text-white active:opacity-70">
            <span className="text-2xl">🔔</span>
          </button>
        </div>
      </div>



      <div className="flex-1 overflow-y-auto px-3 mt-2 space-y-3 pb-4">
        {/* Balance Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-3">
          {/* Period toggle */}
          <div className="flex items-start justify-between mb-2">
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 flex-1">
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400">{bn ? 'ব্যালেন্স' : 'Balance'}</p>
                <p className="text-lg font-bold text-emerald-600">{fmt(cashBalance)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400">{period === 'month' ? (bn ? 'এই মাসের বিক্রি' : "This Month's Sale") : (bn ? 'আজকের বিক্রি' : "Today's Sale")}</p>
                <p className="text-lg font-bold text-gray-800 dark:text-slate-100">{fmt(todaySale)}</p>
              </div>
            </div>
            <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-slate-600 shrink-0 ml-2">
              <button
                onClick={() => setPeriod('day')}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${period === 'day' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400'}`}
              >{bn ? 'দিন' : 'Day'}</button>
              <button
                onClick={() => setPeriod('month')}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${period === 'month' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400'}`}
              >{bn ? 'মাস' : 'Month'}</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-50 dark:border-slate-700">
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400">{period === 'month' ? (bn ? 'এই মাসের ব্যয়' : "This Month's Expense") : (bn ? 'আজকের ব্যয়' : "Today's Expense")}</p>
              <p className="text-sm font-bold text-red-500">{fmt(todayExpense)}</p>
            </div>
            <div className="col-span-1 flex flex-col items-center">
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">{bn ? 'বাকির হিসাব' : 'Due'}</p>
              <div className="flex gap-3">
                <div className="text-center">
                  <p className="text-xs text-red-400 whitespace-nowrap">{bn ? 'মোট পাবো' : 'Receivable'}</p>
                  <p className="text-sm font-bold text-red-500">{fmt(totalDebit)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-emerald-500">{bn ? 'মোট দেবো' : 'Payable'}</p>
                  <p className="text-sm font-bold text-emerald-600">{fmt(totalCredit)}</p>
                </div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-slate-400">{bn ? 'পার্টি' : 'Parties'}</p>
              <p className="text-sm font-bold text-blue-600">{parties.length.toLocaleString(bn ? 'bn-BD' : 'en-US')}</p>
            </div>
          </div>
        </div>

        {/* কেনা / বেচা */}
        <div className="flex gap-3">
          <BigMenuIcon emoji="📦" label={bn ? 'কেনা' : 'Purchase'} language={language} onClick={() => comingSoon(language)} />
          <BigMenuIcon emoji="🏷️" label={bn ? 'বেচা' : 'Sale'} language={language} to={createPageUrl('Sale')} />
        </div>

        {/* খাতা সমূহ */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-3">
          <h3 className="text-sm font-bold text-gray-700 dark:text-slate-200 mb-3">{bn ? 'খাতা সমূহ' : 'Ledgers'}</h3>
          <div className="grid grid-cols-4 gap-2">
            <MenuIcon emoji="📋" label={bn ? 'কেনার খাতা' : 'Purchase Ledger'} language={language} />
            <MenuIcon emoji="📒" label={bn ? 'বেচার খাতা' : 'Sales Ledger'} to={createPageUrl('SalesLedger')} language={language} />
            <MenuIcon emoji="📓" label={bn ? 'বাকির খাতা' : 'Due Ledger'} to={createPageUrl('Khata')} language={language} />
            <MenuIcon emoji="💸" label={bn ? 'খরচের খাতা' : 'Expense Ledger'} to={createPageUrl('CashBox')} language={language} />
          </div>
        </div>

        {/* আপনার ব্যবসার জন্য */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-3">
          <h3 className="text-sm font-bold text-gray-700 dark:text-slate-200 mb-3">{bn ? 'আপনার ব্যবসার জন্য' : 'For Your Business'}</h3>
          <div className="grid grid-cols-4 gap-2">
            <MenuIcon emoji="👥" label={bn ? 'যোগাযোগ' : 'Contacts'} to={createPageUrl('Khata')} language={language} />
            <MenuIcon emoji="📦" label={bn ? 'প্রোডাক্ট লিস্ট' : 'Products'} to={createPageUrl('ProductList')} language={language} />
            <MenuIcon emoji="🏭" label={bn ? 'স্টকের হিসাব' : 'Stock'} language={language} />
            <MenuIcon emoji="📊" label={bn ? 'ব্যবসার রিপোর্ট' : 'Reports'} language={language} />
          </div>
        </div>

        {/* অন্যান্য */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-3">
          <h3 className="text-sm font-bold text-gray-700 dark:text-slate-200 mb-3">{bn ? 'অন্যান্য' : 'Others'}</h3>
          <div className="grid grid-cols-4 gap-2">
            <MenuIcon emoji="💰" label={bn ? 'ক্যাশবক্স' : 'Cash Box'} to={createPageUrl('CashBox')} language={language} />
            <MenuIcon emoji="⚙️" label={bn ? 'অ্যাপ একসেস' : 'App Access'} to={createPageUrl('Settings')} language={language} />
            <MenuIcon emoji="📲" label={bn ? 'মার্কেটিং' : 'Marketing'} language={language} />
            <MenuIcon emoji="💡" label={bn ? 'টপ আপ' : 'Top Up'} language={language} />
            <MenuIcon emoji="📤" label={bn ? 'ওয়াবেলি' : 'Waybill'} language={language} />
            <MenuIcon emoji="🗓️" label={bn ? 'মেয়াদোত্তীর্ণ' : 'Expired'} language={language} />
            <MenuIcon emoji="🖨️" label={bn ? 'প্রিন্টার' : 'Printer'} language={language} />
            <MenuIcon emoji="📄" label={bn ? 'পজ' : 'POS'} language={language} />
          </div>
        </div>

        {/* লেনদেন দেখুন */}
        <Link
          to={createPageUrl('Transactions')}
          className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm px-4 py-3 active:opacity-70"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔄</span>
            <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">{bn ? 'সকল লেনদেন দেখুন' : 'View All Transactions'}</span>
          </div>
          <span className="text-gray-400">›</span>
        </Link>
      </div>
    </div>
  );
}