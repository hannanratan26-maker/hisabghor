import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, Pencil, Package, Share2, History, Plus, Minus, X, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useLanguage } from '../components/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import StockUpdatePopup from '../components/product/StockUpdatePopup';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function fmtNum(n, bn) {
  if (n === undefined || n === null || n === '') return '—';
  const num = typeof n === 'number' ? n : parseFloat(n);
  if (isNaN(num)) return '—';
  return num.toLocaleString(bn ? 'bn-BD' : 'en-US');
}

function fmtPrice(n, bn) {
  if (n === undefined || n === null || n === '') return '—';
  const num = typeof n === 'number' ? n : parseFloat(n);
  if (isNaN(num)) return '—';
  return '৳' + num.toLocaleString(bn ? 'bn-BD' : 'en-US');
}

function MetricCard({ value, label }) {
  return (
    <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-3 text-center border border-gray-100 dark:border-slate-600 shadow-sm">
      <p className="text-sm font-bold text-gray-800 dark:text-slate-100 truncate" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{value}</p>
      <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-medium">{label}</p>
    </div>
  );
}

export default function ProductDetail() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const bn = language === 'bn';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showStockUpdate, setShowStockUpdate] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product-detail', productId, user?.email],
    queryFn: () => base44.entities.Product.filter({ id: productId, created_by: user.email }),
    select: (data) => data[0],
    enabled: !!productId && !!user,
  });

  const deleteProduct = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', user?.email] });
      navigate(-1);
    },
  });

  // Photo viewer back button guard
  useEffect(() => {
    if (!showPhotoViewer) return;
    let closedByPopstate = false;
    window.__popupOpen = true;
    window.history.pushState({ popupGuard: true }, '');
    const handlePop = () => {
      closedByPopstate = true;
      setShowPhotoViewer(false);
    };
    window.addEventListener('popstate', handlePop);
    return () => {
      window.__popupOpen = false;
      window.removeEventListener('popstate', handlePop);
      if (!closedByPopstate) {
        window.history.back();
      }
    };
  }, [showPhotoViewer]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex flex-col bg-gray-50 dark:bg-slate-900 z-10">
        <div className="bg-brand-green text-white px-5 rounded-b-3xl flex-shrink-0" style={{ paddingTop: 'calc(0.35rem + env(safe-area-inset-top))', paddingBottom: '0.35rem' }}>
          <div className="flex items-center gap-3 h-8">
            <Skeleton className="w-5 h-5 bg-white/30" />
          </div>
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 z-10 px-6 text-center">
        <Package className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-gray-500 dark:text-slate-400">{bn ? 'পণ্য পাওয়া যায়নি' : 'Product not found'}</p>
        <Button onClick={() => navigate(-1)} className="mt-4 bg-emerald-600 hover:bg-emerald-700 rounded-xl">
          {bn ? 'ফিরে যান' : 'Go Back'}
        </Button>
      </div>
    );
  }

  const salePrice = parseFloat(product.sale_price) || 0;
  const purchasePrice = parseFloat(product.purchase_price) || 0;
  const stock = parseFloat(product.stock) || 0;
  const profit = salePrice - purchasePrice;
  const inventoryValue = stock * purchasePrice;

  const discountText = product.discount
    ? (product.discount_type === 'percentage'
        ? `${fmtNum(product.discount_amount, bn)}%`
        : fmtPrice(product.discount_amount, bn))
    : (bn ? 'দেওয়া হয়নি' : 'Not set');

  const warrantyText = product.warranty
    ? `${fmtNum(product.warranty_duration, bn)} ${product.warranty_unit || ''}`
    : (bn ? 'দেওয়া হয়নি' : 'Not set');

  const vatText = product.vat_applicable
    ? `${fmtNum(product.vat_percent, bn)}%`
    : (bn ? '০' : '0');

  const lowStockText = product.low_stock_alert
    ? fmtNum(product.min_stock_level, bn)
    : (bn ? '০' : '0');

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 dark:bg-slate-900 z-10">
      {/* Header */}
      <div className="bg-brand-green text-white px-5 flex items-center gap-3 flex-shrink-0 rounded-b-3xl"
        style={{ paddingTop: 'calc(0.35rem + env(safe-area-inset-top))', paddingBottom: '0.35rem' }}>
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-white/20 rounded-lg active:opacity-70">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold flex-1 text-center">{bn ? 'পণ্যের বিস্তারিত' : 'Product Details'}</h1>
        <button className="p-1.5 hover:bg-white/20 rounded-lg active:opacity-70">
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {/* Product Summary - redesigned like reference image */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-3 shadow-sm">
          <div className="flex gap-3">
            {/* Large Product Image */}
            <div
              onClick={() => product.photo_url && setShowPhotoViewer(true)}
              className={`w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 flex items-center justify-center shrink-0 ${product.photo_url ? 'cursor-pointer' : ''}`}
            >
              {product.photo_url
                ? <img src={product.photo_url} alt={product.name} className="w-full h-full object-cover" />
                : <Package className="w-10 h-10 text-gray-300" />}
            </div>
            {/* Name + Price */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h2 className="text-sm font-bold text-gray-800 dark:text-slate-100 leading-snug" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{product.name}</h2>
              <p className="text-base font-medium text-gray-700 dark:text-slate-300 mt-1">
                {fmtNum(salePrice, bn)} ৳
              </p>
            </div>
          </div>
          {/* Delete + Edit buttons */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
            <button
              onClick={() => setShowDelete(true)}
              className="w-12 h-11 flex items-center justify-center rounded-xl border-2 border-red-400 text-red-500 active:opacity-70"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate(`${createPageUrl('AddProduct')}?id=${product.id}`)}
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-blue-600 text-blue-600 font-medium text-sm active:opacity-70"
            >
              <Pencil className="w-4 h-4" />
              {bn ? 'এডিট করুন' : 'Edit'}
            </button>
          </div>
        </div>

        {/* Metric Cards 3x2 */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-2.5 shadow-sm">
          <div className="grid grid-cols-3 gap-1.5">
            <MetricCard value={fmtNum(stock, bn)} label={bn ? 'স্টক' : 'Stock'} />
            <MetricCard value={fmtPrice(purchasePrice, bn)} label={bn ? 'ক্রয়মূল্য' : 'Cost'} />
            <MetricCard value={fmtPrice(profit, bn)} label={bn ? 'লাভ' : 'Profit'} />
            <MetricCard value={fmtPrice(inventoryValue, bn)} label={bn ? 'মজুদ মূল্য' : 'Inventory'} />
            <MetricCard value={discountText} label={bn ? 'ডিসকাউন্ট' : 'Discount'} />
            <MetricCard value={product.sub_category || '—'} label={bn ? 'সাব ক্যাটাগরি' : 'Sub Cat.'} />
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-2.5 shadow-sm">
          <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1.5">{bn ? 'আরও কিছু তথ্য' : 'More Info'}</h3>
          <div className="grid grid-cols-3 gap-1.5">
            <MetricCard value={vatText} label={bn ? 'ভ্যাট%' : 'VAT%'} />
            <MetricCard value={warrantyText} label={bn ? 'ওয়ারেন্টি' : 'Warranty'} />
            <MetricCard value={lowStockText} label={bn ? 'কমের এলার্ট' : 'Low Alert'} />
          </div>
        </div>

        {/* Description - default open, max height with scroll */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-3 shadow-sm">
          <fieldset className="border border-gray-200 dark:border-slate-600 rounded-xl p-2.5">
            <legend className="text-xs font-semibold text-gray-500 dark:text-slate-400 px-2">{bn ? 'পণ্য সম্পর্কে বিস্তারিত' : 'About Product'}</legend>
            <div className="max-h-[200px] overflow-y-auto">
              <p className="text-sm text-gray-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                {product.description || (bn ? 'কোনো বিস্তারিত তথ্য দেওয়া হয়নি।' : 'No description provided.')}
              </p>
            </div>
          </fieldset>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="px-3 pb-3 pt-1.5 flex-shrink-0 space-y-1.5 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700">
        <Button
          onClick={() => setShowStockUpdate(true)}
          className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold text-sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          {bn ? 'পণ্য সংখ্যা আপডেট করুন' : 'Update Stock'}
        </Button>
        <div className="flex gap-2">
          <button
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-emerald-500 text-emerald-600 font-medium text-sm active:opacity-70"
          >
            <Share2 className="w-4 h-4" />
            {bn ? 'শেয়ার করুন' : 'Share'}
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-emerald-500 text-emerald-600 font-medium text-sm active:opacity-70"
          >
            <History className="w-4 h-4" />
            {bn ? 'স্টকের ইতিহাস' : 'Stock History'}
          </button>
        </div>
      </div>

      {/* Photo Viewer */}
      {showPhotoViewer && product.photo_url && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center"
          onClick={() => setShowPhotoViewer(false)}
        >
          <button
            className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white text-lg font-bold"
            onClick={() => setShowPhotoViewer(false)}
          >
            ✕
          </button>
          <img
            src={product.photo_url}
            alt={product.name}
            className="w-72 h-72 object-cover rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Stock Update Popup */}
      <StockUpdatePopup
        product={product}
        open={showStockUpdate}
        onClose={() => setShowStockUpdate(false)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{bn ? 'পণ্য মুছবেন?' : 'Delete Product?'}</AlertDialogTitle>
            <AlertDialogDescription>{bn ? 'এই পণ্য স্থায়ীভাবে মুছে যাবে।' : 'This product will be permanently deleted.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{bn ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProduct.mutate(product.id)}
              className="rounded-xl bg-red-600 hover:bg-red-700"
            >
              {bn ? 'মুছুন' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}