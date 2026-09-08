import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, ArrowLeft, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { setActiveShopId, getActiveShopId } from '@/lib/shop';
import { BD_LOCATIONS, DIVISIONS, SHOP_TYPES } from '@/lib/bdLocations';
import ImageCropDialog from '@/components/party/ImageCropDialog';
import PhotoChooser from '@/components/shared/PhotoChooser';
import { queryClientInstance as queryClient } from '@/lib/query-client';
import { toast } from 'sonner';
import ShopCodePopup from '@/components/ShopCodePopup';
import { compressImage } from '@/lib/imageCompress';

const resizeDataUrl = (dataUrl) => compressImage(dataUrl);

const Field = ({ label, required, children }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
  </div>
);

const inputClass =
  'w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-base text-gray-800 dark:text-slate-100 outline-none focus:border-emerald-500';

export default function CreateShop() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const editId = params.get('id');
  

  const [logo, setLogo] = useState('');
  const [cropSrc, setCropSrc] = useState(null);
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [shopType, setShopType] = useState('');
  const [division, setDivision] = useState('');
  const [district, setDistrict] = useState('');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [onlineSale, setOnlineSale] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasShops, setHasShops] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!user) return;
    base44.entities.Shop.filter({ user_id: user.id }, '-created_date')
      .then((rows) => {
        const count = (rows || []).length;
        setHasShops(count > 0);
        if (!editId && count >= 1 && (user?.shop_create_credits || 0) <= 0) setBlocked(true);
      })
      .catch(() => {});
  }, [user, editId]);

  useEffect(() => {
    if (editId || !user) return;
    setOwnerName((v) => v || user.full_name || '');
    setOwnerPhone((v) => v || user.mobile_number || '');
  }, [user, editId]);

  useEffect(() => {
    if (!editId) return;
    base44.entities.Shop.get(editId)
      .then((s) => {
        if (!s) return;
        setLogo(s.logo_url || '');
        setName(s.name || '');
        setOwnerName(s.owner_name || '');
        setOwnerPhone(s.owner_phone || '');
        setShopType(s.shop_type || '');
        setDivision(s.division || '');
        setDistrict(s.district || '');
        setArea(s.area || '');
        setAddress(s.address || '');
        setOnlineSale(!!s.online_sale);
      })
      .catch(() => {});
  }, [editId]);

  const [showPhotoChooser, setShowPhotoChooser] = useState(false);

  const pickFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result);
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!name.trim() || !ownerName.trim() || !ownerPhone.trim() || !shopType || !area.trim() || !address.trim()) {
      toast.error('তারকা চিহ্নিত ঘরগুলো পূরণ করুন');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        owner_name: ownerName.trim(),
        owner_phone: ownerPhone.trim(),
        shop_type: shopType,
        division: division || null,
        district: district || null,
        area: area.trim(),
        address: address.trim(),
        online_sale: onlineSale,
        logo_url: logo || null,
      };
      try {
        await base44.auth.updateMe({ full_name: ownerName.trim(), mobile_number: ownerPhone.trim() });
      } catch {}
      if (editId) {
        await base44.entities.Shop.update(editId, payload);
        toast.success('দোকান আপডেট হয়েছে');
      } else {
        const shop = await base44.entities.Shop.create(payload);
        if (hasShops) {
          try {
            const me = await base44.auth.me();
            const credits = me.shop_create_credits || 0;
            if (credits > 0) await base44.auth.updateMe({ shop_create_credits: credits - 1 });
          } catch {}
        }
        setActiveShopId(shop.id);
        queryClient.clear();
        toast.success('দোকান তৈরি হয়েছে');
      }
      navigate('/SelectShop', { replace: true });
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে, আবার চেষ্টা করুন');
    } finally {
      setSaving(false);
    }
  };

  const canGoBack = hasShops || !!getActiveShopId();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <div
        className="bg-brand-green px-3 flex items-center gap-3"
        style={{ paddingTop: 'calc(0.85rem + env(safe-area-inset-top))', paddingBottom: '0.85rem' }}
      >
        {canGoBack && (
          <button onClick={() => navigate('/SelectShop')} className="text-white active:opacity-70">
            <ArrowLeft className="w-6 h-6" />
          </button>
        )}
        <h1 className="text-xl font-bold text-white">
          {editId ? 'দোকান এডিট করুন' : 'দোকান তৈরি করুন'}
        </h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4 pb-10">
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPhotoChooser(true)}
            className="relative w-28 h-28 rounded-full border-4 border-emerald-400 bg-emerald-600 flex items-center justify-center overflow-hidden active:opacity-80"
          >
            {logo ? (
              <img src={logo} alt="দোকানের লোগো" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-10 h-10 text-white" />
            )}
          </button>
          {logo && (
            <button
              type="button"
              onClick={() => setLogo('')}
              className="flex items-center gap-1 text-xs text-red-500"
            >
              <X className="w-3 h-3" /> ছবি সরান
            </button>
          )}
          <p className="text-sm text-gray-500 dark:text-slate-400">
            [আপনার দোকানের লোগো বা ছবি যুক্ত করুন]
          </p>
          <PhotoChooser open={showPhotoChooser} onOpenChange={setShowPhotoChooser} onSelect={pickFile} />
        </div>

        <Field label="দোকানের নাম" required>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="দোকানের নাম" />
        </Field>

        <Field label="দোকানের মালিকের নাম" required>
          <input className={inputClass} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="মালিকের নাম" />
        </Field>

        <Field label="মোবাইল নম্বর" required>
          <input
            type="tel"
            inputMode="numeric"
            className={inputClass}
            value={ownerPhone}
            onChange={(e) => setOwnerPhone(e.target.value)}
            placeholder="০১XXXXXXXXX"
          />
        </Field>

        <Field label="দোকানের ধরন" required>
          <select className={inputClass} value={shopType} onChange={(e) => setShopType(e.target.value)}>
            <option value="">--সিলেক্ট--</option>
            {SHOP_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="বিভাগ">
            <select
              className={inputClass}
              value={division}
              onChange={(e) => {
                setDivision(e.target.value);
                setDistrict('');
              }}
            >
              <option value="">--সিলেক্ট--</option>
              {DIVISIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="জেলা">
            <select className={inputClass} value={district} onChange={(e) => setDistrict(e.target.value)} disabled={!division}>
              <option value="">--সিলেক্ট--</option>
              {(BD_LOCATIONS[division] || []).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="এলাকা" required>
          <input className={inputClass} value={area} onChange={(e) => setArea(e.target.value)} placeholder="এলাকা / বাজারের নাম" />
        </Field>

        <Field label="ঠিকানা" required>
          <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="ঠিকানা" />
        </Field>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">অনলাইনে বিক্রি করতে চান?</label>
          <button
            type="button"
            onClick={() => setOnlineSale((v) => !v)}
            className="w-full flex items-center justify-between rounded-xl border border-gray-200 dark:border-slate-700 px-4 py-3"
          >
            <span className="text-base text-gray-800 dark:text-slate-100">{onlineSale ? 'হ্যাঁ' : 'না'}</span>
            <span className={`w-12 h-6 rounded-full p-0.5 transition-colors ${onlineSale ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'}`}>
              <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${onlineSale ? 'translate-x-6' : ''}`} />
            </span>
          </button>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-xl bg-brand-green py-3.5 text-base font-bold text-white active:opacity-80 disabled:opacity-60"
        >
          {saving ? 'সংরক্ষণ হচ্ছে...' : editId ? 'সেভ করুন' : 'দোকান তৈরি করুন'}
        </button>
      </div>

      <ShopCodePopup
        open={blocked}
        onOpenChange={(v) => {
          setBlocked(v);
          if (!v) navigate('/SelectShop', { replace: true });
        }}
        onSuccess={() => setBlocked(false)}
      />

      <ImageCropDialog
        open={!!cropSrc}
        imageSrc={cropSrc}
        onCancel={() => setCropSrc(null)}
        onConfirm={async (cropped) => {
          setLogo(await resizeDataUrl(cropped));
          setCropSrc(null);
        }}
      />
    </div>
  );
}
