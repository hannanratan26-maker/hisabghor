import React, { useRef, useState, useCallback } from 'react';
import { X, Printer, Share2 } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import useBackClose from '@/hooks/useBackClose';
import { toast } from 'sonner';

/**
 * Receipt view shown right after a sale is recorded.
 * Supports printing and sharing the receipt.
 */
export default function SaleReceiptPage({ receipt, shop, onClose, onNewSale, backToParty }) {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const printRef = useRef(null);
  const [closing, setClosing] = useState(false);

  // Play the right-to-left exit animation before unmounting. When returning
  // to the party details page the animation still plays, but a solid backdrop
  // is rendered underneath so the Sale page never flashes behind the
  // closing receipt — the navigation at the end unmounts both layers.
  const closeWithAnim = useCallback((cb) => {
    setClosing(true);
    setTimeout(() => cb?.(), 240);
  }, []);

  useBackClose(true, () => closeWithAnim(onClose));



  const num = (n) => (Number(n) || 0).toLocaleString(bn ? 'bn-BD' : 'en-US');
  const money = (n) => num(n) + ' ৳';
  const dash = bn ? '[দেওয়া হয়নি]' : '[not provided]';

  const items = receipt?.items || [];
  const d = receipt?.sale_date ? new Date(receipt.sale_date) : new Date();
  const pad = (v) => String(v).padStart(2, '0');
  const dateText = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const methodLabel = {
    cash: bn ? 'নগদ টাকা' : 'Cash',
    due: bn ? 'বাকি' : 'Due',
    qr: bn ? 'বিকাশ/নগদ কিউআর' : 'bKash/Nagad QR',
  }[receipt?.payment_method] || (bn ? 'নগদ টাকা' : 'Cash');

  const handlePrint = () => {
    const html = printRef.current?.innerHTML;
    if (!html) return;

    // Copy the app's own stylesheets so the printed page keeps the exact
    // on-screen layout (Tailwind grid/spacing) instead of raw unstyled HTML.
    const headStyles = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style'),
    )
      .map((el) => el.outerHTML)
      .join('\n');

    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(frame);
    const doc = frame.contentWindow.document;
    doc.open();
    doc.write(
      `<html><head><title>${receipt?.receipt_no || 'Receipt'}</title>` +
        headStyles +
        `<style>
          @page { size: A4 portrait; margin: 12mm; }
          html, body { background:#fff !important; }
          body {
            margin:0;
            color:#000 !important;
            font-family:'Noto Sans Bengali','Inter',system-ui,-apple-system,sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .receipt-print {
            width: 100%;
            max-width: 190mm;
            margin: 0 auto;
            color:#000 !important;
          }
          .receipt-print * { color:#000 !important; }
          .receipt-print img { max-height: 64px; }
          @media print { .receipt-print { page-break-inside: auto; } }
        </style></head>` +
        `<body><div class="receipt-print">${html}</div></body></html>`,
    );
    doc.close();
    frame.contentWindow.focus();
    setTimeout(() => {
      frame.contentWindow.print();
      setTimeout(() => frame.remove(), 1000);
    }, 400);
  };


  const handleShare = async () => {
    const lines = [
      shop?.name || '',
      shop?.owner_phone || '',
      shop?.address || '',
      '',
      `${bn ? 'রিসিপ্ট' : 'Receipt'} # ${receipt?.receipt_no || ''}`,
      `${bn ? 'তারিখ' : 'Date'}: ${dateText}`,
      '',
      ...items.map(
        (i, idx) => `${num(idx + 1)}. ${i.name} — ${num(i.qty)} x ${num(i.price)} = ${money(i.total)}`,
      ),
      '',
      `${bn ? 'মোট প্রদেয়' : 'Total payable'}: ${money(receipt?.total)}`,
      `${bn ? 'মূল্য পেয়েছেন' : 'Paid'}: ${money(receipt?.paid)}`,
      `${bn ? 'এই লেনদেনের বাকি' : 'Due'}: ${money(receipt?.due)}`,
      `${bn ? 'মূল্যপরিশোধ পদ্ধতি' : 'Payment method'}: ${methodLabel}`,
    ].filter((l) => l !== undefined);
    const text = lines.join('\n');
    try {
      if (navigator.share) await navigator.share({ title: receipt?.receipt_no || 'Receipt', text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success(bn ? 'রিসিপ্ট কপি হয়েছে' : 'Receipt copied');
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <>
    <div
      className={`fixed inset-0 z-[60] flex flex-col bg-white dark:bg-slate-900 ${
        closing ? 'animate-camera-slide-out' : 'animate-camera-slide-in'
      }`}
    >
      {/* Header */}
      <div
        className="bg-brand-green text-white px-4 pb-4 rounded-b-3xl flex-shrink-0"
        style={{ paddingTop: 'calc(0.35rem + env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold flex-1 text-center">
            {bn ? 'বিক্রি করেছেন' : 'You sold'}{' '}
            <span className="text-lg">{money(receipt?.total)}</span>{' '}
            {bn ? 'মূল্যের পণ্য' : 'worth of goods'}
          </h1>
          <button onClick={() => closeWithAnim(onClose)} className="p-1.5 hover:bg-white/20 rounded-lg active:opacity-70">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-4">
        <div ref={printRef} className="text-gray-900 dark:text-slate-100">
          {/* Shop head */}
          <div className="text-center space-y-1">
            {shop?.logo_url && (
              <img src={shop.logo_url} alt={shop?.name || 'shop logo'} className="h-16 mx-auto object-contain" />
            )}
            <p className="text-2xl font-bold">{shop?.name || ''}</p>
            {shop?.owner_phone && <p className="text-sm font-medium">{shop.owner_phone}</p>}
            {shop?.address && <p className="text-sm font-medium">{shop.address}</p>}
          </div>

          {/* Receipt meta */}
          <div className="mt-4 space-y-0.5">
            <p className="text-base font-bold">
              {bn ? 'রিসিপ্ট' : 'Receipt'} # {receipt?.receipt_no}
            </p>
            <p className="text-sm font-bold">
              {bn ? 'তারিখ' : 'Date'} : {dateText}
            </p>
          </div>

          <div className="mt-3 space-y-0.5 text-sm font-semibold">
            <p className="font-bold">{bn ? 'নাম' : 'Name'} : {receipt?.customer_name || dash}</p>
            <p>{bn ? 'মোবাইল' : 'Mobile'} : {receipt?.customer_phone || dash}</p>
            <p>{bn ? 'ঠিকানা' : 'Address'} : {receipt?.customer_address || dash}</p>
          </div>

          {/* Items */}
          <div className="mt-3 border-t border-dashed border-gray-400 pt-2">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-xs font-semibold pb-1">
              <span>{bn ? 'পণ্যের নাম' : 'Item'}</span>
              <span className="w-14 text-right">{bn ? 'দাম' : 'Price'}</span>
              <span className="w-16 text-right">{bn ? 'পরিমান' : 'Qty'}</span>
              <span className="w-16 text-right">{bn ? 'মোট দাম' : 'Total'}</span>
            </div>
            <div className="border-t border-dashed border-gray-400 pt-1 space-y-1">
              {items.length === 0 && (
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-xs font-semibold">
                  <span>{receipt?.items_summary || (bn ? 'দ্রুত বিক্রি' : 'Quick sale')}</span>
                  <span className="w-14 text-right">{num(receipt?.total)}</span>
                  <span className="w-16 text-right">-</span>
                  <span className="w-16 text-right">{money(receipt?.total)}</span>
                </div>
              )}
              {items.map((i, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-xs font-semibold">
                  <span>{num(idx + 1)}. {i.name}</span>
                  <span className="w-14 text-right">{num(i.price)}</span>
                  <span className="w-16 text-right">{num(i.qty)} {bn ? 'পিস' : 'pcs'}</span>
                  <span className="w-16 text-right">{money(i.total)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="mt-3 border-t border-gray-300 pt-3 space-y-1 text-sm font-semibold">
            <Row label={bn ? 'মোট:' : 'Subtotal:'} value={money(receipt?.subtotal ?? receipt?.total)} />
            <Row label={bn ? '(-) ডিসকাউন্ট:' : '(-) Discount:'} value={money(receipt?.discount)} />
            <Row label={bn ? 'ডেলিভারি চার্জ:' : 'Delivery charge:'} value={money(receipt?.delivery_charge)} />
            <div className="border-t border-dashed border-gray-400 pt-2 space-y-1">
              <Row bold label={bn ? 'মোট প্রদেয়:' : 'Total payable:'} value={money(receipt?.total)} />
              <Row bold label={bn ? 'মূল্য পেয়েছেন:' : 'Amount received:'} value={money(receipt?.paid)} />
              <Row bold label={bn ? 'এই লেনদেনের বাকি:' : 'Due for this sale:'} value={money(receipt?.due)} />
            </div>
          </div>

          <div className="mt-3 space-y-1 text-sm font-semibold">
            <p>{bn ? 'মূল্যপরিশোধ পদ্ধতি' : 'Payment method'}: {methodLabel}</p>
            {receipt?.note && <p>{bn ? 'নোটঃ' : 'Note:'} {receipt.note}</p>}
            {receipt?.employee_name && (
              <p>{bn ? 'কর্মচারী' : 'Employee'}: {receipt.employee_name}</p>
            )}
          </div>

          <p className="mt-4 text-center text-xs font-medium text-gray-500 dark:text-slate-400">
            Powered by: {bn ? 'হিসাবঘর' : 'Hisab Ghor'}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={handlePrint}
            className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 active:opacity-70"
          >
            <Printer className="w-8 h-8 text-blue-600" />
            <span className="text-sm font-bold text-gray-800 dark:text-slate-100">
              {bn ? 'রিসিপ্ট প্রিন্ট করুন' : 'Print receipt'}
            </span>
          </button>
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 active:opacity-70"
          >
            <Share2 className="w-8 h-8 text-emerald-600" />
            <span className="text-sm font-bold text-gray-800 dark:text-slate-100">
              {bn ? 'রিসিপ্ট শেয়ার' : 'Share receipt'}
            </span>
          </button>
        </div>
      </div>

      <div
        className="flex-shrink-0 px-4 pt-2"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={() => closeWithAnim(onNewSale || onClose)}
          className="w-full h-14 rounded-xl bg-blue-600 text-white text-base font-bold active:opacity-70"
        >
          {backToParty
            ? bn ? 'পার্টি বিবরণে ফিরে যান' : 'Back to party details'
            : bn ? 'নতুন বিক্রয় শুরু করুন' : 'Start a new sale'}
        </button>
      </div>
    </div>
    </>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex items-center justify-end gap-4">
      <span className={bold ? 'font-bold' : ''}>{label}</span>
      <span className={`w-20 text-right ${bold ? 'font-bold' : ''}`}>{value}</span>
    </div>
  );
}
