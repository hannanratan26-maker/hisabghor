import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { cn, localTimeNow } from '@/lib/utils';
import { useLanguage } from '../LanguageContext';
import DateTimePicker from '../shared/DateTimePicker';

function useIsMobile() {
  return typeof window !== 'undefined' && window.innerWidth < 640;
}

export default function AddCashEntryDialog({ open, onOpenChange, onSave, entry, defaultType }) {
  const { t, language } = useLanguage();
  
  const CATEGORIES_BN = {
    sale: 'বিক্রি', purchase: 'ক্রয়', salary: 'বেতন', rent: 'ভাড়া',
    transport: 'পরিবহন', food: 'খাবার', utility: 'ইউটিলিটি',
    loan_given: 'ধার দিলাম', loan_received: 'ধার পেলাম',
    investment: 'বিনিয়োগ', withdrawal: 'উত্তোলন', other: 'অন্যান্য',
  };
  
  const CATEGORIES_EN = {
    sale: 'Sale', purchase: 'Purchase', salary: 'Salary', rent: 'Rent',
    transport: 'Transport', food: 'Food', utility: 'Utility',
    loan_given: 'Loan Given', loan_received: 'Loan Received',
    investment: 'Investment', withdrawal: 'Withdrawal', other: 'Other',
  };
  
  const CATEGORIES = language === 'bn' ? CATEGORIES_BN : CATEGORIES_EN;
  const isMobile = useIsMobile();
  const popstateClose = useRef(false);
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [type, setType] = useState(entry?.type || defaultType || 'cash_in');
  const [amount, setAmount] = useState(entry?.amount?.toString() || '');
  const [category, setCategory] = useState(entry?.category || 'other');
  const [description, setDescription] = useState(entry?.description || '');
  const [partyName, setPartyName] = useState(entry?.party_name || '');
  const localToday = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const [date, setDate] = useState(entry?.date || localToday());
  const [time, setTime] = useState(entry?.time || localTimeNow());

  useEffect(() => {
    if (open) {
      window.history.pushState({ dialog: true }, '');
      const onPop = () => {
        popstateClose.current = true;
        handleOpenChange(false);
      };
      window.addEventListener('popstate', onPop);
      return () => window.removeEventListener('popstate', onPop);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      if (entry) {
        setType(entry.type);
        setAmount(entry.amount?.toString() || '');
        setCategory(entry.category || 'other');
        setDescription(entry.description || '');
        setPartyName(entry.party_name || '');
        setDate(entry.date || localToday());
        setTime(entry.time || localTimeNow());
      } else {
        setType(defaultType || 'cash_in');
        setAmount('');
        setCategory('other');
        setDescription('');
        setPartyName('');
        setDate(localToday());
        setTime(localTimeNow());
      }
    }
  }, [open, entry]);

  const handleOpenChange = (newOpen) => {
    if (!newOpen) {
      setType(defaultType || 'cash_in');
      setAmount('');
      setCategory('other');
      setDescription('');
      setPartyName('');
      setDate(localToday());
      setTime(localTimeNow());
    }
    if (!newOpen && open && !popstateClose.current) {
      // Closing via UI (× button, save) — pop the history entry so back button stays in sync
      window.history.back();
      return;
    }
    popstateClose.current = false;
    onOpenChange(newOpen);
  };

  const handleSave = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    onSave({
      type,
      amount: parseFloat(amount),
      category,
      description: description.trim(),
      party_name: partyName.trim(),
      date,
      time,
    });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">{entry ? t('editEntry') : t('cashEntry')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setType('cash_in')}
              className={cn(
                "flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all",
                type === 'cash_in' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500'
              )}
            >
              <ArrowDownCircle className="w-5 h-5" />
              {t('cashIn')}
            </button>
            <button
              onClick={() => setType('cash_out')}
              className={cn(
                "flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all",
                type === 'cash_out' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500'
              )}
            >
              <ArrowUpCircle className="w-5 h-5" />
              {t('cashOut')}
            </button>
          </div>
          <div>
            <Label className="text-sm text-gray-600">{t('amount')} (৳) *</Label>
            <Input
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              min="0"
              className="mt-1 h-14 rounded-xl text-2xl font-bold text-center"
            />
          </div>
          <div>
            <Label className="text-sm text-gray-600">{t('category')}</Label>
            {isMobile ? (
              <>
                <button
                  type="button"
                  onClick={() => setCategoryDrawerOpen(true)}
                  className="mt-1 w-full h-12 rounded-xl border border-input bg-transparent px-3 flex items-center justify-between text-sm active:opacity-70"
                >
                  <span>{CATEGORIES[category]}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                <Drawer open={categoryDrawerOpen} onOpenChange={setCategoryDrawerOpen}>
                  <DrawerContent>
                    <DrawerHeader>
                      <DrawerTitle>{t('category')}</DrawerTitle>
                    </DrawerHeader>
                    <div className="px-4 pb-6 grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                      {Object.entries(CATEGORIES).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => { setCategory(key); setCategoryDrawerOpen(false); }}
                          className={cn(
                            "py-3 px-4 rounded-xl border-2 text-sm font-medium text-left active:opacity-70 transition-colors",
                            category === key ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600'
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </DrawerContent>
                </Drawer>
              </>
            ) : (
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1 h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DateTimePicker
            date={date}
            time={time}
            onDateChange={setDate}
            onTimeChange={setTime}
          />
          <div>
            <Label className="text-sm text-gray-600">{t('language') === 'bn' ? 'পার্টির নাম' : 'Party Name'}</Label>
            <Input placeholder={t('optional')} value={partyName} onChange={(e) => setPartyName(e.target.value)} className="mt-1 h-12 rounded-xl" />
          </div>
          <div>
            <Label className="text-sm text-gray-600">{t('description')}</Label>
            <Textarea placeholder={t('writeNote')} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 rounded-xl resize-none" rows={2} />
          </div>
          <Button
            onClick={handleSave}
            disabled={!amount || parseFloat(amount) <= 0}
            className={cn(
              "w-full h-12 rounded-xl text-base font-semibold",
              type === 'cash_in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
            )}
          >
            {entry ? t('update') : t('save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}