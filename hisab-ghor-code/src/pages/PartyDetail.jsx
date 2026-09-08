import React, { useState, useEffect, useRef } from 'react';
import { compressImage } from '@/lib/imageCompress';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Phone, Trash2, CalendarDays, MoreVertical, Pencil, Camera, MapPin } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatLocalDateTime } from '@/lib/utils';
import CalendarPopup from '../components/shared/CalendarPopup';
import { format as fnsFormat } from 'date-fns';
import PartyAvatar from '../components/party/PartyAvatar';
import ImageCropDialog from '../components/party/ImageCropDialog';
import PhotoChooser from '../components/shared/PhotoChooser';
import AddTransactionDialog from '../components/transaction/AddTransactionDialog';
import DueTypeSheet from '../components/shared/DueTypeSheet';
import CountryCodeSelect, { DEFAULT_COUNTRY, isValidPhoneFor, toE164, splitPhone } from '../components/shared/CountryCodeSelect';

import EmptyState from '../components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import TransactionActions from '../components/transaction/TransactionActions';
import { useLanguage } from '../components/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { useAccountStatus } from '@/hooks/useAccountStatus';
import TrialExpiredPopup from '../components/TrialExpiredPopup';

const CATEGORY_LABELS = {
  cash_payment: { bn: 'ক্যাশ প্রদান',  en: 'Cash Payment' },
  sale:         { bn: 'বাকীতে বিক্রয়', en: 'Credit Sale' },
  cash_receipt: { bn: 'ক্যাশ গ্রহণ',   en: 'Cash Receipt' },
  purchase:     { bn: 'বাকীতে ক্রয়',   en: 'Credit Purchase' },
};

