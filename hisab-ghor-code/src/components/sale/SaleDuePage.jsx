import React, { useState, useCallback, useMemo } from 'react';
import { ArrowLeft, UserPlus, ImagePlus, X, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '../LanguageContext';
import useBackClose from '@/hooks/useBackClose';
import { compressImage } from '@/lib/imageCompress';
import ImageCropDialog from '../party/ImageCropDialog';
import PhotoChooser from '../shared/PhotoChooser';
import CountryCodeSelect, { DEFAULT_COUNTRY, isValidPhoneFor, toE164, splitPhone } from '../shared/CountryCodeSelect';


/**
 * "New due" step of the sale flow — shown when the user picks the
 * "বাকি" payment method. Creates a party + credit-sale entry in the ledger.
 */
export default function SaleDuePage({ summary, onClose, onSubmit, initialParty, lockPartyType = false, readOnlyParty = false }) {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const { user } = useAuth();
  const grandTotal = summary?.grandTotal || 0;
  const [amount, setAmount] = useState(String(grandTotal || ''));
  // both entry types are always active: দিলাম (cash payment) + বাকীতে বিক্রয় (credit sale)
  const kind = 'sale';

  const [partyType, setPartyType] = useState(initialParty?.type || 'customer');
  const [name, setName] = useState(initialParty?.name || '');
  const [mobile, setMobile] = useState(splitPhone(initialParty?.phone).national);
  const [country, setCountry] = useState(splitPhone(initialParty?.phone).country || DEFAULT_COUNTRY);
  const [address, setAddress] = useState(initialParty?.address || '');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState(initialParty?.photo || null);
  const [cropSrc, setCropSrc] = useState(null);
  const [showCrop, setShowCrop] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [selectedPartyId, setSelectedPartyId] = useState(initialParty?.id || null);
  // lock party details when an existing party is selected (normal sales) or forced read-only (product-due flow)
  const partyLocked = readOnlyParty || !!selectedPartyId;
  const [showPhotoChooser, setShowPhotoChooser] = useState(false);

  const { data: parties = [] } = useQuery({
    queryKey: ['parties', user?.email],
    queryFn: () => base44.entities.Party.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user,
  });

  const pickerList = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return parties
      .filter(p => (p.type || 'customer') === partyType)
      .filter(p => !q || p.name?.toLowerCase().includes(q) || (p.phone || '').includes(q));
  }, [parties, partyType, pickerSearch]);

  const selectParty = (p) => {
    setSelectedPartyId(p.id);
    setPartyType(p.type || 'customer');
    setName(p.name || '');
    { const sp = splitPhone(p.phone); setMobile(sp.national); setCountry(sp.country || DEFAULT_COUNTRY); }
    setAddress(p.address || '');
    setPhoto(p.photo_url || null);
    setShowPicker(false);
    setPickerSearch('');
  };

  const closeWithAnim = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => onClose?.(), 240);
  }, [closing, onClose]);

  useBackClose(!showCrop && !showPicker, closeWithAnim);

  const num = (n) => (Number(n) || 0).toLocaleString(bn ? 'bn-BD' : 'en-US');


  const pickPhoto = (f) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setCropSrc(ev.target.result); setShowCrop(true); };
    reader.readAsDataURL(f);
  };

  const confirmCrop = async (b64) => {
    setShowCrop(false);
    setCropSrc(null);
    try { setPhoto(await compressImage(b64)); } catch { setPhoto(b64); }
  };

  const phoneValid = isValidPhoneFor(country, mobile);
  const phoneInvalid = !!mobile.trim() && !phoneValid;
  const canNext = !!name.trim() && phoneValid && (Number(amount) || 0) > 0;

  const handleNext = () => {
    if (!canNext) return;
    onSubmit?.({
      ...summary,
      method: 'due',
      amount: Number(amount) || 0,
      kind,
      partyType,
      name: name.trim(),
      mobile: toE164(country, mobile),
      address: address.trim(),
      note: note.trim(),
      photo,
      partyId: selectedPartyId,

    });
  };

  const TYPES = [
    { key: 'customer', label: bn ? 'কাস্টমার' : 'Customer' },
    { key: 'supplier', label: bn ? 'সাপ্লায়ার' : 'Supplier' },
    { key: 'employee', label: bn ? 'কর্মচারী' : 'Employee' },
  ];

  return (
    <div className={`fixed inset-0 z-[55] flex flex-col bg-gray-50 dark:bg-slate-900 ${
      closing ? 'animate-camera-slide-out' : 'animate-camera-slide-in'
    }`}>
      {/* Header */}
      <div
        className="bg-brand-green text-white px-5 pb-6 rounded-b-3xl flex-shrink-0"
        style={{ paddingTop: 'calc(0.35rem + env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-3">
          <button onClick={closeWithAnim} className="p-1.5 hover:bg-white/20 rounded-lg active:opacity-70">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold flex-1">{bn ? 'নতুন বাকি' : 'New due'}</h1>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-3 pb-4 space-y-4">
        {/* Amount */}
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">
            {bn ? 'টাকার পরিমান' : 'Amount'}
          </p>
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 px-4 py-3">
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full bg-transparent text-lg font-bold focus:outline-none dark:text-slate-100"
            />
            <p className="text-right text-lg font-bold text-blue-600 dark:text-blue-400">{num(amount)}</p>
          </div>
        </div>

        {/* Kind */}
        <div className="space-y-2">
          <p className="text-base font-bold text-gray-800 dark:text-slate-100">
            {bn ? 'বিক্রির ধরণ নির্বাচন করুন' : 'Select entry type'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'gave', label: bn ? 'দিলাম' : 'Gave' },
              { key: 'sale', label: bn ? 'বাকীতে বিক্রয়' : 'Credit sale' },
            ].map(o => (
              <div
                key={o.key}
                className="h-14 rounded-xl border-2 flex items-center justify-center gap-2 text-sm font-bold bg-red-500 border-red-500 text-white select-none"
              >
                <span className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-white" />
                </span>
                {o.label}
              </div>
            ))}
          </div>

        </div>

        {/* Party type + photo */}
        <div className="space-y-2">
          <p className="text-base font-bold text-gray-800 dark:text-slate-100">
            {bn ? 'বাকি দিচ্ছেন?' : 'Who is this for?'}
          </p>
          <div className="flex items-center gap-3">
            {!partyLocked && (
              <button
                onClick={() => setShowPhotoChooser(true)}
                className="relative shrink-0 w-12 h-12 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 flex items-center justify-center active:opacity-70 overflow-hidden"
              >
                {photo
                  ? <img src={photo} alt="" className="w-full h-full object-cover" />
                  : <ImagePlus className="w-6 h-6 text-gray-800 dark:text-slate-100" />}
              </button>
            )}
            {photo && !partyLocked && (
              <button
                onClick={() => setPhoto(null)}
                className="shrink-0 w-6 h-6 -ml-2 rounded-full bg-black/60 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            )}
            {partyLocked && photo && (
              <div className="relative shrink-0 w-12 h-12 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 overflow-hidden">
                <img src={photo} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 flex items-center gap-3 flex-wrap">
              {partyLocked ? (
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full border-2 border-blue-600 flex items-center justify-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  </span>
                  <span className="text-sm font-bold text-gray-800 dark:text-slate-100">
                    {TYPES.find(o => o.key === partyType)?.label || partyType}
                  </span>
                </div>
              ) : (
                TYPES.map(o => (
                  <button
                    key={o.key}
                    onClick={() => { if (!lockPartyType) setPartyType(o.key); }}
                    disabled={lockPartyType}
                    className={`flex items-center gap-1.5 ${lockPartyType ? 'cursor-default' : 'active:opacity-70'} ${lockPartyType && partyType !== o.key ? 'opacity-40' : ''}`}
                  >
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${partyType === o.key ? 'border-blue-600' : 'border-gray-400'}`}>
                      {partyType === o.key && <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                    </span>
                    <span className="text-sm font-bold text-gray-800 dark:text-slate-100">{o.label}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">
            {bn ? 'নাম' : 'Name'} <span className="text-red-500">*</span>
          </p>
          <div className={`flex items-center h-14 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 overflow-hidden ${partyLocked ? 'bg-gray-100 dark:bg-slate-700/50' : ''}`}>
            <input
              type="text"
              value={name}
              readOnly={partyLocked}
              onChange={e => { setName(e.target.value); setSelectedPartyId(null); }}
              className="flex-1 min-w-0 h-full px-3 bg-transparent text-sm font-semibold focus:outline-none dark:text-slate-100"
            />
            {!readOnlyParty && (
              <button
                type="button"
                onClick={() => { setPickerSearch(''); setShowPicker(true); }}
                className="px-3 shrink-0 h-full flex items-center active:opacity-70"
              >
                <UserPlus className="w-5 h-5 text-blue-600" />
              </button>
            )}

          </div>
        </div>

        {/* Mobile */}
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">
            {bn ? 'মোবাইল' : 'Mobile'} <span className="text-red-500">*</span>
          </p>
          <div className={`flex items-center h-14 rounded-xl bg-white dark:bg-slate-800 border overflow-hidden ${phoneInvalid ? 'border-red-500' : 'border-gray-200 dark:border-slate-600'} ${partyLocked ? 'bg-gray-100 dark:bg-slate-700/50' : ''}`}>
            <CountryCodeSelect value={country} onChange={setCountry} disabled={partyLocked} />
            <input
              type="tel"
              inputMode="tel"
              value={mobile}
              readOnly={partyLocked}
              onChange={e => setMobile(e.target.value.replace(/[^0-9]/g, ''))}
              className="flex-1 min-w-0 h-full px-3 bg-transparent text-sm font-semibold focus:outline-none dark:text-slate-100"
            />
          </div>
          {phoneInvalid && (
            <p className="text-xs text-red-500">{bn ? 'মোবাইল নম্বরটি সঠিক নয়!' : 'Invalid mobile number!'}</p>
          )}
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">{bn ? 'ঠিকানা' : 'Address'}</p>
          <input
            type="text"
            value={address}
            readOnly={partyLocked}
            onChange={e => setAddress(e.target.value)}
            placeholder={bn ? 'ঠিকানা' : 'Address'}
            className={`w-full h-14 px-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-sm font-semibold focus:outline-none focus:border-blue-600 dark:text-slate-100 ${partyLocked ? 'bg-gray-100 dark:bg-slate-700/50' : ''}`}
          />
        </div>

        {/* Note */}
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">{bn ? 'নোট' : 'Note'}</p>
          <textarea
            rows={2}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={bn ? 'নোট' : 'Note'}
            className="w-full px-3 py-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-sm font-medium focus:outline-none focus:border-blue-600 resize-none dark:text-slate-100"
          />
        </div>
      </div>

      {/* Next */}
      <div
        className="flex-shrink-0 px-3 pt-2 bg-gray-50 dark:bg-slate-900"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={handleNext}
          disabled={!canNext}
          className="w-full h-14 rounded-xl bg-blue-600 disabled:opacity-50 text-white text-base font-bold active:opacity-70"
        >
          {bn ? 'এগিয়ে যান' : 'Continue'}
        </button>
      </div>

      {showPicker && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center px-5">
          <div className="w-full max-w-sm max-h-[80vh] flex flex-col rounded-2xl bg-white dark:bg-slate-800 p-4">
            <p className="text-lg font-semibold text-gray-800 dark:text-slate-100">
              {bn ? 'পার্টি নির্বাচন করুন' : 'Select party'}
            </p>
            <div className="relative mt-3 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                placeholder={bn ? 'খোঁজ করুন' : 'Search'}
                className="w-full h-12 pl-11 pr-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-transparent text-sm focus:outline-none dark:text-slate-100"
              />
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto mt-2">
              {pickerList.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  {bn ? 'কেউ নেই' : 'No party found'}
                </p>
              ) : pickerList.map(p => (
                <button
                  key={p.id}
                  onClick={() => selectParty(p)}
                  className="w-full text-left py-3 border-b border-gray-200 dark:border-slate-700 text-base text-gray-800 dark:text-slate-100 active:opacity-70"
                >
                  {p.name}{p.phone ? ` (${p.phone})` : ''}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-3 shrink-0">
              <button
                onClick={() => setShowPicker(false)}
                className="flex-1 h-12 rounded-xl border border-gray-400 text-sm font-semibold text-gray-800 dark:text-slate-100 active:opacity-70"
              >
                {bn ? 'বন্ধ করুন' : 'Close'}
              </button>
              <button
                onClick={() => { setShowPicker(false); setSelectedPartyId(null); setName(''); setMobile(''); setAddress(''); }}
                className="flex-1 h-12 rounded-xl bg-blue-600 text-white text-sm font-semibold active:opacity-70"
              >
                {bn ? 'নতুন যুক্ত করুন' : 'Add new'}
              </button>
            </div>
          </div>
        </div>
      )}


      <PhotoChooser open={showPhotoChooser} onOpenChange={setShowPhotoChooser} onSelect={pickPhoto} />

      <ImageCropDialog
        open={showCrop}
        imageSrc={cropSrc}
        onConfirm={confirmCrop}
        onCancel={() => { setShowCrop(false); setCropSrc(null); }}
      />
    </div>
  );
}
