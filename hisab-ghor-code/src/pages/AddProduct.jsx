import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Camera, ChevronDown, ChevronUp, ScanLine, Plus, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../components/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { compressImage } from '@/lib/imageCompress';
import ImageCropDialog from '../components/party/ImageCropDialog';
import PhotoChooser from '../components/shared/PhotoChooser';
const BarcodeScanner = React.lazy(() => import('../components/product/BarcodeScanner'));

const UNITS = ['ইউনিট', 'পিস', 'কেজি', 'গ্রাম', 'লিটার', 'মিটার', 'ডজন', 'বাক্স'];
const CATEGORIES = ['ইলেকট্রনিক্স', 'পোশাক', 'খাদ্য', 'গৃহস্থালি', 'প্রসাধনী', 'স্টেশনারি', 'অন্যান্য'];
const WARRANTY_UNITS = ['দিন', 'মাস', 'বছর'];
const DISCOUNT_TYPES = [
  { value: 'percentage', label_bn: '%', label_en: '%' },
  { value: 'fixed', label_bn: '৳', label_en: '৳' },
];

const ToggleRow = ({ label, value, onChange, children }) => (
  <div className={`rounded-xl overflow-hidden border-l-[3px] ${value ? 'border-l-emerald-500 bg-emerald-50/50 dark:bg-slate-700' : 'border-l-gray-300 bg-gray-50 dark:bg-slate-700'}`}>
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-700 dark:text-slate-200">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`w-12 h-7 rounded-full transition-colors relative shrink-0 ${value ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-500'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
    {value && children && <div className="px-4 pb-3 space-y-2">{children}</div>}
  </div>
);

