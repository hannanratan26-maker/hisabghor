import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isIframe = typeof window !== "undefined" && window.self !== window.top;

// Format entry: entryDate 'YYYY-MM-DD', entryTime 'HH:MM' (user selected), fallback to created_date
export function formatLocalDateTime(createdDate?: string | null, entryDate?: string | null, entryTime?: string | null) {
  if (!createdDate && !entryDate) return '';
  const pad = (n: number | string) => String(n).padStart(2, '0');

  let day, month, year, hours, minutes, ampm;

  // Date part
  if (entryDate && /^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
    [year, month, day] = entryDate.split('-');
  } else if (createdDate) {
    const normalized = /Z|[+-]\d{2}:\d{2}$/.test(createdDate) ? createdDate : createdDate + 'Z';
    const d = new Date(normalized);
    day = pad(d.getDate()); month = pad(d.getMonth() + 1); year = d.getFullYear();
  }

  // Time part
  if (entryTime && /^\d{2}:\d{2}$/.test(entryTime)) {
    const parts = entryTime.split(':').map(Number);
    let h = parts[0] ?? 0;
    const m = parts[1] ?? 0;
    ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    hours = pad(h); minutes = pad(m);
  } else if (createdDate) {
    const normalized = /Z|[+-]\d{2}:\d{2}$/.test(createdDate) ? createdDate : createdDate + 'Z';
    const d = new Date(normalized);
    let h = d.getHours();
    ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    hours = pad(h); minutes = pad(d.getMinutes());
  }

  return `${day}/${month}/${year}, ${hours}:${minutes} ${ampm}`;
}

// Get local time string 'HH:MM'
export function localTimeNow() {
  const d = new Date();
  const pad = (n: number | string) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}