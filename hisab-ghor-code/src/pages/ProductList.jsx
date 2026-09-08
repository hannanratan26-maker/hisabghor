import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Search, Plus, Package, MoreVertical, Pencil, Copy, Share2, ArrowLeft, Filter, ScanLine, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { useLanguage } from '../components/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import EmptyState from '../components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import StockUpdatePopup from '../components/product/StockUpdatePopup';
import SubCategoryFilterDialog from '../components/product/SubCategoryFilterDialog';
const BarcodeScanner = React.lazy(() => import('../components/product/BarcodeScanner'));


// Persist search + filter across navigation (survive unmount/remount when returning from detail)
let _persistedSearch = '';
let _persistedSubCats = [];
let _persistedScannedBarcode = null;

export default function ProductList() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const bn = language === 'bn';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const skipBackRef = useRef(false);
  const [search, setSearch] = useState(_persistedSearch);
  const [scannedBarcode, setScannedBarcode] = useState(_persistedScannedBarcode);
  const [actionMenuProduct, setActionMenuProduct] = useState(null);
  const [stockProduct, setStockProduct] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [selectedSubCats, setSelectedSubCats] = useState(_persistedSubCats);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // Preload scanner module so the live fallback opens instantly if needed.
  useEffect(() => { import('../components/product/BarcodeScanner'); }, []);



  useEffect(() => { _persistedSearch = search; }, [search]);
  useEffect(() => { _persistedSubCats = selectedSubCats; }, [selectedSubCats]);
  useEffect(() => { _persistedScannedBarcode = scannedBarcode; }, [scannedBarcode]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', user?.email],
    queryFn: () => base44.entities.Product.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user,
  });

  const filtered = products.filter(p => {
    const matchesSubCat = selectedSubCats.length === 0 ||
      selectedSubCats.includes(p.sub_category);
    // Barcode scan mode: only show exact barcode match
    if (scannedBarcode) {
      return (p.barcode || '') === scannedBarcode && matchesSubCat;
    }
    // Text search: name + description only (barcode numbers excluded)
    const searchLower = search.toLowerCase().trim();
    let matchesSearch = !searchLower;
    if (searchLower) {
      const text = ((p.name || '') + ' ' + (p.description || '')).toLowerCase();
      const tokens = text.split(/[\s,().\[\]{}]+/).filter(t => t);
      const words = searchLower.split(/\s+/).filter(w => w);
      const trailingSpace = /\s$/.test(search);
      let tokenIdx = 0;
      let allMatch = true;
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        const requireComplete = i < words.length - 1 || trailingSpace;
        let found = false;
        for (; tokenIdx < tokens.length; tokenIdx++) {
          if (requireComplete ? tokens[tokenIdx] === w : tokens[tokenIdx].startsWith(w)) {
            found = true;
            tokenIdx++;
            break;
          }
        }
        if (!found) { allMatch = false; break; }
      }
      matchesSearch = allMatch;
    }
    return matchesSearch && matchesSubCat;
  });

  const fmt = (n) => (n || 0).toLocaleString(bn ? 'bn-BD' : 'en-US') + ' ৳';


  const handleShare = async (product) => {

    const text = `${product.name}\n${fmt(product.sale_price)}`;
    if (navigator.share) {
      try { await navigator.share({ title: product.name, text }); } catch {}
    } else {
      navigator.clipboard?.writeText(text);
    }
  };

  // Action menu back button guard
  useEffect(() => {
    if (!actionMenuProduct) return;
    let closedByPopstate = false;
    window.__popupOpen = true;
    window.history.pushState({ popupGuard: true }, '');
    const handlePop = () => {
      closedByPopstate = true;
      setActionMenuProduct(null);
    };
    window.addEventListener('popstate', handlePop);
    return () => {
      window.__popupOpen = false;
      window.removeEventListener('popstate', handlePop);
      if (!closedByPopstate && !skipBackRef.current) {
        window.history.back();
      }
      skipBackRef.current = false;
    };
  }, [actionMenuProduct]);

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 dark:bg-slate-900 z-10">
      {/* Header */}
      <div className="bg-brand-green text-white px-5 pb-6 rounded-b-3xl flex-shrink-0" style={{ paddingTop: 'calc(0.35rem + env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-white/20 rounded-lg active:opacity-70">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold flex-1">{bn ? 'প্রোডাক্ট লিস্ট' : 'Product List'}</h1>
        </div>
        <p className="text-emerald-100 text-sm mt-1">
          {bn ? `মোট পণ্য আছে: ${products.length.toLocaleString(bn ? 'bn-BD' : 'en-US')}` : `Total products: ${products.length}`}
        </p>
      </div>

      {/* Search bar with filter + barcode scan */}
      <div className="flex-shrink-0 px-3 -mt-4">
        <div className="flex items-center gap-2 px-3 h-12 rounded-xl bg-white dark:bg-slate-800 border-2 border-blue-600 shadow-sm">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          {scannedBarcode ? (
            <div className="flex-1 flex items-center gap-1.5 min-w-0">
              <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-medium px-2 py-1 rounded-full min-w-0">
                <ScanLine className="w-3 h-3 shrink-0" />
                <span className="truncate">{scannedBarcode}</span>
              </span>
              <button
                onClick={() => setScannedBarcode(null)}
                className="shrink-0 p-0.5 text-gray-400 active:opacity-70"
              >
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
                <button
                  onClick={() => { setSearch(''); setScannedBarcode(null); }}
                  className="shrink-0 p-0.5 text-gray-400 active:opacity-70"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </>
          )}
          <div className="w-px h-6 bg-gray-200 dark:bg-slate-600" />
          <button
            onClick={() => setShowFilter(true)}
            className="flex items-center gap-1 shrink-0 active:opacity-70"
          >
            <Filter className="w-4 h-4 text-gray-600 dark:text-slate-300" />
            <span className="text-xs font-medium text-gray-700 dark:text-slate-200">{bn ? 'ফিল্টার' : 'Filter'}</span>
            {selectedSubCats.length > 0 && (
              <span className="ml-0.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                {selectedSubCats.length}
              </span>
            )}
          </button>
          <div className="w-px h-6 bg-gray-200 dark:bg-slate-600" />
          <button
            onClick={() => setShowBarcodeScanner(true)}
            className="shrink-0 active:opacity-70"
          >
            <ScanLine className="w-5 h-5 text-blue-600" />
          </button>
        </div>
      </div>


      {/* Product List */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 mt-3 mb-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={bn ? 'কোনো পণ্য নেই' : 'No products'}
            subtitle={bn ? 'নতুন পণ্য যোগ করুন' : 'Add a new product'}
            action={
              <Button
                onClick={() => navigate(createPageUrl('AddProduct'))}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" /> {bn ? 'পণ্য যোগ করুন' : 'Add Product'}
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {filtered.map(product => (
              <div
                key={product.id}
                className="flex items-center gap-3 px-3 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 active:opacity-70 transition-opacity"
                onClick={() => navigate(`${createPageUrl('ProductDetail')}?id=${product.id}`)}
              >
                {/* Larger Avatar */}
                <div className="w-14 h-14 rounded-xl bg-emerald-50 dark:bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden border border-emerald-100 dark:border-slate-600">
                  {product.photo_url
                    ? <img src={product.photo_url} alt={product.name} className="w-full h-full object-cover" />
                    : <Package className="w-6 h-6 text-emerald-500" />}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-slate-100 break-words" style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}>{product.name}</p>
                  <p className="text-xs mt-0.5 flex items-center gap-1">
                    <span className="text-red-500 font-bold">{fmt(product.sale_price)}</span>
                    {product.sub_category && <span className="text-blue-600">| {product.sub_category}</span>}
                  </p>
                  {product.stock !== undefined && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {bn ? 'স্টক:' : 'Stock:'} {(product.stock || 0).toLocaleString(bn ? 'bn-BD' : 'en-US')} {product.unit || ''}
                    </p>
                  )}
                </div>
                {/* 3-dot menu */}
                <button
                  onClick={(e) => { e.stopPropagation(); setActionMenuProduct(product); }}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 active:opacity-70 shrink-0"
                >
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Button */}
      <div className="px-3 pb-3 pt-1.5 flex-shrink-0">
        <Button
          onClick={() => navigate(createPageUrl('AddProduct'))}
          className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-base font-bold shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" /> {bn ? 'প্রোডাক্ট যুক্ত করুন' : 'Add Product'}
        </Button>
      </div>

      {/* Action Menu (Bottom Sheet) */}
      {actionMenuProduct && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setActionMenuProduct(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 rounded-t-3xl p-4 max-w-lg mx-auto" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
            <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-800 dark:text-slate-100 mb-3 pb-3 border-b border-gray-100 dark:border-slate-700">{actionMenuProduct.name}</h3>
            <div className="space-y-1">
              <button
                onClick={() => { skipBackRef.current = true; navigate(`${createPageUrl('AddProduct')}?id=${actionMenuProduct.id}`, { replace: true }); setActionMenuProduct(null); }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 active:opacity-70"
              >
                <Pencil className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-700 dark:text-slate-200">{bn ? 'এডিট করুন' : 'Edit'}</span>
              </button>
              <button
                onClick={() => { skipBackRef.current = true; navigate(`${createPageUrl('AddProduct')}?duplicate=${actionMenuProduct.id}`, { replace: true }); setActionMenuProduct(null); }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 active:opacity-70"
              >
                <Copy className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-700 dark:text-slate-200">{bn ? 'ডুপ্লিকেট করুন' : 'Duplicate'}</span>
              </button>
              <button
                onClick={() => { const p = actionMenuProduct; setActionMenuProduct(null); setTimeout(() => setStockProduct(p), 100); }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 active:opacity-70"
              >
                <Plus className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-700 dark:text-slate-200">{bn ? 'পণ্য সংখ্যা আপডেট করুন' : 'Update Stock'}</span>
              </button>
              <button
                onClick={() => { handleShare(actionMenuProduct); setActionMenuProduct(null); }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 active:opacity-70"
              >
                <Share2 className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-700 dark:text-slate-200">{bn ? 'প্রডাক্ট লিংক শেয়ার করুন' : 'Share'}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Stock Update Popup */}
      <StockUpdatePopup
        product={stockProduct}
        open={!!stockProduct}
        onClose={() => setStockProduct(null)}
      />

      {/* Sub Category Filter Dialog */}
      <SubCategoryFilterDialog
        open={showFilter}
        onClose={() => setShowFilter(false)}
        selected={selectedSubCats}
        onApply={setSelectedSubCats}
      />

      {/* Barcode Scanner */}
      {showBarcodeScanner && (
        <React.Suspense fallback={null}>
        <BarcodeScanner
          onScan={(code) => { setSearch(''); setScannedBarcode(code); setShowBarcodeScanner(false); }}
          onClose={() => setShowBarcodeScanner(false)}
        />
        </React.Suspense>
      )}
    </div>
  );
}