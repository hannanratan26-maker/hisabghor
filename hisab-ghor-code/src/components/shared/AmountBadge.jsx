import React from 'react';
import { useLanguage } from '../LanguageContext';

export default function AmountBadge({ amount, type }) {
  const { language } = useLanguage();
  const isDebit = type === 'debit' || type === 'cash_out';
  return (
    <span className={`text-sm font-bold ${isDebit ? 'text-red-600' : 'text-emerald-600'}`}>
      {isDebit ? '-' : '+'}৳{Math.abs(amount).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
    </span>
  );
}