import React, { useState, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, format as fnsFormat } from 'date-fns';
import { useLanguage } from '../LanguageContext';

// ─── Calendar Popup (dark, matches screenshot) ────────────────────────────────
function CalendarModal({ date, onSet, onCancel }) {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const today = new Date();
  const initDate = date ? new Date(date + 'T00:00:00') : today;
  const [calMonth, setCalMonth] = useState(new Date(initDate.getFullYear(), initDate.getMonth(), 1));
  const [selected, setSelected] = useState(date || fnsFormat(today, 'yyyy-MM-dd'));

  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const selDate = selected ? new Date(selected + 'T00:00:00') : null;
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const formatHeader = () => {
    if (!selDate) return '';
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[selDate.getDay()]}, ${months[selDate.getMonth()]} ${selDate.getDate()}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onCancel}>
      <div className="rounded-2xl overflow-hidden w-full max-w-xs" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-[#2d2d2d] px-5 pt-4 pb-3">
          <p className="text-gray-400 text-sm font-medium">{year}</p>
          <p className="text-white text-3xl font-bold mt-0.5">{formatHeader()}</p>
        </div>

        {/* Calendar body */}
        <div className="bg-[#1e1e1e] px-4 pt-3 pb-1">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setCalMonth(m => addMonths(m, -1))} className="w-8 h-8 flex items-center justify-center rounded-full active:opacity-60">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <span className="text-white text-sm font-semibold">{fnsFormat(calMonth, 'MMMM yyyy')}</span>
            <button onClick={() => setCalMonth(m => addMonths(m, 1))} className="w-8 h-8 flex items-center justify-center rounded-full active:opacity-60">
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 mb-1">
            {dayNames.map((d, i) => (
              <div key={i} className="text-center text-xs text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7">
            {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
            {Array(daysInMonth).fill(null).map((_, i) => {
              const day = i + 1;
              const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSel = dStr === selected;
              const isTod = dStr === fnsFormat(today, 'yyyy-MM-dd');
              return (
                <button
                  key={day}
                  onClick={() => setSelected(dStr)}
                  className={`h-9 w-full flex items-center justify-center text-sm font-medium rounded-full transition-all active:opacity-70
                    ${isSel ? 'bg-white text-black' : isTod ? 'text-white ring-1 ring-white rounded-full' : 'text-white'}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-[#1e1e1e] flex justify-end gap-2 px-4 py-3">
          <button
            onClick={() => { setSelected(''); }}
            className="text-gray-300 font-semibold text-sm px-3 py-2 tracking-wide uppercase"
          >
            CLEAR
          </button>
          <button onClick={onCancel} className="text-gray-300 font-semibold text-sm px-3 py-2 tracking-wide uppercase">
            CANCEL
          </button>
          <button
            onClick={() => onSet(selected)}
            className="text-white font-bold text-sm px-3 py-2 tracking-wide uppercase"
          >
            SET
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Clock Picker (dark, same size as calendar) ───────────────────────────────
function ClockModal({ time, onConfirm, onCancel }) {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const parseTime = (t) => {
    const [hh, mm] = (t || '00:00').split(':').map(Number);
    return { h: hh, m: mm };
  };

  const { h: initH, m: initM } = parseTime(time);
  const [step, setStep] = useState('hour');
  const [hour, setHour] = useState(initH);
  const [minute, setMinute] = useState(initM);
  const [isPM, setIsPM] = useState(initH >= 12);
  const clockRef = useRef(null);

  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const pad = n => String(n).padStart(2, '0');

  const getAngleDeg = () => {
    if (step === 'hour') return (hour12 / 12) * 360;
    return (minute / 60) * 360;
  };

  const angleFromTouch = (clientX, clientY) => {
    if (!clockRef.current) return 0;
    const rect = clockRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let angle = Math.atan2(clientX - cx, -(clientY - cy)) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    return angle;
  };

  const handleClockClick = (e) => {
    const angle = angleFromTouch(e.clientX, e.clientY);
    if (step === 'hour') {
      let h = Math.round(angle / 30) % 12;
      if (h === 0) h = 12;
      setHour(isPM ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h));
      setTimeout(() => setStep('minute'), 150);
    } else {
      setMinute(Math.round(angle / 6) % 60);
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const angle = angleFromTouch(e.touches[0].clientX, e.touches[0].clientY);
    if (step === 'hour') {
      let h = Math.round(angle / 30) % 12;
      if (h === 0) h = 12;
      setHour(isPM ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h));
    } else {
      setMinute(Math.round(angle / 6) % 60);
    }
  };

  const handleTouchEnd = () => {
    if (step === 'hour') setStep('minute');
  };

  const toggleAMPM = (pm) => {
    setIsPM(pm);
    setHour(h => {
      if (pm && h < 12) return h + 12;
      if (!pm && h >= 12) return h - 12;
      return h;
    });
  };

  const angleDeg = getAngleDeg();
  const rad = (angleDeg - 90) * (Math.PI / 180);
  const R = 80; // hand radius in svg coords (svg is 200x200, center 100,100)
  const handX = 100 + R * Math.cos(rad);
  const handY = 100 + R * Math.sin(rad);

  const hourNums = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minNums  = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const nums = step === 'hour' ? hourNums : minNums;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onCancel}>
      <div className="rounded-2xl overflow-hidden w-full max-w-xs" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-[#2d2d2d] px-5 py-4 flex items-end gap-1 justify-center">
          <button
            onClick={() => setStep('hour')}
            className={`text-5xl font-bold transition-opacity ${step === 'hour' ? 'text-white' : 'text-gray-500'}`}
          >
            {pad(hour12)}
          </button>
          <span className="text-5xl font-bold text-white mb-0.5">:</span>
          <button
            onClick={() => setStep('minute')}
            className={`text-5xl font-bold transition-opacity ${step === 'minute' ? 'text-white' : 'text-gray-500'}`}
          >
            {pad(minute)}
          </button>
          <div className="flex flex-col ml-2 mb-1">
            <button onClick={() => toggleAMPM(false)} className={`text-sm font-bold leading-5 ${!isPM ? 'text-white' : 'text-gray-500'}`}>AM</button>
            <button onClick={() => toggleAMPM(true)}  className={`text-sm font-bold leading-5 ${isPM  ? 'text-white' : 'text-gray-500'}`}>PM</button>
          </div>
        </div>

        {/* Clock */}
        <div className="bg-[#1e1e1e] flex justify-center py-4">
          <div
            ref={clockRef}
            onClick={handleClockClick}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative rounded-full bg-[#2a2a2a]"
            style={{ width: 232, height: 232, touchAction: 'none' }}
          >
            <svg width="232" height="232" className="absolute inset-0">
              <line x1="116" y1="116" x2={116 + (R+14)*Math.cos(rad)} y2={116 + (R+14)*Math.sin(rad)} stroke="#fff" strokeWidth="2" />
              <circle cx="116" cy="116" r="4" fill="#fff" />
              <circle cx={116 + (R+14)*Math.cos(rad)} cy={116 + (R+14)*Math.sin(rad)} r="20" fill="#fff" />
            </svg>
            {nums.map((num, i) => {
              const a = ((i / 12) * 360 - 90) * (Math.PI / 180);
              const nr = 88;
              const nx = 116 + nr * Math.cos(a);
              const ny = 116 + nr * Math.sin(a);
              const isSel = step === 'hour' ? hour12 === num : minute === num;
              return (
                <div
                  key={num}
                  className={`absolute flex items-center justify-center w-9 h-9 rounded-full text-sm font-medium select-none pointer-events-none
                    ${isSel ? 'text-black' : 'text-white'}`}
                  style={{ left: nx - 18, top: ny - 18 }}
                >
                  {num}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-[#1e1e1e] flex justify-end gap-2 px-4 py-3">
          <button onClick={onCancel} className="text-gray-300 font-semibold text-sm px-3 py-2 tracking-wide uppercase">
            {bn ? 'বাতিল করুন' : 'CANCEL'}
          </button>
          <button
            onClick={() => onConfirm(`${pad(hour)}:${pad(minute)}`)}
            className="text-white font-bold text-sm px-3 py-2 tracking-wide uppercase"
          >
            {bn ? 'ঠিক আছে' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main DateTimePicker ───────────────────────────────────────────────────────
export default function DateTimePicker({ date, time, onDateChange, onTimeChange }) {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [showCal, setShowCal] = useState(false);
  const [showClock, setShowClock] = useState(false);

  const handleCalSet = (d) => {
    onDateChange(d);
    setShowCal(false);
    setShowClock(true);
  };

  const handleTimeConfirm = (t) => {
    onTimeChange(t);
    setShowClock(false);
  };

  const formatDisplay = (dateStr, timeStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const months = bn
      ? ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mn = months[parseInt(m, 10) - 1] || m;
    let td = '';
    if (timeStr) {
      const [hh, mm] = timeStr.split(':');
      const h = parseInt(hh, 10);
      const suffix = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      td = ` • ${h12}:${mm} ${suffix}`;
    }
    return `${d} ${mn} ${y}${td}`;
  };

  return (
    <>
      <div>
        <Label className="text-sm text-gray-600">{bn ? 'তারিখ ও সময়' : 'Date & Time'}</Label>
        <button
          type="button"
          onClick={() => setShowCal(true)}
          className="mt-1 w-full h-12 rounded-xl border border-input bg-transparent px-3 flex items-center justify-between text-sm active:opacity-70"
        >
          <span className="text-gray-700 dark:text-slate-200">
            {formatDisplay(date, time) || (bn ? 'তারিখ বেছে নিন' : 'Pick a date')}
          </span>
          <Clock className="w-4 h-4 text-gray-400 shrink-0" />
        </button>
      </div>

      {showCal && (
        <CalendarModal
          date={date}
          onSet={handleCalSet}
          onCancel={() => setShowCal(false)}
        />
      )}

      {showClock && (
        <ClockModal
          time={time}
          onConfirm={handleTimeConfirm}
          onCancel={() => setShowClock(false)}
        />
      )}
    </>
  );
}