export default function PartyDetail({ partyId: partyIdProp } = {}) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const urlParams = new URLSearchParams(window.location.search);
  const partyId = partyIdProp || urlParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showTxn, setShowTxn] = useState(false);
  const [defaultTxnType, setDefaultTxnType] = useState('debit');
  const [dueSheet, setDueSheet] = useState(null); // 'debit' | 'credit' | null
  // Set when the sheet closes because we are navigating to another page —
  // the central back-guard cleanup must NOT call history.back() then,
  // otherwise it would pop the page we just navigated to.
  const navigatingAwayRef = useRef(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showTrialPopup, setShowTrialPopup] = useState(false);
  const [showDeleteParty, setShowDeleteParty] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [showPartyMenu, setShowPartyMenu] = useState(false);
  const [showEditParty, setShowEditParty] = useState(false);
  const [editPartyName, setEditPartyName] = useState('');
  const [editPartyPhone, setEditPartyPhone] = useState('');
  const [editPartyCountry, setEditPartyCountry] = useState(DEFAULT_COUNTRY);
  const [editPartyAddress, setEditPartyAddress] = useState('');
  const [editPartyPhoto, setEditPartyPhoto] = useState('');
  const [editTriedSave, setEditTriedSave] = useState(false);
  const [showPhotoChooser, setShowPhotoChooser] = useState(false);
  const { canAct } = useAccountStatus();
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [showCropDialog, setShowCropDialog] = useState(false);

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
    setEditPartyPhoto(croppedBase64);
    setShowCropDialog(false);
    setCropImageSrc(null);
  };

  const handleCropCancel = () => {
    setShowCropDialog(false);
    setCropImageSrc(null);
  };

  // Popups that handle their OWN back button (push their own history state)
  const selfBackPopup = showTxn || showEditDialog || showCalendar || showTrialPopup;
  // Popups that need PartyDetail's central back guard (no own back handling)
  const needsCentralGuard = !selfBackPopup && (dueSheet !== null || showCropDialog || showEditParty || showPhotoViewer || showDeleteParty || showPartyMenu);
  // Any popup open (for Layout's __popupOpen flag)
  const anyPopupOpen = selfBackPopup || needsCentralGuard;

  useEffect(() => {
    window.__popupOpen = anyPopupOpen;
    return () => { window.__popupOpen = false; };
  }, [anyPopupOpen]);

  useEffect(() => {
    if (!needsCentralGuard) return;
    navigatingAwayRef.current = false;
    let closedByPopstate = false;
    window.history.pushState({ popupGuard: true }, '');
    const handlePop = () => {
      closedByPopstate = true;
      if (dueSheet)        { setDueSheet(null); return; }
      if (showPartyMenu)   { setShowPartyMenu(false); return; }
      if (showCropDialog)  { setShowCropDialog(false); setCropImageSrc(null); return; }
      if (showPhotoViewer) { setShowPhotoViewer(false); return; }
      if (showEditParty)   { setShowEditParty(false); return; }
      if (showDeleteParty) { setShowDeleteParty(false); return; }
    };
    window.addEventListener('popstate', handlePop);
    return () => {
      window.removeEventListener('popstate', handlePop);
      if (!closedByPopstate && !navigatingAwayRef.current) {
        window.history.back();
      }
    };
  }, [needsCentralGuard]);

  const { data: party, isLoading: loadingParty } = useQuery({
    queryKey: ['party', partyId, user?.email],
    queryFn: () => base44.entities.Party.filter({ id: partyId, created_by: user.email }),
    select: (data) => data[0],
    enabled: !!partyId && !!user,
  });

  const { data: transactions = [], isLoading: loadingTxn } = useQuery({
    queryKey: ['transactions', partyId, user?.email],
    queryFn: () => base44.entities.Transaction.filter({ party_id: partyId, created_by: user.email }, 'created_date'),
    enabled: !!partyId && !!user,
  });

  const txnQKey = ['transactions', partyId, user?.email];

  const createTxn = useMutation({
    mutationFn: async (data) => {
      const { createsCash, ...txnData } = data;
      const txn = await base44.entities.Transaction.create({
        ...txnData,
        party_id: partyId,
        party_name: party.name,
      });
      const updateData = data.type === 'debit'
        ? { total_debit: (party.total_debit || 0) + data.amount }
        : { total_credit: (party.total_credit || 0) + data.amount };
      await base44.entities.Party.update(partyId, updateData);
      
      // Only create linked cash entry for cash_payment / cash_receipt categories
      if (createsCash) {
        await base44.entities.CashEntry.create({
          type: data.type === 'credit' ? 'cash_in' : 'cash_out',
          amount: data.amount,
          category: 'other',
          description: `${party.name} - ${data.description || (data.type === 'debit' ? (language === 'bn' ? 'দিলাম' : 'Gave') : (language === 'bn' ? 'পেলাম' : 'Received'))}`,
          party_name: party.name,
          date: data.date,
          transaction_id: txn.id,
        });
      }
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: txnQKey });
      const prev = queryClient.getQueryData(txnQKey);
      const optimistic = { ...data, id: `temp-${Date.now()}`, party_id: partyId, party_name: party?.name, created_date: new Date().toISOString() };
      queryClient.setQueryData(txnQKey, (old = []) => [optimistic, ...old]);
      return { prev };
    },
    onError: (_, __, ctx) => queryClient.setQueryData(txnQKey, ctx.prev),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['party', partyId, user?.email] });
      queryClient.invalidateQueries({ queryKey: txnQKey });
      queryClient.invalidateQueries({ queryKey: ['parties', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['cashEntries', user?.email] });
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, data, oldData }) => {
      await base44.entities.Transaction.update(id, data);
      
      // Update linked cash entry
      const linkedCash = await base44.entities.CashEntry.filter({ transaction_id: id, created_by: user.email });
      if (linkedCash.length > 0) {
        const cashEntry = linkedCash[0];
        await base44.entities.CashEntry.update(cashEntry.id, {
          type: data.type === 'credit' ? 'cash_in' : 'cash_out',
          amount: data.amount,
          date: data.date,
          description: data.description || cashEntry.description,
        });
      }
      
      // Update party totals
      const oldAmount = oldData.amount;
      const newAmount = data.amount;
      const oldType = oldData.type;
      const newType = data.type;
      
      let debitChange = 0;
      let creditChange = 0;
      
      if (oldType === 'debit') debitChange -= oldAmount;
      else creditChange -= oldAmount;
      
      if (newType === 'debit') debitChange += newAmount;
      else creditChange += newAmount;
      
      await base44.entities.Party.update(partyId, {
        total_debit: (party.total_debit || 0) + debitChange,
        total_credit: (party.total_credit || 0) + creditChange,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['party', partyId, user?.email] });
      queryClient.invalidateQueries({ queryKey: ['transactions', partyId, user?.email] });
      queryClient.invalidateQueries({ queryKey: ['parties', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.email] });
      setShowEditDialog(false);
      setEditingTransaction(null);
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (txn) => {
      // Delete linked cash entry if exists
      if (txn.id) {
        const linkedCash = await base44.entities.CashEntry.filter({ transaction_id: txn.id, created_by: user.email });
        for (const cash of linkedCash) {
          await base44.entities.CashEntry.delete(cash.id);
        }
      }
      
      await base44.entities.Transaction.delete(txn.id);
      const updateData = txn.type === 'debit'
        ? { total_debit: (party.total_debit || 0) - txn.amount }
        : { total_credit: (party.total_credit || 0) - txn.amount };
      await base44.entities.Party.update(partyId, updateData);
    },
    onMutate: async (txn) => {
      await queryClient.cancelQueries({ queryKey: txnQKey });
      const prev = queryClient.getQueryData(txnQKey);
      queryClient.setQueryData(txnQKey, (old = []) => old.filter(t => t.id !== txn.id));
      return { prev };
    },
    onError: (_, __, ctx) => queryClient.setQueryData(txnQKey, ctx.prev),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['party', partyId, user?.email] });
      queryClient.invalidateQueries({ queryKey: txnQKey });
      queryClient.invalidateQueries({ queryKey: ['parties', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['cashEntries', user?.email] });
    },
  });

  const editParty = useMutation({
    mutationFn: async ({ name, phone, address, photo_url }) => {
      let finalPhotoUrl = photo_url;
      // If it's a new base64 image, compress it before saving
      if (photo_url && photo_url.startsWith('data:')) {
        finalPhotoUrl = await compressImage(photo_url);
      }
      await base44.entities.Party.update(partyId, {
        name: name.trim(),
        phone: phone.trim(),
        address: address?.trim() || null,
        photo_url: finalPhotoUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['party', partyId, user?.email] });
      queryClient.invalidateQueries({ queryKey: ['parties', user?.email] });
      setShowEditParty(false);
    },
  });

  const deleteParty = useMutation({
    mutationFn: async () => {
      // Delete all linked cash entries and transactions
      for (const txn of transactions) {
        const linkedCash = await base44.entities.CashEntry.filter({ transaction_id: txn.id, created_by: user.email });
        for (const cash of linkedCash) {
          await base44.entities.CashEntry.delete(cash.id);
        }
        await base44.entities.Transaction.delete(txn.id);
      }
      await base44.entities.Party.delete(partyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['cashEntries', user?.email] });
      navigate(createPageUrl('Khata'));
    },
  });

  if (loadingParty) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!party) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>{language === 'bn' ? 'পার্টি পাওয়া যায়নি' : 'Party not found'}</p>
        <Link to={createPageUrl('Khata')} className="text-emerald-600 font-medium mt-2 inline-block">
          ← {language === 'bn' ? 'খাতায় ফিরে যান' : 'Back to Ledger'}
        </Link>
      </div>
    );
  }

  const balance = (party.total_debit || 0) - (party.total_credit || 0);
  const isOwed = balance > 0;

  const bn = language === 'bn';
  const phoneMissing = !editPartyPhone.trim();
  const phoneInvalid = editPartyPhone.trim() && !isValidPhoneFor(editPartyCountry, editPartyPhone.trim());
  const phoneError = (editTriedSave && phoneMissing) || phoneInvalid;

  const handleEditPartySave = () => {
    setEditTriedSave(true);
    if (!editPartyName.trim() || phoneMissing || phoneInvalid) return;
    editParty.mutate({
      name: editPartyName,
      phone: toE164(editPartyCountry, editPartyPhone.trim()),
      address: editPartyAddress,
      photo_url: editPartyPhoto,
    });
  };

  const handleEdit = (txn) => {
    if (!canAct) { setShowTrialPopup(true); return; }
    setEditingTransaction(txn);
    setShowEditDialog(true);
  };

  const handleDelete = (txn) => {
    if (!canAct) { setShowTrialPopup(true); return; }
    deleteTransaction.mutate(txn);
  };

  const handleDeleteParty = () => {
    if (!canAct) { setShowTrialPopup(true); return; }
    deleteParty.mutate();
  };

  // দিলাম / পেলাম click — customer & employee দিলাম and supplier পেলাম ask for due type first
  const handleTxnButton = (type) => {
    if (!canAct) { setShowTrialPopup(true); return; }
    const needsSheet = party.type === 'supplier' ? type === 'credit' : type === 'debit';
    if (needsSheet) { setDueSheet(type); return; }
    setDefaultTxnType(type);
    setShowTxn(true);
  };

  const handleDueTypeSelect = (kind) => {
    const type = dueSheet;
    setDueSheet(null);
    if (kind === 'money') {
      setDefaultTxnType(type);
      setShowTxn(true);
      return;
    }
    // Product due → sale flow with this party preselected
    navigatingAwayRef.current = true;
    const params = new URLSearchParams({
      duePartyId: partyId,
      duePartyName: party.name || '',
      duePartyPhone: party.phone || '',
      duePartyType: party.type || 'customer',
      duePartyAddress: party.address || '',
      duePartyPhoto: party.photo_url || '',
    });
    const saleUrl = `${createPageUrl('Sale')}?${params.toString()}`;
    // The due-type sheet owns a temporary history guard. Pop that guard first,
    // then push Sale as a normal entry: Back from Sale returns to PartyDetail.
    // The receipt later closes via history.back(), which pops Sale and lands
    // on this same PartyDetail entry — so one more Back reaches বাকীর খাতা.
    if (window.history.state?.popupGuard) {
      window.addEventListener(
        'popstate',
        () => navigate(saleUrl),
        { once: true },
      );
      window.history.back();
      return;
    }
    navigate(saleUrl);
  };

  const handleSaveEdit = (data) => {
    updateTransaction.mutate({ id: editingTransaction.id, data, oldData: editingTransaction });
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 dark:bg-slate-900 z-10" style={{ top: 0 }}>
      {/* Header - fixed */}
      <div className="bg-brand-green text-white px-5 pb-8 rounded-b-3xl flex-shrink-0" style={{ paddingTop: 'calc(0.35rem + env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-white/20 rounded-lg transition active:opacity-70">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-medium flex-1">{t('partyDetail')}</span>
          <div className="relative">
            <button
              onClick={() => setShowPartyMenu(v => !v)}
              className="p-1.5 hover:bg-white/20 rounded-lg transition"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showPartyMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowPartyMenu(false)} />
                <div className="absolute right-0 top-9 z-50 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden w-40">
                  <button
                    onClick={() => {
                      setShowPartyMenu(false);
                      const split = splitPhone(party.phone);
                      setEditPartyName(party.name);
                      setEditPartyPhone(split.national.replace(/^0+/, ''));
                      setEditPartyCountry(split.country);
                      setEditPartyAddress(party.address || '');
                      setEditPartyPhoto(party.photo_url || '');
                      setEditTriedSave(false);
                      setShowEditParty(true);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    <Pencil className="w-4 h-4 text-emerald-600" />
                    {t('edit')}
                  </button>
                  <button
                    onClick={() => { setShowPartyMenu(false); setShowDeleteParty(true); }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('delete')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div onClick={() => party.photo_url && setShowPhotoViewer(true)} className={party.photo_url ? 'cursor-pointer' : ''}>
            <PartyAvatar name={party.name} size="lg" photoUrl={party.photo_url} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{party.name}</h1>
            <p className="text-emerald-100 text-sm">
              {party.type === 'supplier' ? t('supplier') : party.type === 'employee' ? t('employee') : t('customer')}
            </p>
            {party.phone && (
              <a href={`tel:${party.phone}`} className="flex items-center gap-1 text-emerald-100 text-sm mt-1">
                <Phone className="w-3.5 h-3.5" /> {party.phone}
              </a>
            )}
            {party.address && (
              <p className="flex items-start gap-1 text-emerald-100 text-sm mt-1">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="break-words">{party.address}</span>
              </p>
            )}
          </div>
        </div>
        {/* Balance card */}
        <div className="mt-5 bg-white/15 backdrop-blur rounded-xl p-4">
          <div className="grid grid-cols-3 text-center">
            <div>
              <p className="text-emerald-100 text-xs">{t('gave')}</p>
              <p className="text-lg font-bold text-red-200 mt-1">৳{(party.total_debit || 0).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}</p>
            </div>
            <div>
              <p className="text-emerald-100 text-xs">{t('received')}</p>
              <p className="text-lg font-bold text-emerald-200 mt-1">৳{(party.total_credit || 0).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}</p>
            </div>
            <div>
              <p className="text-emerald-100 text-xs">{t('balance')}</p>
              <p className={`text-lg font-bold mt-1 ${isOwed ? 'text-red-200' : balance < 0 ? 'text-emerald-200' : 'text-white'}`}>
                ৳{Math.abs(balance).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
              </p>
              <p className="text-xs text-emerald-200">
                {isOwed ? t('owed') : balance < 0 ? t('payable') : t('even')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions + List */}
      <div className="flex flex-col flex-1 min-h-0 px-4 -mt-4">
        {/* Action buttons - fixed */}
        <div className="flex gap-2 flex-shrink-0">
          <Button onClick={() => handleTxnButton('debit')} className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 font-semibold">
            {t('gave')}
          </Button>
          <Button onClick={() => handleTxnButton('credit')} className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold">
            {t('received')}
          </Button>
        </div>

        {/* Transaction history header - fixed */}
        <div className="flex items-center justify-between mt-4 mb-3 flex-shrink-0">
          <h2 className="font-semibold text-gray-800 dark:text-slate-100">{t('transactionHistory')}</h2>
          <div className="flex items-center gap-1">
            {customFrom && customTo && (
              <button
                onClick={() => { setCustomFrom(''); setCustomTo(''); }}
                className="text-xs text-gray-400 px-2 py-1.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 active:opacity-70"
              >
                ✕
              </button>
            )}
            <button
              onClick={() => setShowCalendar(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:opacity-70 ${
                customFrom && customTo
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              {customFrom && customTo
                ? `${fnsFormat(new Date(customFrom), 'dd MMM')} - ${fnsFormat(new Date(customTo), 'dd MMM')}`
                : (language === 'bn' ? 'কাস্টম' : 'Custom')}
            </button>
          </div>
          <AlertDialog open={showDeleteParty} onOpenChange={setShowDeleteParty}>
            <AlertDialogContent className="rounded-2xl max-w-sm">
              <AlertDialogHeader>
                <AlertDialogTitle>{t('deletePartyConfirm')}</AlertDialogTitle>
                <AlertDialogDescription>{t('deletePartyDesc')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteParty} className="rounded-xl bg-red-600 hover:bg-red-700">
                  {t('delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Transaction list - ledger style (scrollable) */}
        {(() => {
          const locale = language === 'bn' ? 'bn-BD' : 'en-US';
          const filteredTxns = [...transactions]
            .filter(txn => {
              if (!customFrom || !customTo) return true;
              const d = txn.date || (txn.created_date ? txn.created_date.split('T')[0] : '');
              return d >= customFrom && d <= customTo;
            })
            .sort((a, b) => {
              const da = a.date || (a.created_date ? a.created_date.split('T')[0] : '');
              const db = b.date || (b.created_date ? b.created_date.split('T')[0] : '');
              if (da !== db) return da < db ? -1 : 1;
              return new Date(a.created_date) - new Date(b.created_date);
            });
          let running = 0;
          const chronological = filteredTxns.map(txn => {
            running += txn.type === 'debit' ? txn.amount : -txn.amount;
            return { ...txn, _balance: running };
          });
          const rows = chronological.slice().reverse();
          const totalCredit = rows.filter(x => x.type === 'credit').reduce((s, x) => s + x.amount, 0);
          const totalDebit = rows.filter(x => x.type === 'debit').reduce((s, x) => s + x.amount, 0);
          const fmtAmt = (n) => `${Math.abs(n).toLocaleString(locale)} ৳`;
          return (
            <>
              {/* Column headers */}
              <div className="flex items-center px-1 mb-2 flex-shrink-0">
                <span className="flex-1 text-sm font-semibold text-gray-700 dark:text-slate-200">
                  {t('total') || (language === 'bn' ? 'মোট' : 'Total')}
                </span>
                <span className="w-[4.5rem] text-center text-sm font-semibold text-emerald-600">{t('received')}</span>
                <span className="w-[4.5rem] text-center text-sm font-semibold text-red-500">{t('gave')}</span>
                <span className="w-[4.5rem] text-center text-sm font-semibold text-gray-700 dark:text-slate-200">{t('balance')}</span>
              </div>

              <div className="overflow-y-auto flex-1 min-h-0">
                {loadingTxn ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
                  </div>
                ) : rows.length === 0 ? (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
                    <EmptyState
                      title={t('noTransactions')}
                      subtitle={language === 'bn' ? 'প্রথম লেনদেন যোগ করুন' : 'Add first transaction'}
                    />
                  </div>
                ) : (
                  <div className="space-y-3 pb-1">
                    {rows.map(txn => (
                      <div key={txn.id} className="relative flex items-stretch bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                        {/* Date / note cell */}
                        <div className="flex-1 min-w-0 px-3 py-3 flex flex-col justify-center">
                          <p className="text-sm font-semibold text-gray-800 dark:text-slate-100 leading-tight">
                            {txn.created_date ? formatLocalDateTime(txn.created_date, txn.date, txn.time) : (txn.date ? txn.date : '')}
                          </p>
                          {txn.category && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                              {CATEGORY_LABELS[txn.category]?.[language] || txn.category}
                            </p>
                          )}
                          {txn.description && (
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 truncate">
                              {language === 'bn' ? 'নোট: ' : 'Note: '}{txn.description}
                            </p>
                          )}
                        </div>
                        {/* Received (credit) cell */}
                        <div className={`w-[4.5rem] shrink-0 flex items-center justify-center ${txn.type === 'credit' ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}`}>
                          {txn.type === 'credit' && (
                            <span className="text-sm font-bold text-emerald-600">{fmtAmt(txn.amount)}</span>
                          )}
                        </div>
                        {/* Gave (debit) cell */}
                        <div className={`w-[4.5rem] shrink-0 flex items-center justify-center ${txn.type === 'debit' ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                          {txn.type === 'debit' && (
                            <span className="text-sm font-bold text-red-500">{fmtAmt(txn.amount)}</span>
                          )}
                        </div>
                        {/* Balance cell */}
                        <div className="w-[4.5rem] shrink-0 flex items-center justify-center">
                          <span className={`text-sm font-bold ${txn._balance > 0 ? 'text-red-500' : txn._balance < 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                            {fmtAmt(txn._balance)}
                          </span>
                        </div>
                        {/* Actions */}
                        <div className="absolute top-0.5 right-0.5 opacity-60">
                          <TransactionActions
                            transaction={txn}
                            onEdit={handleEdit}
                            onDelete={() => handleDelete(txn)}
                            canAct={canAct}
                            onTrialExpired={() => setShowTrialPopup(true)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </div>

      <CalendarPopup
        open={showCalendar}
        onClose={() => setShowCalendar(false)}
        from={customFrom}
        to={customTo}
        language={language}
        onApply={(from, to) => { setCustomFrom(from); setCustomTo(to); }}
      />

      <TrialExpiredPopup open={showTrialPopup} onOpenChange={setShowTrialPopup} />

      {/* Edit Party Dialog */}
      {showEditParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setShowEditParty(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-800 dark:text-slate-100 mb-4">{t('edit')} {language === 'bn' ? 'পার্টি' : 'Party'}</h3>
            <div className="space-y-3">
              {/* Photo upload */}
              <div className="flex flex-col items-center gap-3 mb-2">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                  {editPartyPhoto ? (
                    <img src={editPartyPhoto} alt="photo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-gray-400">{editPartyName?.charAt(0)?.toUpperCase() || '?'}</span>
                  )}
                </div>
                {editPartyPhoto ? (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setEditPartyPhoto('')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-red-400 text-red-500 text-sm font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {language === 'bn' ? 'ডিলিট' : 'Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPhotoChooser(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-medium"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      {language === 'bn' ? 'পরিবর্তন' : 'Change'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPhotoChooser(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 text-white text-sm font-medium"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    {language === 'bn' ? 'ছবি যোগ করুন' : 'Add Photo'}
                  </button>
                )}
                <PhotoChooser open={showPhotoChooser} onOpenChange={setShowPhotoChooser} onSelect={handlePhotoChange} />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-slate-300">{t('name')} *</label>
                <input
                  value={editPartyName}
                  onChange={e => setEditPartyName(e.target.value)}
                  className="mt-1 w-full h-12 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 text-sm dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-slate-300">{t('mobileNumber')} *</label>
                <div className={`mt-1 flex items-center h-12 rounded-xl bg-white dark:bg-slate-800 border overflow-hidden ${phoneError ? 'border-red-500' : 'border-gray-200 dark:border-slate-600'}`}>
                  <CountryCodeSelect value={editPartyCountry} onChange={setEditPartyCountry} />
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder={bn ? 'মোবাইল নম্বর' : 'Mobile number'}
                    value={editPartyPhone}
                    onChange={(e) => setEditPartyPhone(e.target.value.replace(/[^\d]/g, ''))}
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
              <div>
                <label className="text-sm text-gray-600 dark:text-slate-300">{language === 'bn' ? 'ঠিকানা' : 'Address'}</label>
                <input
                  value={editPartyAddress}
                  onChange={e => setEditPartyAddress(e.target.value)}
                  placeholder={language === 'bn' ? 'ঠিকানা' : 'Address'}
                  className="mt-1 w-full h-12 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 text-sm dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowEditParty(false)} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm text-gray-600">
                  {t('cancel')}
                </button>
                <button
                  onClick={handleEditPartySave}
                  disabled={!editPartyName.trim() || phoneMissing || phoneInvalid}
                  className="flex-1 h-11 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {t('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Crop Dialog */}
      <ImageCropDialog
        open={showCropDialog}
        imageSrc={cropImageSrc}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />

      {/* Photo Viewer */}
      {showPhotoViewer && party.photo_url && (
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
            src={party.photo_url}
            alt={party.name}
            className="w-72 h-72 object-cover rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      <DueTypeSheet
        open={dueSheet !== null}
        onClose={() => setDueSheet(null)}
        onSelect={handleDueTypeSelect}
        language={language}
      />

      <AddTransactionDialog
        open={showTxn}
        onOpenChange={setShowTxn}
        partyName={party.name}
        defaultType={defaultTxnType}
        onSave={(data) => createTxn.mutate(data)}
      />

      {editingTransaction && (
        <AddTransactionDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSave={handleSaveEdit}
          transaction={editingTransaction}
        />
      )}
    </div>
  );
}