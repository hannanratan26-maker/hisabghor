import React, { useState } from 'react';
import { ArrowLeft, Calendar, Minus, Plus, Trash2, ScanLine, ShieldCheck, ChevronRight } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import useBackClose from '@/hooks/useBackClose';
import { toast } from 'sonner';

/**
 * Cart / checkout step of the sale flow.
 * Rendered as an overlay so the cart stays in local state — closing it
 * (back button, X, or cancel) never touches product stock in the database.
 */
export default function SaleCartPage({ items, onClose, onChangeQty, onRemove, onNext }) {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [invoiceNo, setInvoiceNo] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [prices, setPrices] = useState({});
  const [discountOn, setDiscountOn] = useState(false);
  const [discountValue, setDiscountValue] = useState('');
  const [discountUnit, setDiscountUnit] = useState('৳'); // '৳' | '%'
  const [deliveryOn, setDeliveryOn] = useState(false);
  const [deliveryValue, setDeliveryValue] = useState('');

  useBackClose(true, onClose);

  const num = (n) => (Number(n) || 0).toLocaleString(bn ? 'bn-BD' : 'en-US');
  const priceOf = (it) => {
    const v = prices[it.id];
    return v === undefined || v === '' ? (it.sale_price || 0) : Number(v);
  };

  const subtotal = items.reduce((s, it) => s + priceOf(it) * it.qty, 0);
  const discount = !discountOn
    ? 0
    : discountUnit === '%'
      ? (subtotal * (Number(discountValue) || 0)) / 100
      : Number(discountValue) || 0;
  const delivery = deliveryOn ? Number(deliveryValue) || 0 : 0;
  const grandTotal = Math.max(0, subtotal - discount + delivery);

  const comingSoon = () => toast.info(bn ? 'শীঘ্রই আসবে!' : 'Coming Soon!', { duration: 1500 });

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div
        className="bg-brand-green text-white px-5 pb-6 rounded-b-3xl flex-shrink-0"
        style={{ paddingTop: 'calc(0.35rem + env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg active:opacity-70">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold flex-1">{bn ? 'কার্ট' : 'Cart'}</h1>
          <label className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg bg-white/20 active:opacity-70">
            <Calendar className="w-4 h-4 shrink-0" />
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none w-[6.5rem]"
            />
          </label>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-3 pb-4 space-y-3">
        {/* Invoice number */}
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">
            {bn ? 'চালান নং' : 'Invoice no.'}
          </p>
          <input
            value={invoiceNo}
            onChange={e => setInvoiceNo(e.target.value)}
            placeholder={bn ? 'চালান নম্বর লিখুন' : 'Enter invoice number'}
            className="w-full h-12 px-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-sm font-semibold focus:outline-none focus:border-blue-600 dark:text-slate-100"
          />
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[1fr_4rem_4rem_4rem] items-center bg-blue-600 text-white rounded-xl px-3 py-2 text-xs font-bold gap-2">
          <span>{bn ? 'পণ্য' : 'Product'}</span>
          <span className="text-center">{bn ? 'পরিমাণ' : 'Qty'}</span>
          <span className="text-center">{bn ? 'দর' : 'Rate'}</span>
          <span className="text-right">{bn ? 'মোট' : 'Total'}</span>
        </div>

        {/* Items */}
        <div className="space-y-2">
          {items.map(it => (
            <div
              key={it.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 px-3 py-3"
            >
              {/* Row 1: product name + action buttons aligned under the columns */}
              <div className="grid grid-cols-[1fr_4rem_4rem_4rem] items-start gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800 dark:text-slate-100 truncate">{it.name}</p>
                  {it.model && (
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      {bn ? 'মডেল' : 'Model'}: {it.model}
                    </p>
                  )}
                </div>
                <button onClick={comingSoon} className="flex items-center justify-center gap-1 h-7 rounded-lg border border-gray-200 dark:border-slate-600 text-[10px] font-semibold text-blue-600 active:opacity-70">
                  <ScanLine className="w-3 h-3" />
                  {bn ? 'বারকোড' : 'Barcode'}
                </button>
                <button onClick={comingSoon} className="flex items-center justify-center gap-1 h-7 rounded-lg border border-gray-200 dark:border-slate-600 text-[10px] font-semibold text-emerald-600 active:opacity-70">
                  <ShieldCheck className="w-3 h-3" />
                  {bn ? 'ওয়ারেন্টি' : 'Warranty'}
                </button>
                <button onClick={() => onRemove(it.id)} className="flex items-center justify-center gap-1 h-7 rounded-lg border border-gray-200 dark:border-slate-600 text-[10px] font-semibold text-red-500 active:opacity-70">
                  <Trash2 className="w-3 h-3" />
                  {bn ? 'মুছুন' : 'Remove'}
                </button>
              </div>

              {/* Row 2: image + qty / rate / total matching the header columns */}
              <div className="grid grid-cols-[1fr_4rem_4rem_4rem] items-center gap-2 mt-2">
                <div className="w-14 h-14 rounded-xl bg-gray-50 dark:bg-slate-700 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-slate-600">
                  {it.photo_url ? (
                    <img src={it.photo_url} alt={it.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">📦</span>
                  )}
                </div>
                <div className="flex items-center h-10 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 overflow-hidden">
                  <button
                    onClick={() => onChangeQty(it.id, -1)}
                    className="w-7 h-full flex items-center justify-center active:opacity-70"
                  >
                    <Minus className="w-3.5 h-3.5 text-gray-600 dark:text-slate-200" />
                  </button>
                  <span className="flex-1 text-center text-sm font-bold text-gray-800 dark:text-slate-100">{num(it.qty)}</span>
                  <button
                    onClick={() => onChangeQty(it.id, 1)}
                    className="w-7 h-full flex items-center justify-center active:opacity-70"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-600" />
                  </button>
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  value={prices[it.id] ?? (it.sale_price || 0)}
                  onChange={e => setPrices(p => ({ ...p, [it.id]: e.target.value }))}
                  className="w-full h-10 px-1 text-center rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-sm font-bold focus:outline-none focus:border-blue-600 dark:text-slate-100"
                />
                <div className="h-10 px-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 flex items-center justify-end">
                  <span className="text-sm font-bold text-gray-800 dark:text-slate-100">{num(priceOf(it) * it.qty)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Subtotal */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-700 dark:text-slate-200">{bn ? 'মোট' : 'Subtotal'}</span>
          <span className="text-base font-bold text-gray-900 dark:text-slate-100">৳ {num(subtotal)}</span>
        </div>

        {/* Discount */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-700 dark:text-slate-200">{bn ? 'ডিসকাউন্ট' : 'Discount'}</span>
            <button
              onClick={() => setDiscountOn(v => !v)}
              className={`w-12 h-6 rounded-full transition-colors relative ${discountOn ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${discountOn ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>
          {discountOn && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                value={discountValue}
                onChange={e => setDiscountValue(e.target.value)}
                placeholder="0"
                className="flex-1 h-11 px-3 rounded-xl bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-sm font-bold focus:outline-none focus:border-blue-600 dark:text-slate-100"
              />
              <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-slate-600">
                {['৳', '%'].map(u => (
                  <button
                    key={u}
                    onClick={() => setDiscountUnit(u)}
                    className={`w-11 h-11 text-sm font-bold ${discountUnit === u ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300'}`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Delivery charge */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-700 dark:text-slate-200">{bn ? 'ডেলিভারী চার্জ' : 'Delivery charge'}</span>
            <button
              onClick={() => setDeliveryOn(v => !v)}
              className={`w-12 h-6 rounded-full transition-colors relative ${deliveryOn ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${deliveryOn ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>
          {deliveryOn && (
            <input
              type="number"
              inputMode="decimal"
              value={deliveryValue}
              onChange={e => setDeliveryValue(e.target.value)}
              placeholder="0"
              className="w-full h-11 px-3 rounded-xl bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-sm font-bold focus:outline-none focus:border-blue-600 dark:text-slate-100"
            />
          )}
        </div>

        {/* Grand total */}
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-2xl border border-blue-200 dark:border-blue-800 px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-bold text-blue-800 dark:text-blue-200">{bn ? 'সর্বমোট' : 'Grand total'}</span>
          <span className="text-lg font-bold text-blue-800 dark:text-blue-100">৳ {num(grandTotal)}</span>
        </div>
      </div>

      {/* Next */}
      <div
        className="flex-shrink-0 px-3 pt-2 bg-gray-50 dark:bg-slate-900"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={() => onNext?.({ invoiceNo, date, subtotal, discount, delivery, grandTotal })}
          disabled={items.length === 0}
          className="w-full h-14 rounded-xl bg-blue-600 text-white text-base font-bold flex items-center justify-center gap-2 active:opacity-70 disabled:bg-gray-200 disabled:dark:bg-slate-800 disabled:text-gray-400"
        >
          {bn ? 'এগিয়ে যান' : 'Continue'}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