export default function AddProduct() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const bn = language === 'bn';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPhotoChooser, setShowPhotoChooser] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('id');
  const duplicateId = urlParams.get('duplicate');
  const isEdit = !!editId;
  const isDuplicate = !!duplicateId;
  const loadId = editId || duplicateId;

  const [form, setForm] = useState({
    name: '', sale_price: '', purchase_price: '', stock: '',
    category: '', sub_category: '', unit: 'ইউনিট', description: '',
    photo_url: '', barcode: '', online_sale: false, wholesale: false,
    low_stock_alert: false, vat_applicable: false, warranty: false, discount: false,
    wholesale_price: '', wholesale_min_qty: '', min_stock_level: '',
    vat_percent: '', warranty_duration: '', warranty_unit: 'দিন',
    discount_amount: '', discount_type: 'percentage',
  });
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showNewSubCat, setShowNewSubCat] = useState(false);
  const [newSubCat, setNewSubCat] = useState('');
  const [newSubCatCategory, setNewSubCatCategory] = useState('অন্যান্য');

  // Fetch sub-categories from DB (permanent)
  const { data: subCategories = [] } = useQuery({
    queryKey: ['sub-categories', user?.email],
    queryFn: () => base44.entities.SubCategory.filter({ created_by: user.email }),
    enabled: !!user,
  });

  const { data: existingProduct } = useQuery({
    queryKey: ['product', loadId],
    queryFn: () => base44.entities.Product.filter({ id: loadId, created_by: user.email }),
    select: d => d[0],
    enabled: !!loadId && !!user,
  });

  useEffect(() => {
    if (existingProduct) {
      setForm({
        name: existingProduct.name || '',
        sale_price: existingProduct.sale_price || '',
        purchase_price: existingProduct.purchase_price || '',
        stock: existingProduct.stock ?? '',
        category: existingProduct.category || '',
        sub_category: existingProduct.sub_category || '',
        unit: existingProduct.unit || 'ইউনিট',
        description: existingProduct.description || '',
        photo_url: existingProduct.photo_url || '',
        barcode: existingProduct.barcode || '',
        online_sale: existingProduct.online_sale || false,
        wholesale: existingProduct.wholesale || false,
        wholesale_price: existingProduct.wholesale_price || '',
        wholesale_min_qty: existingProduct.wholesale_min_qty || '',
        low_stock_alert: existingProduct.low_stock_alert || false,
        min_stock_level: existingProduct.min_stock_level || '',
        vat_applicable: existingProduct.vat_applicable || false,
        vat_percent: existingProduct.vat_percent || '',
        warranty: existingProduct.warranty || false,
        warranty_duration: existingProduct.warranty_duration || '',
        warranty_unit: existingProduct.warranty_unit || 'দিন',
        discount: existingProduct.discount || false,
        discount_amount: existingProduct.discount_amount || '',
        discount_type: existingProduct.discount_type || 'percentage',
      });
    }
  }, [existingProduct]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handlePhotoChange = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropImageSrc(ev.target.result);
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = (croppedBase64) => {
    setForm(f => ({ ...f, photo_url: croppedBase64 }));
    setShowCropDialog(false);
    setCropImageSrc(null);
  };

  const handleCropCancel = () => {
    setShowCropDialog(false);
    setCropImageSrc(null);
  };

  const handleAddNewSubCat = async () => {
    const trimmed = newSubCat.trim();
    if (!trimmed) return;
    try {
      await base44.entities.SubCategory.create({ name: trimmed, category: newSubCatCategory });
      queryClient.invalidateQueries({ queryKey: ['sub-categories', user?.email] });
      set('sub_category', trimmed);
      setNewSubCat('');
      setShowNewSubCat(false);
    } catch (e) {
      // If error (e.g. duplicate), still set the value
      set('sub_category', trimmed);
      setNewSubCat('');
      setShowNewSubCat(false);
    }
  };


  const handleSave = async () => {
    if (!form.name.trim() || !form.sale_price) return;
    setSaving(true);
    setSaveError('');
    try {
      let finalPhotoUrl = form.photo_url;
      // Compress base64 photo to stay within field limits (no integration credit used)
      if (finalPhotoUrl && finalPhotoUrl.startsWith('data:')) {
        finalPhotoUrl = await compressImage(finalPhotoUrl);
      }
      const data = {
        name: form.name.trim(),
        sale_price: parseFloat(form.sale_price) || 0,
        purchase_price: parseFloat(form.purchase_price) || 0,
        stock: parseFloat(form.stock) || 0,
        category: form.category || '',
        sub_category: form.sub_category || '',
        unit: form.unit || 'ইউনিট',
        description: form.description || '',
        photo_url: finalPhotoUrl || '',
        barcode: (form.barcode || '').trim(),
        online_sale: !!form.online_sale,
        wholesale: !!form.wholesale,
        wholesale_price: form.wholesale ? (parseFloat(form.wholesale_price) || 0) : 0,
        wholesale_min_qty: form.wholesale ? (parseFloat(form.wholesale_min_qty) || 0) : 0,
        low_stock_alert: !!form.low_stock_alert,
        min_stock_level: form.low_stock_alert ? (parseFloat(form.min_stock_level) || 0) : 0,
        vat_applicable: !!form.vat_applicable,
        vat_percent: form.vat_applicable ? (parseFloat(form.vat_percent) || 0) : 0,
        warranty: !!form.warranty,
        warranty_duration: form.warranty ? (parseFloat(form.warranty_duration) || 0) : 0,
        warranty_unit: form.warranty ? (form.warranty_unit || 'দিন') : '',
        discount: !!form.discount,
        discount_amount: form.discount ? (parseFloat(form.discount_amount) || 0) : 0,
        discount_type: form.discount ? (form.discount_type || 'percentage') : 'percentage',
      };
      if (isEdit) {
        const { stock, ...dataWithoutStock } = data;
        const updatedProduct = await base44.entities.Product.update(editId, dataWithoutStock);
        queryClient.setQueryData(['product', editId], (cached) => {
          if (!Array.isArray(cached)) return [updatedProduct];
          return cached.map((product) =>
            product.id === editId ? { ...product, ...updatedProduct } : product
          );
        });
      } else {
        await base44.entities.Product.create(data);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['product-detail'] }),
        isEdit
          ? queryClient.invalidateQueries({ queryKey: ['product', editId] })
          : Promise.resolve(),
      ]);
      navigate(-1);
    } catch (err) {
      setSaveError(bn ? 'সেভ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।' : 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const pageTitle = isEdit ? (bn ? 'পণ্য এডিট করুন' : 'Edit Product')
    : isDuplicate ? (bn ? 'পণ্য ডুপ্লিকেট করুন' : 'Duplicate Product')
    : (bn ? 'প্রোডাক্ট যুক্ত করুন' : 'Add Product');

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 dark:bg-slate-900 z-10">
      {/* Header */}
      <div className="bg-brand-green text-white px-5 flex items-center gap-3 flex-shrink-0 rounded-b-3xl"
        style={{ paddingTop: 'calc(0.35rem + env(safe-area-inset-top))', paddingBottom: '0.35rem' }}>
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-white/20 rounded-lg active:opacity-70">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">{pageTitle}</h1>
      </div>

      {/* Scrollable Form */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-4">

        {/* Name */}
        <div>
          <Label className="text-sm font-semibold text-gray-700 dark:text-slate-200">{bn ? 'পণ্যের নাম' : 'Product Name'} *</Label>
          <Input
            placeholder={bn ? 'পণ্যের নাম লিখুন' : 'Enter product name'}
            value={form.name}
            onChange={e => set('name', e.target.value)}
            className="mt-1.5 h-12 rounded-xl bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600"
          />
        </div>

        {/* Sale Price */}
        <div>
          <Label className="text-sm font-semibold text-gray-700 dark:text-slate-200">{bn ? 'বিক্রয় মূল্য' : 'Sale Price'} *</Label>
          <Input
            placeholder={bn ? 'বিক্রয় মূল্য লিখুন' : 'Enter sale price'}
            value={form.sale_price}
            onChange={e => set('sale_price', e.target.value)}
            type="number"
            className="mt-1.5 h-12 rounded-xl bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600"
          />
        </div>

        {/* Stock - editable for new and duplicate, read-only for edit */}
        <div>
          <Label className="text-sm font-semibold text-gray-700 dark:text-slate-200">{bn ? 'বর্তমান মজুদ আছে' : 'Current Stock'}</Label>
          {isEdit ? (
            <div className="mt-1.5 px-4 py-3 border border-dashed border-amber-400 rounded-xl bg-amber-50 dark:bg-amber-900/20">
              <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                {bn ? `বর্তমান মজুদ: ${(form.stock || 0).toLocaleString(bn ? 'bn-BD' : 'en-US')} ${form.unit || ''}` : `Current stock: ${form.stock || 0} ${form.unit || ''}`}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                {bn ? 'মজুদ আপডেট করতে পণ্যের বিস্তারিত পেজে «পণ্য সংখ্যা আপডেট করুন» বাটনে ক্লিক করুন।' : 'To update stock, go to product details and click "Update Stock".'}
              </p>
            </div>
          ) : (
            <>
              <Input
                placeholder={bn ? 'স্টকের পরিমাণ লিখুন' : 'Enter stock quantity'}
                value={form.stock}
                onChange={e => set('stock', e.target.value)}
                type="number"
                className="mt-1.5 h-12 rounded-xl bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600"
              />
              {isDuplicate && (
                <div className="mt-2 px-3 py-2 border border-dashed border-blue-400 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {bn ? 'সেভ করলে নতুন পণ্য তৈরি হবে, মূল পণ্য অপরিবর্তিত থাকবে।' : 'Saving creates a new product; original stays unchanged.'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Purchase Price */}
        <div>
          <Label className="text-sm font-semibold text-gray-700 dark:text-slate-200">{bn ? 'ক্রয়মূল্য' : 'Purchase Price'}</Label>
          <Input
            placeholder={bn ? 'ক্রয় মূল্য লিখুন' : 'Enter purchase price'}
            value={form.purchase_price}
            onChange={e => set('purchase_price', e.target.value)}
            type="number"
            className="mt-1.5 h-12 rounded-xl bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600"
          />
        </div>

        {/* Advanced Section Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-emerald-50 dark:bg-slate-700 rounded-xl border border-emerald-200 dark:border-slate-600"
        >
          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{bn ? 'পণ্যের অ্যাডভান্স তথ্য' : 'Advanced Details'}</span>
          {showAdvanced ? <ChevronUp className="w-4 h-4 text-emerald-600" /> : <ChevronDown className="w-4 h-4 text-emerald-600" />}
        </button>

        {showAdvanced && (
          <div className="space-y-3">
            {/* Category */}
            <div>
              <Label className="text-sm font-semibold text-gray-700 dark:text-slate-200">{bn ? 'ক্যাটাগরি' : 'Category'}</Label>
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className="mt-1.5 w-full h-12 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">{bn ? '--ক্যাটাগরি--' : '--Category--'}</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Sub Category */}
            <div>
              <Label className="text-sm font-semibold text-gray-700 dark:text-slate-200">{bn ? 'সাব ক্যাটাগরি' : 'Sub Category'}</Label>
              <select
                value={showNewSubCat ? '__add_new__' : form.sub_category}
                onChange={e => {
                  if (e.target.value === '__add_new__') {
                    setShowNewSubCat(true);
                    set('sub_category', '');
                  } else {
                    setShowNewSubCat(false);
                    set('sub_category', e.target.value);
                  }
                }}
                className="mt-1.5 w-full h-12 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">{bn ? '--সাব ক্যাটাগরি--' : '--Sub Category--'}</option>
                {subCategories.map(sc => <option key={sc.id} value={sc.name}>{sc.name}</option>)}
                <option value="__add_new__">{bn ? 'নতুন ক্যাটাগরি যুক্ত করুন' : 'Add New Category'}</option>
              </select>
              {showNewSubCat && (
                <div className="mt-2 p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:bg-slate-700 space-y-2">
                  <div>
                    <Label className="text-xs text-gray-500 dark:text-slate-400">{bn ? 'ক্যাটাগরি' : 'Category'}</Label>
                    <select
                      value={newSubCatCategory}
                      onChange={e => setNewSubCatCategory(e.target.value)}
                      className="mt-1 w-full h-10 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm focus:outline-none dark:text-slate-100"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder={bn ? 'নতুন সাব ক্যাটাগরির নাম' : 'New sub category name'}
                      value={newSubCat}
                      onChange={e => setNewSubCat(e.target.value)}
                      className="h-11 rounded-xl bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600"
                      autoFocus
                    />
                    <Button
                      type="button"
                      onClick={handleAddNewSubCat}
                      className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Unit */}
            <div>
              <Label className="text-sm font-semibold text-gray-700 dark:text-slate-200">{bn ? 'পণ্যের একক' : 'Unit'}</Label>
              <select
                value={form.unit}
                onChange={e => set('unit', e.target.value)}
                className="mt-1.5 w-full h-12 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            {/* Description */}
            <div>
              <Label className="text-sm font-semibold text-gray-700 dark:text-slate-200">{bn ? 'পণ্যের বিস্তারিত' : 'Description'}</Label>
              <textarea
                placeholder={bn ? 'পণ্যের বিস্তারিত (না দিলেও হবে)' : 'Product description (optional)'}
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
              />
            </div>

            {/* Toggles with expandable fields */}
            <div className="space-y-2">
              <ToggleRow label={bn ? 'অনলাইনে বিক্রি করতে চান?' : 'Online Sale?'} value={form.online_sale} onChange={v => set('online_sale', v)} />

              <ToggleRow label={bn ? 'পাইকারি বিক্রি করতে চান?' : 'Wholesale?'} value={form.wholesale} onChange={v => set('wholesale', v)}>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-gray-500">{bn ? 'পাইকারি মূল্য' : 'Wholesale Price'}</Label>
                    <Input type="number" placeholder="0" value={form.wholesale_price}
                      onChange={e => set('wholesale_price', e.target.value)}
                      className="mt-1 h-10 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">{bn ? 'নূন্যতম পরিমাণ' : 'Minimum Qty'}</Label>
                    <Input type="number" placeholder="0" value={form.wholesale_min_qty}
                      onChange={e => set('wholesale_min_qty', e.target.value)}
                      className="mt-1 h-10 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600" />
                  </div>
                </div>
              </ToggleRow>

              <ToggleRow label={bn ? 'স্টক কমের এলার্ট?' : 'Low Stock Alert?'} value={form.low_stock_alert} onChange={v => set('low_stock_alert', v)}>
                <div>
                  <Label className="text-xs text-gray-500">{bn ? 'মিনিমাম স্টক থাকবে' : 'Minimum Stock Level'}</Label>
                  <Input type="number" placeholder="0" value={form.min_stock_level}
                    onChange={e => set('min_stock_level', e.target.value)}
                    className="mt-1 h-10 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600" />
                </div>
              </ToggleRow>

              <ToggleRow label={bn ? 'ভ্যাট প্রযোজ্য?' : 'VAT Applicable?'} value={form.vat_applicable} onChange={v => set('vat_applicable', v)}>
                <div className="flex items-center gap-2">
                  <Input type="number" placeholder="0" value={form.vat_percent}
                    onChange={e => set('vat_percent', e.target.value)}
                    className="h-10 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600" />
                  <span className="text-sm font-semibold text-gray-600 dark:text-slate-300">%</span>
                </div>
              </ToggleRow>

              <ToggleRow label={bn ? 'ওয়ারেন্টি' : 'Warranty'} value={form.warranty} onChange={v => set('warranty', v)}>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 whitespace-nowrap">{bn ? 'মেয়াদ:' : 'Duration:'}</span>
                  <Input type="number" placeholder="0" value={form.warranty_duration}
                    onChange={e => set('warranty_duration', e.target.value)}
                    className="h-10 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600" />
                  <select value={form.warranty_unit} onChange={e => set('warranty_unit', e.target.value)}
                    className="h-10 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 px-2 text-sm focus:outline-none">
                    {WARRANTY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </ToggleRow>

              <ToggleRow label={bn ? 'ডিসকাউন্ট' : 'Discount'} value={form.discount} onChange={v => set('discount', v)}>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 whitespace-nowrap">{bn ? 'পরিমাণ:' : 'Amount:'}</span>
                  <Input type="number" placeholder="0" value={form.discount_amount}
                    onChange={e => set('discount_amount', e.target.value)}
                    className="h-10 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600" />
                  <select value={form.discount_type} onChange={e => set('discount_type', e.target.value)}
                    className="h-10 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 px-2 text-sm focus:outline-none">
                    {DISCOUNT_TYPES.map(dt => <option key={dt.value} value={dt.value}>{dt.label_bn}</option>)}
                  </select>
                </div>
              </ToggleRow>
            </div>

            {/* Photo Upload */}
            <div className="pt-2">
              <Label className="text-sm font-semibold text-gray-700 dark:text-slate-200">{bn ? 'পণ্যের ছবি' : 'Product Photo'}</Label>
              <div className="mt-1.5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowPhotoChooser(true)}
                  className="w-20 h-20 rounded-2xl bg-emerald-50 dark:bg-slate-700 border-2 border-dashed border-emerald-300 dark:border-slate-500 flex flex-col items-center justify-center gap-1 active:opacity-70 shrink-0"
                >
                  {form.photo_url
                    ? <img src={form.photo_url} alt="product" className="w-full h-full object-cover rounded-2xl" />
                    : <>
                        <Camera className="w-5 h-5 text-emerald-500" />
                        <span className="text-[10px] text-emerald-600 font-medium">{bn ? 'ছবি যোগ করুন' : 'Add Photo'}</span>
                      </>
                  }
                </button>
                {form.photo_url && (
                  <button
                    type="button"
                    onClick={() => set('photo_url', '')}
                    className="text-xs text-red-500 font-medium"
                  >
                    {bn ? 'ছবি মুছুন' : 'Remove'}
                  </button>
                )}
                <PhotoChooser open={showPhotoChooser} onOpenChange={setShowPhotoChooser} onSelect={handlePhotoChange} />
              </div>
            </div>

            {/* Barcode - with clear and rescan options */}
            <div>
              {form.barcode ? (
                <div>
                  <div className="flex items-center justify-center bg-emerald-600 text-white px-4 py-3 rounded-xl">
                    <span className="text-sm font-medium text-center break-all" style={{ wordBreak: 'break-word' }}>
                      {bn ? 'বারকোড: ' : 'Barcode: '}{form.barcode}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => set('barcode', '')}
                      className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-red-400 text-red-500 font-medium text-sm active:opacity-70"
                    >
                      <Trash2 className="w-4 h-4" />
                      {bn ? 'বারকোড মুছুন' : 'Clear'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowScanner(true)}
                      className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-blue-500 text-blue-600 font-medium text-sm active:opacity-70"
                    >
                      <ScanLine className="w-4 h-4" />
                      {bn ? 'নতুন স্ক্যান' : 'Rescan'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white h-12 rounded-xl font-medium text-sm active:opacity-90"
                >
                  <ScanLine className="w-5 h-5" />
                  {bn ? 'বারকোড স্ক্যান' : 'Scan Barcode'}
                </button>
              )}
            </div>
          </div>
        )}

        {saveError && (
          <p className="text-sm text-red-500 text-center px-4">{saveError}</p>
        )}
      </div>

      {/* Save Button */}
      <div className="px-4 pb-4 pt-3 bg-gray-50 dark:bg-slate-900 flex-shrink-0 border-t border-gray-100 dark:border-slate-700">
        <Button
          onClick={handleSave}
          disabled={!form.name.trim() || !form.sale_price || saving}
          className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-base font-bold disabled:opacity-50"
        >
          {saving ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />{bn ? 'সেভ হচ্ছে...' : 'Saving...'}</>
          ) : (bn ? 'সেভ করুন' : 'Save')}
        </Button>
      </div>

      {/* Image Crop Dialog */}
      {showCropDialog && (
        <ImageCropDialog
          open={showCropDialog}
          imageSrc={cropImageSrc}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}

      {/* Barcode Scanner */}
      {showScanner && (
        <React.Suspense fallback={null}>
        <BarcodeScanner
          onScan={(code) => { set('barcode', code); setShowScanner(false); }}
          onClose={() => setShowScanner(false)}
        />
        </React.Suspense>
      )}
    </div>
  );
}