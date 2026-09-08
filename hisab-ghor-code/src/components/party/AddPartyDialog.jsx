import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Camera } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import ImageCropDialog from './ImageCropDialog';
import PhotoChooser from '../shared/PhotoChooser';
import CountryCodeSelect, { DEFAULT_COUNTRY, isValidPhoneFor, toE164 } from '../shared/CountryCodeSelect';
import { compressImage } from '@/lib/imageCompress';

export default function AddPartyDialog({ open, onOpenChange, onSave }) {
  const { t, language } = useLanguage();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [address, setAddress] = useState('');
  const [type, setType] = useState('customer');
  const [openingBalance, setOpeningBalance] = useState('');
  const [photo, setPhoto] = useState('');
  const [cropSrc, setCropSrc] = useState(null);
  const [showCrop, setShowCrop] = useState(false);
  const [showChooser, setShowChooser] = useState(false);
  const [triedSave, setTriedSave] = useState(false);

  const bn = language === 'bn';
  const phoneMissing = !phone.trim();
  const phoneInvalid = phone.trim() && !isValidPhoneFor(country, phone.trim());
  const phoneError = (triedSave && phoneMissing) || phoneInvalid;

  const handlePhotoChange = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setCropSrc(ev.target.result); setShowCrop(true); };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setTriedSave(true);
    if (!name.trim() || phoneMissing || phoneInvalid) return;
    const compressed = photo ? await compressImage(photo) : '';
    const bal = parseFloat(openingBalance) || 0;
    const total_debit = type === 'customer' ? bal : 0;
    const total_credit = type === 'supplier' ? bal : 0;
    onSave({ name: name.trim(), phone: toE164(country, phone.trim()), address: address.trim() || null, type, total_debit, total_credit, photo_url: compressed || undefined });
    reset();
    onOpenChange(false);
  };

  const reset = () => {
    setName(''); setPhone(''); setAddress(''); setType('customer'); setCountry(DEFAULT_COUNTRY);
    setOpeningBalance(''); setPhoto(''); setTriedSave(false);
  };

  return (
    <>
      <Dialog open={open && !showCrop} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="w-5 h-5 text-emerald-600" />
              {t('addNewParty')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Photo + Type row */}
            <div className="flex items-center gap-4">
              {/* Avatar / photo - full clickable */}
              <button
                type="button"
                onClick={() => setShowChooser(true)}
                className="relative shrink-0 w-16 h-16 rounded-full overflow-hidden bg-gray-100 dark:bg-slate-700 flex items-center justify-center active:opacity-70"
              >
                {photo
                  ? <img src={photo} alt="avatar" className="w-full h-full object-cover" />
                  : <span className="text-2xl font-bold text-gray-400">{name?.charAt(0)?.toUpperCase() || '?'}</span>
                }
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-black/40 flex items-center justify-center">
                  <Camera className="w-3.5 h-3.5 text-white" />
                </div>
              </button>

              {/* Type tabs */}
              <Tabs value={type} onValueChange={setType} className="flex-1">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="customer" className="text-xs px-1">{t('customer')}</TabsTrigger>
                  <TabsTrigger value="supplier" className="text-xs px-1">{t('supplier')}</TabsTrigger>
                  <TabsTrigger value="employee" className="text-xs px-1">{t('employee')}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Name */}
            <div>
              <Label className="text-sm text-gray-600">{t('name')} *</Label>
              <Input
                placeholder={t('partyName')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 h-12 rounded-xl"
              />
            </div>

            {/* Phone */}
            <div>
              <Label className="text-sm text-gray-600">{t('mobileNumber')} *</Label>
              <div className={`mt-1 flex items-center h-12 rounded-xl bg-white dark:bg-slate-800 border overflow-hidden ${phoneError ? 'border-red-500' : 'border-gray-200 dark:border-slate-600'}`}>
                <CountryCodeSelect value={country} onChange={setCountry} />
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder={bn ? 'মোবাইল নম্বর' : 'Mobile number'}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ''))}
                  className="flex-1 min-w-0 h-full px-3 bg-transparent text-base focus:outline-none dark:text-slate-100"
                />
              </div>
              {phoneError && (
                <p className="text-xs text-red-500 mt-1">
                  {phoneInvalid
                    ? (bn ? 'মোবাইল নম্বরটি সঠিক নয়!' : 'Mobile number is invalid!')
                    : (bn ? 'মোবাইল নম্বর বাধ্যতামূলক' : 'Mobile number is required')}
                </p>
              )}
            </div>

            {/* Address */}
            <div>
              <Label className="text-sm text-gray-600">{bn ? 'ঠিকানা' : 'Address'}</Label>
              <Input
                placeholder={bn ? 'ঠিকানা' : 'Address'}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 h-12 rounded-xl"
              />
            </div>



            {/* Opening balance */}
            <div>
              <Label className="text-sm text-gray-600">{bn ? 'পূর্বের বাকি (জের)' : 'Opening Balance'}</Label>
              <Input
                placeholder="0"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="mt-1 h-12 rounded-xl"
                type="number"
                min="0"
              />
              {openingBalance && parseFloat(openingBalance) > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {type === 'customer' ? (bn ? '→ মোট পাবো তে যোগ হবে' : '→ Added to receivable') : (bn ? '→ মোট দেবো তে যোগ হবে' : '→ Added to payable')}
                </p>
              )}
            </div>

            <Button
              onClick={handleSave}
              disabled={!name.trim() || phoneMissing || phoneInvalid}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-base font-semibold"
            >
              {t('save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PhotoChooser open={showChooser} onOpenChange={setShowChooser} onSelect={handlePhotoChange} />

      <ImageCropDialog
        open={showCrop}
        imageSrc={cropSrc}
        onConfirm={(b64) => { setPhoto(b64); setShowCrop(false); setCropSrc(null); }}
        onCancel={() => { setShowCrop(false); setCropSrc(null); }}
      />
    </>
  );
}