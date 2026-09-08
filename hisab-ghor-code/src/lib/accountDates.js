const DAY_MS = 24 * 60 * 60 * 1000;

function asDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function endOfLocalDay(value) {
  const date = asDate(value) ?? new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

export function localCalendarDaysLeft(endValue, nowValue = new Date()) {
  const end = asDate(endValue);
  const now = asDate(nowValue) ?? new Date();
  if (!end) return null;
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return -1;
  return Math.max(0, Math.ceil(diff / DAY_MS) - 1);
}

export function isLocalDayExpired(endValue, nowValue = new Date()) {
  const end = asDate(endValue);
  const now = asDate(nowValue) ?? new Date();
  if (!end) return false;
  return now.getTime() > end.getTime();
}

export function addLocalDaysToDateIso(value, days) {
  const date = endOfLocalDay(value);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function endOfLocalDayAfterIso(days, fromValue = new Date()) {
  return addLocalDaysToDateIso(fromValue, days);
}
