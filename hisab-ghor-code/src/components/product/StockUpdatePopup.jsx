import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, Minus, X, Package } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { useAuth } from '@/lib/AuthContext';

export default function StockUpdatePopup({ product, open, onClose }) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const [stockQty, setStockQty] = useState('');

  useEffect(() => {
    if (open && product) {
      setStockQty(String(product.stock ?? 0));
    }
  }, [open, product]);

  const updateStock = useMutation({
    mutationFn: ({ id, stock }) => base44.entities.Product.update(id, { stock }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['product-detail'] });
      handleClose();
    },
  });

  const handleClose = () => {
    updateStock.reset();
    onClose();
  };

  // Back button guard
  useEffect(() => {
    if (!open) return;
    let closedByPopstate = false;
    window.__popupOpen = true;
    window.history.pushState({ popupGuard: true }, '');
    const handlePop = () => {
      closedByPopstate = true;
      handleClose();
    };
    window.addEventListener('popstate', handlePop);
    return () => {
      window.__popupOpen = false;
      window.removeEventListener('popstate', handlePop);
      if (!closedByPopstate) {
        window.history.back();
      }
    };
  }, [open]);

  if (!open || !product) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-4" onClick={handleClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-end -mt-2 -mr-2">
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-col items-center -mt-2">
          <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 flex items-center justify-center mb-3">
            {product.photo_url
              ? <img src={product.photo_url} alt={product.name} className="w-full h-full object-cover" />
              : <Package className="w-7 h-7 text-gray-300" />}
          </div>
          <h3 className="text-base font-bold text-gray-800 dark:text-slate-100 text-center mb-5">{product.name}</h3>
        </div>
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={() => setStockQty(q => String(Math.max(0, (parseFloat(q) || 0) - 1)))}
            className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center active:opacity-70 shadow-md"
          >
            <Minus className="w-5 h-5" />
          </button>
          <input
            type="number"
            value={stockQty}
            onChange={e => setStockQty(e.target.value)}
            className="w-24 h-12 text-center text-lg font-bold text-blue-700 dark:text-blue-400 border-2 border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            onClick={() => setStockQty(q => String((parseFloat(q) || 0) + 1))}
            className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center active:opacity-70 shadow-md"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <Button
          onClick={() => updateStock.mutate({ id: product.id, stock: parseFloat(stockQty) || 0 })}
          disabled={updateStock.isPending}
          className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold text-sm"
        >
          {updateStock.isPending
            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : (bn ? 'পণ্য সংখ্যা আপডেট করুন' : 'Update Stock')}
        </Button>
      </div>
    </div>
  );
}