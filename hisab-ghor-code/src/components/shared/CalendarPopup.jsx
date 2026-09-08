import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, format as fnsFormat } from 'date-fns';

export default function CalendarPopup({ open, onClose, from, to, onApply, language }) {
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today);
  const [tempFrom, setTempFrom] = useState(from || '');
  const [tempTo, setTempTo] = useState(to || '');
  const [selecting, setSelecting] = useState('from');

  useEffect(() => {
    if (!open) return;
    window.history.pushState({ calendarPopup: true }, '', window.location.href);
    const handler = () => onClose();
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [open]);

  // Close via UI (× button, overlay, confirm) — pop the history entry so back button stays in sync
  const handleClose = () => {
    window.history.back();
  };

  if (!open) return null;

  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handleDayClick = (day) => {
    const d = fnsFormat(new Date(year, month, day), 'yyyy-MM-dd');
    if (selecting === 'from') {
      setTempFrom(d);
      setTempTo('');
      setSelecting('to');
    } else {
      if (d < tempFrom) {
        setTempTo(tempFrom);
        setTempFrom(d);
      } else {
        setTempTo(d);
      }
      setSelecting('from');
    }
  };

  const isInRange = (day) => {
    if (!tempFrom || !tempTo) return false;
    const d = fnsFormat(new Date(year, month, day), 'yyyy-MM-dd');
    return d > tempFrom && d < tempTo;
  };

  const isStart = (day) => tempFrom === fnsFormat(new Date(year, month, day), 'yyyy-MM-dd');
  const isEnd = (day) => tempTo === fnsFormat(new Date(year, month, day), 'yyyy-MM-dd');
  const isToday = (day) => fnsFormat(new Date(year, month, day), 'yyyy-MM-dd') === fnsFormat(today, 'yyyy-MM-dd');

  const monthName = fnsFormat(calMonth, 'MMMM yyyy');
  const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const displayLabel = () => {
    if (tempFrom && tempTo) return `${fnsFormat(new Date(tempFrom), 'dd MMM yyyy')} - ${fnsFormat(new Date(tempTo), 'dd MMM yyyy')}`;
    if (tempFrom) return `${fnsFormat(new Date(tempFrom), 'dd MMM yyyy')} → ?`;
    return language === 'bn' ? 'তারিখ নির্বাচন করুন' : 'Select date range';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={handleClose}>
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm p-5 pb-6 relative" onClick={e => e.stopPropagation()}>
        <div className="bg-emerald-600 text-white rounded-2xl px-4 py-3 mb-4 flex items-center gap-2">
          <div className="w-6 shrink-0" />
          <p className="text-sm font-semibold flex-1 text-center">{displayLabel()}</p>
          <button onClick={handleClose} className="w-6 h-6 flex items-center justify-center rounded-full bg-white/25 active:opacity-60 shrink-0">
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>

        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCalMonth(m => addMonths(m, -1))} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-700 active:opacity-60">
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-slate-300" />
          </button>
          <span className="text-sm font-bold text-gray-800 dark:text-slate-100">{monthName}</span>
          <button onClick={() => setCalMonth(m => addMonths(m, 1))} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-700 active:opacity-60">
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-1 px-1">
          {days.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 px-1">
          {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
          {Array(daysInMonth).fill(null).map((_, i) => {
            const day = i + 1;
            const start = isStart(day);
            const end = isEnd(day);
            const inRange = isInRange(day);
            const tod = isToday(day);
            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                className={`h-9 w-full flex items-center justify-center text-sm font-medium transition-all
                  ${start || end ? 'bg-emerald-600 text-white rounded-full' : ''}
                  ${inRange ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : ''}
                  ${!start && !end && !inRange ? 'text-gray-700 dark:text-slate-200' : ''}
                  ${tod && !start && !end ? 'ring-2 ring-emerald-400 rounded-full' : ''}
                  active:opacity-60
                `}
              >
                {day}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3 mt-5">
          <Button variant="outline" className="flex-1 rounded-xl h-11"
            onClick={() => { setTempFrom(''); setTempTo(''); setSelecting('from'); }}>
            {language === 'bn' ? 'রিসেট' : 'Reset'}
          </Button>
          <Button className="flex-1 rounded-xl h-11 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => { onApply(tempFrom, tempTo); handleClose(); }}
            disabled={!tempFrom || !tempTo}>
            {language === 'bn' ? 'নিশ্চিত করুন' : 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  );
}