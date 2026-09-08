import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PartyAvatar from './PartyAvatar';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

export default function PartyListItem({ party }) {
  const { t, language } = useLanguage();
  const balance = (party.total_debit || 0) - (party.total_credit || 0);
  const isOwed = balance > 0;

  return (
    <Link
      to={createPageUrl(`PartyDetail?id=${party.id}`)}
      className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-slate-700/50 active:opacity-70 transition-colors border-b border-gray-100 dark:border-slate-700 last:border-0"
    >
      <PartyAvatar name={party.name} color={party.avatar_color} photoUrl={party.photo_url} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-slate-100 text-sm truncate">{party.name}</p>
        <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">
          {party.type === 'supplier' ? t('supplier') : party.type === 'employee' ? t('employee') : t('customer')}
          {party.phone ? ` • ${party.phone}` : ''}
        </p>
      </div>
      <div className="text-right shrink-0">
        {balance !== 0 ? (
          <>
            <p className={`text-sm font-bold ${isOwed ? 'text-red-600' : 'text-emerald-600'}`}>
              ৳{Math.abs(balance).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">{isOwed ? t('owed') : t('payable')}</p>
          </>
        ) : (
          <p className="text-xs text-gray-400 dark:text-slate-400">{t('even')}</p>
        )}
      </div>
      <ChevronLeft className="w-4 h-4 text-gray-300 dark:text-slate-600 rotate-180" />
    </Link>
  );
}