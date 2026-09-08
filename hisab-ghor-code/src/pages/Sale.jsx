import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { compressImage } from '@/lib/imageCompress';
import ImageCropDialog from '../components/party/ImageCropDialog';
import { Search, Package, ArrowLeft, Filter, ScanLine, X, Minus, Plus, ChevronRight, Calendar, Camera, Image, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../components/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import EmptyState from '../components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import SubCategoryFilterDialog from '../components/product/SubCategoryFilterDialog';
import SaleCartPage from '../components/sale/SaleCartPage';
import SalePaymentPage from '../components/sale/SalePaymentPage';
import SaleReceiptPage from '../components/sale/SaleReceiptPage';
import PartyDetail from './PartyDetail';
import SaleDuePage from '../components/sale/SaleDuePage';
import { getActiveShopId } from '@/lib/shop';
import CountryCodeSelect, { DEFAULT_COUNTRY, isValidPhoneFor, toE164, splitPhone } from '../components/shared/CountryCodeSelect';
const BarcodeScanner = React.lazy(() => import('../components/product/BarcodeScanner'));


export default function Sale() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const bn = language === 'bn';
  const navigate = useNavigate();

  const [tab, setTab] = useState('list'); // 'quick' | 'list'
  const [search, setSearch] = useState('');
  const [scannedBarcode, setScannedBarcode] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [selectedSubCats, setSelectedSubCats] = useState([]);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [cart, setCart] = useState({}); // { [productId]: qty }
  const [quickAmount, setQuickAmount] = useState('');
  const [quickDate, setQuickDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [quickPhoto, setQuickPhoto] = useState(null);
  const [quickPhone, setQuickPhone] = useState('');
  const [quickCountry, setQuickCountry] = useState(DEFAULT_COUNTRY);
  const [quickCustomerName, setQuickCustomerName] = useState('');
  const [quickProfit, setQuickProfit] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const [quickSuccess, setQuickSuccess] = useState(null);
  const [showQuickPartyPicker, setShowQuickPartyPicker] = useState(false);
  const [quickPickerSearch, setQuickPickerSearch] = useState('');
  const [photoChooserOpen, setPhotoChooserOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [showCrop, setShowCrop] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [dueSummary, setDueSummary] = useState(null);
  // Party preselected from PartyDetail's "পণ্য বাকী" flow (?duePartyId=...)
  const [duePrefill] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    const id = p.get('duePartyId');
    if (!id) return null;
    return {
      id,
      name: p.get('duePartyName') || '',
      phone: p.get('duePartyPhone') || '',
      type: p.get('duePartyType') || 'customer',
      address: p.get('duePartyAddress') || '',
      photo: p.get('duePartyPhoto') || null,
    };
  });
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [partyBackdropReady, setPartyBackdropReady] = useState(false);
  const queryClient = useQueryClient();

  const closeCheckout = () => {
    setDueSummary(null);
    setPaymentSummary(null);
    setShowCart(false);
  };

  // Preload scanner module so the camera opens instantly on first tap.
  useEffect(() => { import('../components/product/BarcodeScanner'); }, []);

  // Keep the checkout screen behind the receipt during its slide-in. Once the
  // receipt fully covers the viewport, prepare PartyDetail underneath so the
  // closing slide reveals it without showing it during the opening animation.
  useEffect(() => {
    if (!receipt || !duePrefill?.id) {
      setPartyBackdropReady(false);
      return;
    }
    const timer = setTimeout(() => setPartyBackdropReady(true), 270);
    return () => clearTimeout(timer);
  }, [receipt, duePrefill]);

  const cameraInputRef = React.useRef(null);
  const galleryInputRef = React.useRef(null);


  const handlePhotoSelected = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setCropSrc(ev.target.result); setShowCrop(true); };
    reader.readAsDataURL(f);
  };


  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', user?.email],
    queryFn: () => base44.entities.Product.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user,
  });

  const shopId = getActiveShopId();
  const { data: shop = null } = useQuery({
    queryKey: ['shop', shopId],
    queryFn: () => base44.entities.Shop.get(shopId),
    enabled: !!shopId,
  });

  const { data: parties = [] } = useQuery({
    queryKey: ['parties', user?.email],
    queryFn: () => base44.entities.Party.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user,
  });

  const filtered = products.filter(p => {
    const matchesSubCat = selectedSubCats.length === 0 || selectedSubCats.includes(p.sub_category);
    if (scannedBarcode) return (p.barcode || '') === scannedBarcode && matchesSubCat;
    const q = search.toLowerCase().trim();
    const text = ((p.name || '') + ' ' + (p.description || '')).toLowerCase();
    return (!q || text.includes(q)) && matchesSubCat;
  });

  const quickPickerList = useMemo(() => {
    const q = quickPickerSearch.trim().toLowerCase();
    return parties
      .filter(p => (p.type || 'customer') === 'customer')
      .filter(p => !q || p.name?.toLowerCase().includes(q) || (p.phone || '').includes(q));
  }, [parties, quickPickerSearch]);

  const selectQuickParty = (p) => {
    const sp = splitPhone(p.phone);
    setQuickPhone(sp.national);
    setQuickCountry(sp.country || DEFAULT_COUNTRY);
    setQuickCustomerName(p.name || '');
    setShowQuickPartyPicker(false);
    setQuickPickerSearch('');
  };

  const num = (n) => (n || 0).toLocaleString(bn ? 'bn-BD' : 'en-US');
  const fmt = (n) => num(n) + ' ৳';

  const itemCount = Object.values(cart).reduce((s, q) => s + q, 0);
  const total = Object.entries(cart).reduce((s, [id, q]) => {
    const p = products.find(x => x.id === id);
    return s + (p ? (p.sale_price || 0) * q : 0);
  }, 0);

  const addToCart = (p) => {
    setCart(c => {
      const stock = Math.max(0, p.stock || 0);
      const qty = c[p.id] || 0;
      if (qty >= stock) {
        toast.info(bn ? 'স্টক শেষ!' : 'Out of stock!', { duration: 1500 });
        return c;
      }
      return { ...c, [p.id]: qty + 1 };
    });
  };
  const decFromCart = (p) => {
    setCart(c => {
      const next = { ...c };
      const q = (next[p.id] || 0) - 1;
      if (q <= 0) delete next[p.id]; else next[p.id] = q;
      return next;
    });
  };

  const cartItems = Object.entries(cart)
    .map(([id, qty]) => {
      const p = products.find(x => x.id === id);
      return p ? { ...p, qty } : null;
    })
    .filter(Boolean);

  const changeCartQty = (id, delta) => {
    const p = products.find(x => x.id === id);
    if (!p) return;
    if (delta > 0) addToCart(p); else decFromCart(p);
  };
  const removeFromCart = (id) => setCart(c => { const n = { ...c }; delete n[id]; return n; });

  

  const genReceipt = () =>
    'S' + new Date().toISOString().slice(2, 10).replace(/-/g, '') +
    '-' + Math.random().toString(36).slice(2, 6).toUpperCase();

  const afterSaleSaved = (savedRecord) => {
    // Reflect the sale on the dashboard instantly, before the refetch lands.
    if (savedRecord) {
      queryClient.setQueryData(['sales', user?.email], (old) =>
        Array.isArray(old) && !old.some(s => s.receipt_no === savedRecord.receipt_no)
          ? [savedRecord, ...old]
          : old,
      );
    }
    queryClient.invalidateQueries({ queryKey: ['products', user?.email] });
    queryClient.invalidateQueries({ queryKey: ['sales'] });
  };

  const quickPhoneInvalid = !!quickPhone.trim() && !isValidPhoneFor(quickCountry, quickPhone);

  const submitQuickSale = async () => {
    if (saving || quickPhoneInvalid) return;
    setSaving(true);
    try {
      const amount = Number(quickAmount) || 0;
      const created = await base44.entities.Sale.create({
        receipt_no: genReceipt(),
        sale_type: 'quick',
        payment_method: 'cash',
        item_count: 0,
        items: [],
        items_summary: quickNote || (bn ? 'দ্রুত বিক্রি' : 'Quick sale'),
        subtotal: amount,
        total: amount,
        paid: amount,
        due: 0,
        profit: Number(quickProfit) || 0,
        customer_name: quickCustomerName || null,
        customer_phone: quickPhone ? toE164(quickCountry, quickPhone) : null,
        note: quickNote || null,
        photo_url: quickPhoto || null,
        sale_date: (() => {
          const now = new Date();
          const [y, m, d] = quickDate.split('-').map(Number);
          return new Date(y, (m || 1) - 1, d || 1, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
        })(),
      });
      afterSaleSaved(created);
      setQuickAmount(''); setQuickProfit(''); setQuickPhone(''); setQuickCustomerName(''); setQuickNote(''); setQuickPhoto(null);
      setQuickSuccess(amount);
      setTimeout(() => setQuickSuccess(null), 2200);
    } catch (err) {
      toast.error(err?.message || (bn ? 'সেভ করা যায়নি' : 'Could not save'));
    } finally {
      setSaving(false);
    }
  };

  const completeCartSale = async (payload) => {
    if (saving) return;
    setSaving(true);
    try {
      const items = cartItems.map(p => ({
        id: p.id,
        name: p.name,
        qty: p.qty,
        price: p.sale_price || 0,
        purchase_price: p.purchase_price || 0,
        total: (p.sale_price || 0) * p.qty,
      }));
      const grandTotal = payload.grandTotal || 0;
      const paid = payload.method === 'due' ? 0 : Math.min(payload.received || 0, grandTotal);
      const profit = items.reduce((s, i) => s + (i.price - i.purchase_price) * i.qty, 0);
      const record = {
        receipt_no: payload.invoiceNo || genReceipt(),
        sale_type: 'product',
        payment_method: payload.method || 'cash',
        item_count: items.reduce((s, i) => s + i.qty, 0),
        items,
        items_summary: items.map(i => i.name).join(', '),
        subtotal: payload.subtotal || 0,
        discount: payload.discount || 0,
        delivery_charge: payload.delivery || 0,
        total: grandTotal,
        paid,
        due: Math.max(0, grandTotal - paid),
        profit,
        customer_name: payload.customer?.name || null,
        customer_phone: payload.customer?.mobile ? '+88' + payload.customer.mobile : null,
        customer_address: payload.customer?.address || null,
        employee_name: payload.employee?.name || null,
        employee_phone: payload.employee?.mobile ? '+88' + payload.employee.mobile : null,
        note: payload.note || null,
        sale_date: new Date().toISOString(),
      };
      // Show the receipt instantly on top of the payment page; the payment/cart
      // layers are removed only after the slide-in finishes so the sale page
      // never flashes behind it. Saving continues in the background.
      setReceipt(record);
      setCart({});
      setTimeout(() => {
        setPaymentSummary(null);
        setShowCart(false);
      }, 300);

      // Reflect the new stock instantly in the UI, then persist in background.
      const qtyById = new Map(items.map(i => [i.id, i.qty]));
      queryClient.setQueryData(['products', user?.email], (old) =>
        Array.isArray(old)
          ? old.map(p => qtyById.has(p.id)
            ? { ...p, stock: Math.max(0, (p.stock || 0) - qtyById.get(p.id)) }
            : p)
          : old,
      );

      // Instant dashboard update with the local record; server write follows.
      afterSaleSaved({ ...record, id: record.receipt_no, created_date: record.sale_date });

      Promise.all([
        base44.entities.Sale.create(record),
        ...items.map((i) => {
          const p = products.find(x => x.id === i.id);
          if (!p) return null;
          return base44.entities.Product.update(i.id, { stock: Math.max(0, (p.stock || 0) - i.qty) });
        }).filter(Boolean),
      ])
        .then(([saved]) => afterSaleSaved(saved))
        .catch((err) => {
          toast.error(err?.message || (bn ? 'সেভ করা যায়নি' : 'Could not save'));
          afterSaleSaved();
        });



    } catch (err) {
      toast.error(err?.message || (bn ? 'সেভ করা যায়নি' : 'Could not save'));
    } finally {
      setSaving(false);
    }
  };

  // Due sale: adds/updates the party in the ledger, records a credit-sale
  // entry, saves the sale as due and opens the receipt.
  const completeDueSale = async (payload) => {
    if (saving) return;
    setSaving(true);
    try {
      const items = cartItems.map(p => ({
        id: p.id,
        name: p.name,
        qty: p.qty,
        price: p.sale_price || 0,
        purchase_price: p.purchase_price || 0,
        total: (p.sale_price || 0) * p.qty,
      }));
      const grandTotal = payload.grandTotal || 0;
      const amount = payload.amount || grandTotal;
      const profit = items.reduce((s, i) => s + (i.price - i.purchase_price) * i.qty, 0);
      const phone = payload.mobile || null;
      const record = {
        receipt_no: payload.invoiceNo || genReceipt(),
        sale_type: 'product',
        payment_method: 'due',
        item_count: items.reduce((s, i) => s + i.qty, 0),
        items,
        items_summary: items.map(i => i.name).join(', '),
        subtotal: payload.subtotal || 0,
        discount: payload.discount || 0,
        delivery_charge: payload.delivery || 0,
        total: grandTotal,
        paid: 0,
        due: grandTotal,
        profit,
        customer_name: payload.name || null,
        customer_phone: phone,
        customer_address: payload.address || null,
        note: payload.note || null,
        sale_date: new Date().toISOString(),
      };

      // Show the receipt right away; ledger + stock writes run in background.
      setReceipt(record);
      setCart({});
      setTimeout(() => {
        setDueSummary(null);
        setPaymentSummary(null);
        setShowCart(false);
      }, 300);

      const qtyById = new Map(items.map(i => [i.id, i.qty]));
      queryClient.setQueryData(['products', user?.email], (old) =>
        Array.isArray(old)
          ? old.map(p => qtyById.has(p.id)
            ? { ...p, stock: Math.max(0, (p.stock || 0) - qtyById.get(p.id)) }
            : p)
          : old,
      );

      const saveLedger = async () => {
        const parties = await base44.entities.Party.filter({ created_by: user.email });
        let party = payload.partyId
          ? parties.find(p => p.id === payload.partyId)
          : parties.find(p =>
            (phone && p.phone === phone) ||
            p.name?.trim().toLowerCase() === payload.name.trim().toLowerCase(),
          );
        if (party) {
          await base44.entities.Party.update(party.id, {
            type: payload.partyType,
            phone: party.phone || phone,
            address: party.address || payload.address || null,
            photo_url: party.photo_url || payload.photo || null,
            total_debit: (party.total_debit || 0) + amount,
          });
          // Instant dashboard "মোট পাবো" update.
          queryClient.setQueryData(['parties', user?.email], (old) =>
            Array.isArray(old)
              ? old.map(p => p.id === party.id
                ? { ...p, total_debit: (p.total_debit || 0) + amount }
                : p)
              : old,
          );
        } else {
          party = await base44.entities.Party.create({
            name: payload.name,
            phone,
            address: payload.address || null,
            type: payload.partyType,
            photo_url: payload.photo || null,
            total_debit: amount,
            total_credit: 0,
          });
          // Instant dashboard update for a brand-new party.
          queryClient.setQueryData(['parties', user?.email], (old) =>
            Array.isArray(old) && !old.some(p => p.id === party.id)
              ? [party, ...old]
              : old,
          );
        }

        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const category = payload.kind === 'gave' ? 'cash_payment' : 'sale';
        const txn = await base44.entities.Transaction.create({
          party_id: party.id,
          party_name: payload.name,
          type: 'debit',
          category,
          amount,
          description: payload.note || record.items_summary,
          date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
          time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
        });
        if (category === 'cash_payment') {
          await base44.entities.CashEntry.create({
            type: 'cash_out',
            amount,
            category: 'other',
            description: `${payload.name} - ${bn ? 'দিলাম' : 'Gave'}`,
            party_name: payload.name,
            date: txn.date,
            transaction_id: txn.id,
          });
        }
      };

      // Due sales are not recorded in the sales ledger (বেচার খাতা) —
      // only the party ledger, transactions and stock are updated.
      Promise.all([
        saveLedger(),
        ...items.map((i) => {
          const p = products.find(x => x.id === i.id);
          if (!p) return null;
          return base44.entities.Product.update(i.id, { stock: Math.max(0, (p.stock || 0) - i.qty) });
        }).filter(Boolean),
      ])
        .then(() => {
          afterSaleSaved();
          queryClient.invalidateQueries({ queryKey: ['parties', user?.email] });
          queryClient.invalidateQueries({ queryKey: ['transactions', user?.email] });
          queryClient.invalidateQueries({ queryKey: ['cashEntries', user?.email] });
        })
        .catch((err) => {
          toast.error(err?.message || (bn ? 'সেভ করা যায়নি' : 'Could not save'));
          afterSaleSaved();
        });
    } catch (err) {
      toast.error(err?.message || (bn ? 'সেভ করা যায়নি' : 'Could not save'));
    } finally {
      setSaving(false);
    }
  };



  // Barcode scan → auto add matching product

  useEffect(() => {
    if (!scannedBarcode) return;
    const match = products.find(p => (p.barcode || '') === scannedBarcode);
    if (match) addToCart(match);
  }, [scannedBarcode]);

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 dark:bg-slate-900 z-10">
      {/* Header */}
      <div className="bg-brand-green text-white px-5 pb-6 rounded-b-3xl flex-shrink-0" style={{ paddingTop: 'calc(0.35rem + env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-white/20 rounded-lg active:opacity-70">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold flex-1">
            {bn
              ? (duePrefill ? 'বাকীতে বিক্রয়' : 'বিক্রি করুন')
              : (duePrefill ? 'Due Sale' : 'Make a Sale')}
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 px-3 -mt-4 flex items-center gap-3">
        <button
          onClick={() => setTab('quick')}
          className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-bold border-2 transition-colors ${
            tab === 'quick'
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200'
          }`}
        >
          <span className="text-lg">💸</span>
          {bn ? 'দ্রুত বিক্রি' : 'Quick Sale'}
        </button>
        <button
          onClick={() => setTab('list')}
          className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-bold border-2 transition-colors ${
            tab === 'list'
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200'
          }`}
        >
          <span className="text-lg">📒</span>
          {bn ? 'প্রোডাক্ট লিস্ট' : 'Product List'}
        </button>
      </div>

      {tab === 'quick' ? (
        <div className="flex-1 min-h-0 overflow-y-auto px-3 mt-4 pb-4 space-y-4">
          {/* Date / photo / add row */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 h-12 px-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 active:opacity-70">
              <Calendar className="w-5 h-5 text-gray-700 dark:text-slate-200 shrink-0" />
              <input
                type="date"
                value={quickDate}
                onChange={e => setQuickDate(e.target.value)}
                className="bg-transparent text-sm font-semibold text-gray-800 dark:text-slate-100 focus:outline-none w-[7.5rem]"
              />
            </label>
            <button
              onClick={() => setPhotoChooserOpen(true)}
              className="flex items-center gap-2 h-12 px-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 active:opacity-70"
            >
              <Camera className="w-5 h-5 text-gray-700 dark:text-slate-200" />
              <span className="text-sm font-semibold text-gray-800 dark:text-slate-100">{bn ? 'ছবি' : 'Photo'}</span>
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoSelected}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelected}
            />
          </div>

          {quickPhoto && (
            <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-600">
              <img src={quickPhoto} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => setQuickPhoto(null)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          )}

          {/* Cash received */}
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">{bn ? 'ক্যাশ পেয়েছেন' : 'Cash received'}</p>
            <input
              type="number"
              inputMode="numeric"
              value={quickAmount}
              onChange={e => setQuickAmount(e.target.value)}
              className="w-full h-14 px-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-base font-bold focus:outline-none focus:border-blue-600 dark:text-slate-100"
            />
          </div>

          {/* Customer mobile */}
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">{bn ? 'কাস্টমার মোবাইল' : 'Customer mobile'}</p>
            <div className={`flex items-center h-14 rounded-xl bg-white dark:bg-slate-800 border overflow-hidden ${quickPhoneInvalid ? 'border-red-500' : 'border-gray-200 dark:border-slate-600'}`}>
              <CountryCodeSelect value={quickCountry} onChange={setQuickCountry} disabled={!!quickCustomerName} />
              <input
                type="tel"
                inputMode="tel"
                value={quickPhone}
                readOnly={!!quickCustomerName}
                onChange={e => { setQuickPhone(e.target.value.replace(/[^0-9]/g, '')); setQuickCustomerName(''); }}
                className={`flex-1 min-w-0 h-full px-3 bg-transparent text-base font-semibold focus:outline-none dark:text-slate-100 ${quickCustomerName ? 'opacity-70' : ''}`}
              />
              <button onClick={() => { setQuickPickerSearch(''); setShowQuickPartyPicker(true); }} className="px-3 shrink-0 active:opacity-70">
                <UserPlus className="w-5 h-5 text-blue-600" />
              </button>
            </div>
            {quickPhoneInvalid && (
              <p className="text-xs text-red-500">{bn ? 'মোবাইল নম্বরটি সঠিক নয়!' : 'Invalid mobile number!'}</p>
            )}
          </div>

          {/* Profit */}
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">{bn ? 'লাভ' : 'Profit'}</p>
            <input
              type="number"
              inputMode="numeric"
              value={quickProfit}
              onChange={e => setQuickProfit(e.target.value)}
              placeholder="0"
              className="w-full h-14 px-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-base font-bold focus:outline-none focus:border-blue-600 dark:text-slate-100"
            />
          </div>

          {/* Details */}
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">{bn ? 'পণ্য সম্পর্কে বিস্তারিত' : 'Product details'}</p>
            <textarea
              rows={2}
              value={quickNote}
              onChange={e => setQuickNote(e.target.value)}
              className="w-full px-3 py-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-sm focus:outline-none focus:border-blue-600 resize-none dark:text-slate-100"
            />
          </div>

          {/* Spacer pushes submit lower */}
          <div className="flex-1 min-h-6" />

          {/* Submit */}
          <button
            onClick={submitQuickSale}
            disabled={!quickAmount || saving || quickPhoneInvalid}
            className="w-full h-14 rounded-xl bg-blue-600 text-white text-base font-bold active:opacity-70 disabled:bg-gray-100 disabled:dark:bg-slate-800 disabled:text-gray-400 disabled:dark:text-slate-500"
          >
            {bn ? 'সাবমিট' : 'Submit'}
          </button>

        </div>
      ) : (
        <>
          {/* Search bar with filter + barcode scan */}
          <div className="flex-shrink-0 px-3 mt-3">
            <div className="flex items-center gap-2 px-3 h-12 rounded-xl bg-white dark:bg-slate-800 border-2 border-blue-600 shadow-sm">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              {scannedBarcode ? (
                <div className="flex-1 flex items-center gap-1.5 min-w-0">
                  <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-medium px-2 py-1 rounded-full min-w-0">
                    <ScanLine className="w-3 h-3 shrink-0" />
                    <span className="truncate">{scannedBarcode}</span>
                  </span>
                  <button onClick={() => setScannedBarcode(null)} className="shrink-0 p-0.5 text-gray-400 active:opacity-70">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    placeholder={bn ? 'পণ্য খোঁজ করুন' : 'Search products'}
                    value={search}
                    onChange={e => { setSearch(e.target.value); setScannedBarcode(null); }}
                    className="flex-1 bg-transparent text-sm focus:outline-none min-w-0 dark:text-slate-100"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="shrink-0 p-0.5 text-gray-400 active:opacity-70">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
              <div className="w-px h-6 bg-gray-200 dark:bg-slate-600" />
              <button onClick={() => setShowFilter(true)} className="flex items-center gap-1 shrink-0 active:opacity-70">
                <Filter className="w-4 h-4 text-gray-600 dark:text-slate-300" />
                <span className="text-xs font-medium text-gray-700 dark:text-slate-200">{bn ? 'ফিল্টার' : 'Filter'}</span>
                {selectedSubCats.length > 0 && (
                  <span className="ml-0.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {selectedSubCats.length}
                  </span>
                )}
              </button>
              <div className="w-px h-6 bg-gray-200 dark:bg-slate-600" />
              <button onClick={() => setShowBarcodeScanner(true)} className="shrink-0 active:opacity-70">
                <ScanLine className="w-5 h-5 text-blue-600" />
              </button>
            </div>
          </div>


          {/* Product list */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3 mt-3 pb-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Package}
                title={bn ? 'কোনো পণ্য নেই' : 'No products'}
                subtitle={bn ? 'প্রোডাক্ট লিস্টে পণ্য যোগ করুন' : 'Add products first'}
              />
            ) : (
              <div className="space-y-2">
                {filtered.map(product => {
                  const qty = cart[product.id] || 0;
                  const remaining = Math.max(0, (product.stock || 0) - qty);
                  const outOfStock = remaining <= 0;
                  return (
                    <div
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="flex items-center gap-3 px-3 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 cursor-pointer active:opacity-70"
                    >
                      <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden border border-emerald-100 dark:border-slate-600">
                        {product.photo_url
                          ? <img src={product.photo_url} alt={product.name} className="w-full h-full object-cover" />
                          : <Package className="w-6 h-6 text-emerald-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${outOfStock ? 'text-red-500' : 'text-gray-800 dark:text-slate-100'}`}>
                          {product.name}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <div>
                            <p className="text-[11px] text-gray-400 dark:text-slate-500">{bn ? 'স্টক সংখ্যা' : 'Stock'}</p>
                            <p className={`text-sm font-semibold ${outOfStock ? 'text-red-500' : 'text-gray-700 dark:text-slate-200'}`}>{num(remaining)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] text-gray-400 dark:text-slate-500">{bn ? 'বিক্রয় মূল্য' : 'Sale price'}</p>
                            <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">{fmt(product.sale_price)}</p>
                          </div>
                        </div>
                      </div>
                      {qty > 0 && (
                        <div
                          className="flex items-center gap-2 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button onClick={() => decFromCart(product)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center active:opacity-70">
                            <Minus className="w-4 h-4 text-gray-600 dark:text-slate-200" />
                          </button>
                          <span className="text-sm font-bold text-blue-600 w-5 text-center">{num(qty)}</span>
                          <button onClick={() => addToCart(product)} className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center active:opacity-70">
                            <Plus className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Bottom total bar — only for product list tab */}
      {tab !== 'quick' && (
      <div className="flex-shrink-0 bg-blue-600 px-4 py-3 flex items-center justify-between" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
        <div className="text-white">
          <span className="text-sm font-medium">{bn ? 'সর্বমোট: ' : 'Total: '}</span>
          <span className="text-lg font-bold">৳ {num(total)}</span>
        </div>
        <button
          onClick={() => {
            if (itemCount === 0) {
              toast.info(bn ? 'কার্টে পণ্য যোগ করুন' : 'Add products to cart', { duration: 1500 });
              return;
            }
            setShowCart(true);
          }}
          className="flex items-center gap-2 bg-white text-blue-700 rounded-xl px-4 h-11 font-bold active:opacity-70"
        >
          {num(itemCount)}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      )}

      <SubCategoryFilterDialog
        open={showFilter}
        onClose={() => setShowFilter(false)}
        selected={selectedSubCats}
        onApply={setSelectedSubCats}
      />

      {showBarcodeScanner && (
        <React.Suspense fallback={null}>
          <BarcodeScanner
            onScan={(code) => { setSearch(''); setScannedBarcode(code); setShowBarcodeScanner(false); }}
            onClose={() => setShowBarcodeScanner(false)}
          />
        </React.Suspense>
      )}

      {/* Photo chooser */}
      {photoChooserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
          <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">{bn ? 'নির্বাচন করুন' : 'Choose'}</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 px-5 pb-5">
              <button
                onClick={() => { setPhotoChooserOpen(false); cameraInputRef.current?.click(); }}
                className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gray-50 dark:bg-slate-700 py-6 active:opacity-70"
              >
                <Camera className="w-8 h-8 text-blue-600" />
                <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">{bn ? 'ক্যামেরা' : 'Camera'}</span>
              </button>
              <button
                onClick={() => { setPhotoChooserOpen(false); galleryInputRef.current?.click(); }}
                className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gray-50 dark:bg-slate-700 py-6 active:opacity-70"
              >
                <Image className="w-8 h-8 text-emerald-600" />
                <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">{bn ? 'গ্যালারি' : 'Gallery'}</span>
              </button>
            </div>
            <div className="border-t border-gray-100 dark:border-slate-700 px-5 py-3">
              <button
                onClick={() => setPhotoChooserOpen(false)}
                className="w-full py-2 text-sm font-bold text-blue-600 uppercase tracking-wide active:opacity-70"
              >
                {bn ? 'বাতিল' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showQuickPartyPicker && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center px-5">
          <div className="w-full max-w-sm max-h-[80vh] flex flex-col rounded-2xl bg-white dark:bg-slate-800 p-4">
            <p className="text-lg font-semibold text-gray-800 dark:text-slate-100">
              {bn ? 'কাস্টমার নির্বাচন করুন' : 'Select customer'}
            </p>
            <div className="relative mt-3 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                value={quickPickerSearch}
                onChange={e => setQuickPickerSearch(e.target.value)}
                placeholder={bn ? 'খোঁজ করুন' : 'Search'}
                className="w-full h-12 pl-11 pr-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-transparent text-sm focus:outline-none dark:text-slate-100"
              />
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto mt-2">
              {quickPickerList.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  {bn ? 'কোনো কাস্টমার পাওয়া যায়নি' : 'No customer found'}
                </p>
              ) : quickPickerList.map(p => (
                <button
                  key={p.id}
                  onClick={() => selectQuickParty(p)}
                  className="w-full text-left py-3 border-b border-gray-200 dark:border-slate-700 text-base text-gray-800 dark:text-slate-100 active:opacity-70"
                >
                  {p.name}{p.phone ? ` (${p.phone})` : ''}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-3 shrink-0">
              <button
                onClick={() => setShowQuickPartyPicker(false)}
                className="flex-1 h-12 rounded-xl border border-gray-400 text-sm font-semibold text-gray-800 dark:text-slate-100 active:opacity-70"
              >
                {bn ? 'বন্ধ করুন' : 'Close'}
              </button>
              <button
                onClick={() => { setShowQuickPartyPicker(false); setQuickPhone(''); setQuickCustomerName(''); }}
                className="flex-1 h-12 rounded-xl bg-blue-600 text-white text-sm font-semibold active:opacity-70"
              >
                {bn ? 'নতুন যোগ করুন' : 'Add new'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ImageCropDialog
        open={showCrop}
        imageSrc={cropSrc}
        onConfirm={async (b64) => { setQuickPhoto(await compressImage(b64)); setShowCrop(false); setCropSrc(null); }}
        onCancel={() => { setShowCrop(false); setCropSrc(null); }}
      />

      {showCart && (
        <SaleCartPage
          items={cartItems}
          onClose={() => setShowCart(false)}
          onChangeQty={changeCartQty}
          onRemove={removeFromCart}
          onNext={(summary) => (duePrefill ? setDueSummary(summary) : setPaymentSummary(summary))}
        />
      )}

      {/* Mount PartyDetail only after the receipt's slide-in has completed;
          it remains underneath and is revealed by the closing slide. */}
      {receipt && duePrefill?.id && partyBackdropReady && (
        <div className="fixed inset-0 z-[59] overflow-y-auto bg-gray-50 dark:bg-slate-900">
          <PartyDetail partyId={duePrefill.id} />
        </div>
      )}

      {receipt && (
        <SaleReceiptPage
          receipt={receipt}
          shop={shop}
          backToParty={!!duePrefill?.id}
          onClose={() => {
            if (duePrefill?.id) {
              // Sale was pushed on top of PartyDetail; going back pops it and
              // lands directly on that same PartyDetail entry (fresh data via
              // refetch), so the next Back press reaches বাকীর খাতা.
              window.history.back();
              return;
            }
            setReceipt(null);
          }}
          onNewSale={() => {
            if (duePrefill?.id) {
              window.history.back();
              return;
            }
            setReceipt(null);
          }}
        />
      )}

      {paymentSummary && (
        <SalePaymentPage
          summary={paymentSummary}
          onClose={closeCheckout}
          onConfirm={completeCartSale}
          onDue={(s) => setDueSummary(s)}
        />
      )}

      {dueSummary && (
        <SaleDuePage
          summary={dueSummary}
          initialParty={duePrefill}
          lockPartyType={!!duePrefill}
          readOnlyParty={!!duePrefill?.id}
          onClose={() => setDueSummary(null)}
          onSubmit={completeDueSale}
        />
      )}

      {/* Quick sale success animation */}
      {quickSuccess !== null && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-8">
          <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl px-6 pt-8 pb-6 animate-quick-pop">
            <div className="relative h-40 flex items-center justify-center">
              <span className="absolute w-28 h-3.5 rounded-full bg-emerald-200 dark:bg-emerald-800 rotate-[30deg] -translate-x-6 -translate-y-3 animate-quick-splash" />
              <span className="absolute w-24 h-3.5 rounded-full bg-emerald-200 dark:bg-emerald-800 rotate-[30deg] translate-x-4 translate-y-5 animate-quick-splash" />
              <span className="absolute w-4 h-4 rounded-full bg-emerald-300 dark:bg-emerald-700 -translate-x-12 translate-y-7 animate-quick-splash" style={{ animationDelay: '80ms' }} />
              <span className="absolute w-5 h-5 rounded-full bg-emerald-300 dark:bg-emerald-700 translate-x-16 -translate-y-8 animate-quick-splash" style={{ animationDelay: '120ms' }} />
              <span className="absolute w-3 h-3 rounded-full bg-blue-300 dark:bg-blue-700 -translate-x-14 -translate-y-9 animate-quick-splash" style={{ animationDelay: '160ms' }} />
              <div className="relative w-16 h-16 rounded-full bg-brand-green flex items-center justify-center shadow-lg animate-quick-check">
                <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12.5l5 5L20 6.5" className="quick-check-path" />
                </svg>
              </div>
            </div>
            <p className="mt-3 text-center text-base font-semibold text-gray-800 dark:text-slate-100">
              {bn
                ? <>বিক্রি করেছেন <span className="text-blue-600 font-bold">৳{num(quickSuccess)}</span> মূল্যের পণ্য</>
                : <>Sold product worth <span className="text-blue-600 font-bold">৳{num(quickSuccess)}</span></>}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
