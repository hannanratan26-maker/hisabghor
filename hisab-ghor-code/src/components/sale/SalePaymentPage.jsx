import React, { useState } from 'react';
import { ArrowLeft, Banknote, BookOpen, QrCode, UserPlus, ChevronDown } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import useBackClose from '@/hooks/useBackClose';
import { toast } from 'sonner';

/**
 * Payment confirmation step of the sale flow.
 * Rendered as an overlay on top of the cart — closing it (back button or
 * arrow) never touches product stock in the database.
 */
export default function SalePaymentPage({ summary, onClose, onConfirm, onDue }) {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const grandTotal = summary?.grandTotal || 0;
  const [received, setReceived] = useState(String(grandTotal || ''));
  const [method, setMethod] = useState(null); // null | 'cash' | 'due' | 'qr'
  const [note, setNote] = useState('');
  const [customerOn, setCustomerOn] = useState(false);
  const [employeeOn, setEmployeeOn] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [employeeMobile, setEmployeeMobile] = useState('');

  useBackClose(true, onClose);

  const num = (n) => (Number(n) || 0).toLocaleString(bn ? 'bn-BD' : 'en-US');
  const change = Math.max(0, (Number(received) || 0) - grandTotal);

  const comingSoon = () => toast.info(bn ? 'শীঘ্রই আসবে!' : 'Coming Soon!', { duration: 1500 });

  const METHODS = [
    { key: 'cash', label: bn ? 'নগদ টাকা' : 'Cash', icon: Banknote, color: 'text-emerald-600' },
    { key: 'due', label: bn ? 'বাকি' : 'Due', icon: BookOpen, color: 'text-blue-600' },
    { key: 'qr', label: bn ? 'বিকাশ/নগদ কিউআর' : 'bKash/Nagad QR', icon: QrCode, color: 'text-pink-600' },
  ];

  const handleConfirm = (payMethod = method) => {
    onConfirm?.({
      ...summary,
      received: Number(received) || 0,
      change,
      method: payMethod,
      note,
      customerOn,
      employeeOn,
      customer: customerOn
        ? { name: customerName, mobile: customerMobile, address: customerAddress }
        : null,
      employee: employeeOn
        ? { name: employeeName, mobile: employeeMobile }
        : null,
    });
  };

  const MobilePrefix = () => (
    <div className="flex items-center gap-2 px-3 h-full border-r border-gray-200 dark:border-slate-600 shrink-0">
      <span className="w-5 h-5 rounded-full bg-brand-green flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-red-500" />
      </span>
      <span className="text-sm font-semibold text-gray-800 dark:text-slate-100">+88</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div
        className="bg-brand-green text-white px-5 pb-6 rounded-b-3xl flex-shrink-0"
        style={{ paddingTop: 'calc(0.35rem + env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg active:opacity-70">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold flex-1">{bn ? 'পেমেন্ট কনফার্ম করুন' : 'Confirm payment'}</h1>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-3 pb-4 space-y-4">
        {/* Grand total */}
        <div className="bg-blue-600 text-white rounded-2xl px-4 py-4 flex items-center justify-between">
          <span className="text-base font-bold">{bn ? 'সর্বমোট' : 'Grand total'}</span>
          <span className="text-2xl font-bold">{num(grandTotal)}</span>
        </div>

        {/* Cash received */}
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
            {bn ? 'ক্যাশ পেয়েছি' : 'Cash received'}
          </p>
          <input
            type="number"
            inputMode="decimal"
            value={received}
            onChange={e => setReceived(e.target.value)}
            className="w-full h-14 px-4 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-lg font-bold focus:outline-none focus:border-blue-600 dark:text-slate-100"
          />
          <p className="text-sm font-semibold text-gray-600 dark:text-slate-300 pt-1">
            {bn ? 'ফেরত দিবেন' : 'Change'} <span className="text-blue-700 dark:text-blue-300">{num(change)}</span>
          </p>
        </div>

        {/* Payment methods */}
        <div className="grid grid-cols-3 gap-2">
          {METHODS.map(m => (
            <button
              key={m.key}
              onClick={() => {
                if (m.key === 'qr') return comingSoon();
                // Cash sales finish immediately and open the receipt —
                // no "Complete sale" button in between.
                if (m.key === 'cash') return handleConfirm('cash');
                // Due sales go to the "New due" step instead.
                if (m.key === 'due') {
                  setMethod('due');
                  return onDue?.({ ...summary, note });
                }
                setMethod(m.key);
              }}
              className={`bg-white dark:bg-slate-800 rounded-2xl border px-2 py-4 flex flex-col items-center gap-2 active:opacity-70 transition-colors ${
                method === m.key
                  ? 'border-blue-600 ring-1 ring-blue-600'
                  : 'border-gray-100 dark:border-slate-700'
              }`}
            >
              <m.icon className={`w-10 h-10 ${m.color}`} />
              <span className="text-xs font-bold text-gray-800 dark:text-slate-100 text-center leading-tight">
                {m.label}
              </span>
            </button>
          ))}
        </div>

        {/* Note */}
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">
            {bn ? 'মন্তব্য লিখুন' : 'Write a note'}
          </p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={bn ? 'মন্তব্য লিখুন' : 'Write a note'}
            rows={2}
            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-sm font-medium focus:outline-none focus:border-blue-600 dark:text-slate-100 resize-none"
          />
        </div>

        {/* Customer info toggle */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-700 dark:text-slate-200">
              {bn ? 'কাস্টমার তথ্য' : 'Customer info'}
            </span>
            <button
              onClick={() => setCustomerOn(v => !v)}
              className={`w-12 h-6 rounded-full transition-colors relative ${customerOn ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${customerOn ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>
          {customerOn && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">{bn ? 'কাস্টমারের নাম' : 'Customer name'}</p>
                <div className="flex items-center h-12 rounded-xl bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 overflow-hidden">
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder={bn ? 'কাস্টমারের নাম' : 'Customer name'}
                    className="flex-1 min-w-0 h-full px-3 bg-transparent text-sm font-semibold focus:outline-none dark:text-slate-100"
                  />
                  <button onClick={comingSoon} className="px-3 shrink-0 active:opacity-70">
                    <UserPlus className="w-5 h-5 text-blue-600" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">{bn ? 'কাস্টমার মোবাইল' : 'Customer mobile'}</p>
                <div className="flex items-center h-12 rounded-xl bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 overflow-hidden">
                  <MobilePrefix />
                  <input
                    type="tel"
                    inputMode="tel"
                    value={customerMobile}
                    onChange={e => setCustomerMobile(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder={bn ? 'কাস্টমার মোবাইল' : 'Customer mobile'}
                    className="flex-1 min-w-0 h-full px-3 bg-transparent text-sm font-semibold focus:outline-none dark:text-slate-100"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">{bn ? 'কাস্টমারের ঠিকানা' : 'Customer address'}</p>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={e => setCustomerAddress(e.target.value)}
                  placeholder={bn ? 'কাস্টমারের ঠিকানা' : 'Customer address'}
                  className="w-full h-12 px-3 rounded-xl bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-sm font-semibold focus:outline-none focus:border-blue-600 dark:text-slate-100"
                />
              </div>
            </div>
          )}
        </div>

        {/* Employee info toggle */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-700 dark:text-slate-200">
              {bn ? 'কর্মচারী তথ্য' : 'Employee info'}
            </span>
            <button
              onClick={() => setEmployeeOn(v => !v)}
              className={`w-12 h-6 rounded-full transition-colors relative ${employeeOn ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${employeeOn ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>
          {employeeOn && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">{bn ? 'কর্মচারীর নাম' : 'Employee name'}</p>
                <button
                  onClick={comingSoon}
                  className="w-full h-12 px-3 rounded-xl bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 flex items-center justify-between active:opacity-70"
                >
                  <span className="text-sm font-semibold text-gray-500 dark:text-slate-300">
                    {employeeName || (bn ? 'কর্মচারী নির্বাচন করুন' : 'Select employee')}
                  </span>
                  <ChevronDown className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                </button>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">{bn ? 'মোবাইল নম্বর' : 'Mobile number'}</p>
                <div className="flex items-center h-12 rounded-xl bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 overflow-hidden">
                  <MobilePrefix />
                  <input
                    type="tel"
                    inputMode="tel"
                    value={employeeMobile}
                    onChange={e => setEmployeeMobile(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder={bn ? 'মোবাইল নম্বর' : 'Mobile number'}
                    className="flex-1 min-w-0 h-full px-3 bg-transparent text-sm font-semibold focus:outline-none dark:text-slate-100"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm */}
      {method && method !== 'due' && (
        <div
          className="flex-shrink-0 px-3 pt-2 bg-gray-50 dark:bg-slate-900"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={handleConfirm}
            className="w-full h-14 rounded-xl bg-blue-600 text-white text-base font-bold flex items-center justify-center gap-2 active:opacity-70"
          >
            {bn ? 'বিক্রি সম্পন্ন করুন' : 'Complete sale'}
          </button>
        </div>
      )}
    </div>
  );
}
