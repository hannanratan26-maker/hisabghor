import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ChevronDown, Search } from 'lucide-react';
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from 'libphonenumber-js';
import { useLanguage } from '../LanguageContext';

export const DEFAULT_COUNTRY = 'BD';

export function flagEmoji(code) {
  return code.replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export function callingCode(country) {
  try {
    return '+' + getCountryCallingCode(country);
  } catch {
    return '';
  }
}

/** true when the national number is a valid phone number for the given country */
export function isValidPhoneFor(country, national) {
  const digits = String(national || '').replace(/[^0-9]/g, '');
  if (!digits) return false;
  const parsed = parsePhoneNumberFromString(digits, country);
  return !!parsed && parsed.isValid();
}

/** full international number, e.g. +8801712345678 */
export function toE164(country, national) {
  const digits = String(national || '').replace(/[^0-9]/g, '');
  if (!digits) return null;
  const parsed = parsePhoneNumberFromString(digits, country);
  return parsed ? parsed.number : callingCode(country) + digits;
}

/** split a stored number back into { country, national } */
export function splitPhone(value, fallback = DEFAULT_COUNTRY) {
  const raw = String(value || '').trim();
  if (!raw) return { country: fallback, national: '' };
  const withPlus = raw.startsWith('+') ? raw : '+' + raw.replace(/^0+/, '');
  const parsed = parsePhoneNumberFromString(withPlus);
  if (parsed && parsed.country) {
    return { country: parsed.country, national: parsed.nationalNumber };
  }
  return { country: fallback, national: raw.replace(/[^0-9]/g, '') };
}

export default function CountryCodeSelect({ value = DEFAULT_COUNTRY, onChange, disabled }) {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const names = useMemo(() => {
    try {
      return new Intl.DisplayNames([bn ? 'bn' : 'en'], { type: 'region' });
    } catch {
      return null;
    }
  }, [bn]);

  const countries = useMemo(() => {
    const list = getCountries().map((c) => ({
      code: c,
      name: names?.of(c) || c,
      dial: callingCode(c),
    }));
    list.sort((a, b) => a.name.localeCompare(b.name, bn ? 'bn' : 'en'));
    return list;
  }, [names, bn]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dial.includes(q.replace('+', '')),
    );
  }, [countries, search]);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setSearch(''); setOpen(true); }}
        className="flex items-center gap-1.5 px-3 h-full border-r border-gray-200 dark:border-slate-600 shrink-0 active:opacity-70 disabled:opacity-60"
      >
        <span className="text-lg leading-none">{flagEmoji(value)}</span>
        <span className="text-sm font-semibold text-gray-800 dark:text-slate-100">{callingCode(value)}</span>
        {!disabled && <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle className="text-base">{bn ? 'দেশ নির্বাচন করুন' : 'Select country'}</DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={bn ? 'দেশ বা কোড খুঁজুন' : 'Search country or code'}
                className="pl-9 h-11 rounded-xl"
              />
            </div>
          </div>
          <div className="max-h-[55vh] overflow-y-auto pb-2">
            {filtered.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => { onChange?.(c.code); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left active:opacity-70 ${c.code === value ? 'bg-emerald-50 dark:bg-slate-700/50' : ''}`}
              >
                <span className="text-xl leading-none">{flagEmoji(c.code)}</span>
                <span className="flex-1 text-sm text-gray-800 dark:text-slate-100">{c.name}</span>
                <span className="text-sm font-semibold text-gray-500 dark:text-slate-300">{c.dial}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-gray-400">
                {bn ? 'কোনো দেশ পাওয়া যায়নি' : 'No country found'}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
