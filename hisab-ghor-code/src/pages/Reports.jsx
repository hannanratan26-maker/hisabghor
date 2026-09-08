import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, TrendingDown, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import StatCard from '../components/shared/StatCard';
import { useLanguage } from '../components/LanguageContext';
import { useAuth } from '@/lib/AuthContext';

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

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#a855f7'];

export default function Reports() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const CATEGORY_LABELS = language === 'bn' ? CATEGORY_LABELS_BN : CATEGORY_LABELS_EN;
  
  const { data: parties = [], isLoading: lp } = useQuery({
    queryKey: ['parties', user?.email],
    queryFn: () => base44.entities.Party.filter({ created_by: user.email }),
    enabled: !!user,
  });
  const { data: cashEntries = [], isLoading: lc } = useQuery({
    queryKey: ['cashEntries', user?.email],
    queryFn: () => base44.entities.CashEntry.filter({ created_by: user.email }),
    enabled: !!user,
  });
  const { data: transactions = [], isLoading: lt } = useQuery({
    queryKey: ['transactions', user?.email],
    queryFn: () => base44.entities.Transaction.filter({ created_by: user.email }),
    enabled: !!user,
  });

  const isLoading = lp || lc || lt;

  const totalDebit = parties.reduce((s, p) => s + (p.total_debit || 0), 0);
  const totalCredit = parties.reduce((s, p) => s + (p.total_credit || 0), 0);
  const cashIn = cashEntries.reduce((s, e) => s + (e.type === 'cash_in' ? e.amount : 0), 0);
  const cashOut = cashEntries.reduce((s, e) => s + (e.type === 'cash_out' ? e.amount : 0), 0);

  // Category breakdown for cash out
  const categoryData = Object.entries(
    cashEntries
      .filter(e => e.type === 'cash_out')
      .reduce((acc, e) => {
        acc[e.category || 'other'] = (acc[e.category || 'other'] || 0) + e.amount;
        return acc;
      }, {})
  ).map(([key, value]) => ({ name: CATEGORY_LABELS[key] || key, value }))
   .sort((a, b) => b.value - a.value);

  // Top parties by balance
  const topParties = [...parties]
    .map(p => ({
      name: p.name,
      balance: Math.abs((p.total_debit || 0) - (p.total_credit || 0)),
    }))
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 8);

  return (
    <div className="pb-6">
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white px-5 pt-6 pb-10 -mx-4 -mt-4 rounded-b-3xl">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6" /> {language === 'bn' ? 'রিপোর্ট' : 'Reports'}
        </h1>
        <p className="text-amber-100 text-sm mt-1">{language === 'bn' ? 'ব্যবসার বিস্তারিত বিশ্লেষণ' : 'Detailed Business Analysis'}</p>
      </div>

      <div className="px-1 -mt-6">
        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
            </div>
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label={language === 'bn' ? 'মোট দেনা' : 'Total Gave'} value={totalDebit} icon={TrendingDown} color="red" />
              <StatCard label={language === 'bn' ? 'মোট পাওনা' : 'Total Received'} value={totalCredit} icon={TrendingUp} color="emerald" />
              <StatCard label={language === 'bn' ? 'ক্যাশ ইন' : 'Cash In'} value={cashIn} icon={TrendingUp} color="blue" />
              <StatCard label={language === 'bn' ? 'ক্যাশ আউট' : 'Cash Out'} value={cashOut} icon={TrendingDown} color="amber" />
            </div>

            {/* Expense Breakdown */}
            {categoryData.length > 0 && (
              <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
                  <PieChartIcon className="w-5 h-5 text-amber-500" /> {language === 'bn' ? 'খরচের ক্যাটাগরি' : 'Expense Categories'}
                </h2>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`৳${value.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {categoryData.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      {item.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Parties */}
            {topParties.length > 0 && (
              <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5">
                <h2 className="font-semibold text-gray-800 mb-4">{language === 'bn' ? 'শীর্ষ পার্টি (ব্যালেন্স অনুযায়ী)' : 'Top Parties (By Balance)'}</h2>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topParties} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#555' }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip formatter={(value) => [`৳${value.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}`, language === 'bn' ? 'ব্যালেন্স' : 'Balance']} />
                      <Bar dataKey="balance" fill="#f59e0b" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-800 mb-3">{language === 'bn' ? 'সারসংক্ষেপ' : 'Summary'}</h2>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{language === 'bn' ? 'মোট পার্টি' : 'Total Parties'}</span>
                  <span className="font-semibold">{parties.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{language === 'bn' ? 'মোট লেনদেন' : 'Total Transactions'}</span>
                  <span className="font-semibold">{transactions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{language === 'bn' ? 'মোট ক্যাশ এন্ট্রি' : 'Total Cash Entries'}</span>
                  <span className="font-semibold">{cashEntries.length}</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-2.5">
                  <span className="text-gray-500">{language === 'bn' ? 'নেট ক্যাশ ব্যালেন্স' : 'Net Cash Balance'}</span>
                  <span className={`font-bold ${cashIn - cashOut >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    ৳{(cashIn - cashOut).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}