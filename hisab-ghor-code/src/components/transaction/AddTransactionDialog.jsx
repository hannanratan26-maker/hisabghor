import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { cn, localTimeNow } from '@/lib/utils';
import { useLanguage } from '../LanguageContext';
import DateTimePicker from '../shared/DateTimePicker';

const DEBIT_CATEGORIES = [
  { value: 'cash_payment', labelBn: 'ক্যাশ প্রদান',  labelEn: 'Cash Payment',    createsCash: true },
  { value: 'sale',         labelBn: 'বাকীতে বিক্রয়', labelEn: 'Credit Sale',      createsCash: false },
];
const CREDIT_CATEGORIES = [
  { value: 'cash_receipt', labelBn: 'ক্যাশ গ্রহণ',  labelEn: 'Cash Receipt',     createsCash: true },
  { value: 'purchase',     labelBn: 'বাকীতে ক্রয়',  labelEn: 'Credit Purchase',  createsCash: false },
];

export function getCategoryConfig(type, categoryValue) {
  const list = type === 'debit' ? DEBIT_CATEGORIES : CREDIT_CATEGORIES;
  return list.find(c => c.value === categoryValue) || null;
}

export default function AddTransactionDialog({ open, onOpenChange, onSave, partyName, defaultType, transaction }) {
  const { t, language } = useLanguage();
  const [type, setType] = useState(transaction?.type || defaultType || 'debit');
  const [category, setCategory] = useState(transaction?.category || '');
  const [amount, setAmount] = useState(transaction?.amount?.toString() || '');
  const [description, setDescription] = useState(transaction?.description || '');
  const localToday = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const [date, setDate] = useState(transaction?.date || localToday());
  const [time, setTime] = useState(transaction?.time || localTimeNow());

  const categories = type === 'debit' ? DEBIT_CATEGORIES : CREDIT_CATEGORIES;

  const handleTypeChange = (newType) => {
    setType(newType);
    setCategory('');
  };

  const handleOpenChange = (newOpen) => {
    if (!newOpen) {
      setType(defaultType || 'debit');
      setCategory('');
      setAmount('');
      setDescription('');
      setDate(localToday());
      setTime(localTimeNow());
    }
    onOpenChange(newOpen);
  };

  useEffect(() => {
    if (open) {
      if (transaction) {
        setType(transaction.type);
        setCategory(transaction.category || '');
        setAmount(transaction.amount?.toString() || '');
        setDescription(transaction.description || '');
        setDate(transaction.date || localToday());
        setTime(transaction.time || localTimeNow());
      } else {
        setType(defaultType || 'debit');
        setCategory('');
        setAmount('');
        setDescription('');
        setDate(localToday());
        setTime(localTimeNow());
      }
    }
  }, [open, transaction, defaultType]);

  // Back button closes dialog
  useEffect(() => {
    if (!open) return;
    let closedByPopstate = false;
    window.history.pushState({ dialog: true }, '');
    const onPop = () => {
      closedByPopstate = true;
      handleOpenChange(false);
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (!closedByPopstate) {
        window.history.back();
      }
    };
  }, [open]);

  const canSave = amount && parseFloat(amount) > 0 && category !== '';

  const handleSave = () => {
    if (!canSave) return;
    const catConfig = getCategoryConfig(type, category);
    onSave({
      type,
      category,
      amount: parseFloat(amount),
      description: description.trim(),
      date,
      time,
      createsCash: catConfig?.createsCash ?? false,
    });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {transaction ? t('editTransaction') : partyName ? `${partyName} - ${t('transaction')}` : t('newTransaction')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleTypeChange('debit')}
              className={cn(
                "flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all",
                type === 'debit' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500'
              )}
            >
              <ArrowUpCircle className="w-5 h-5" />
              {t('gave')}
            </button>
            <button
              onClick={() => handleTypeChange('credit')}
              className={cn(
                "flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all",
                type === 'credit' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500'
              )}
            >
              <ArrowDownCircle className="w-5 h-5" />
              {t('received')}
            </button>
          </div>

          <div>
            <Label className="text-sm text-gray-600">
              {language === 'bn' ? 'ক্যাটাগরি' : 'Category'} *
            </Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {categories.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={cn(
                    "py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition-all",
                    category === cat.value
                      ? type === 'debit'
                        ? 'border-red-400 bg-red-50 text-red-700'
                        : 'border-emerald-400 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  )}
                >
                  {language === 'bn' ? cat.labelBn : cat.labelEn}
                </button>
              ))}
            </div>
            {!category && (
              <p className="text-xs text-red-500 mt-1">
                {language === 'bn' ? 'ক্যাটাগরি সিলেক্ট করুন' : 'Please select a category'}
              </p>
            )}
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

          <DateTimePicker
            date={date}
            time={time}
            onDateChange={setDate}
            onTimeChange={setTime}
          />

          <div>
            <Label className="text-sm text-gray-600">{t('description')}</Label>
            <Textarea
              placeholder={t('transactionDesc')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 rounded-xl resize-none"
              rows={2}
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={!canSave}
            className={cn(
              "w-full h-12 rounded-xl text-base font-semibold",
              type === 'debit' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
            )}
          >
            {transaction ? t('update') : type === 'debit' ? t('saveGave') : t('saveReceived')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}