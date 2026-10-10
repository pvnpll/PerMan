import { format, parseISO, isValid, addDays, startOfDay, endOfDay, isBefore, isAfter } from 'date-fns';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export function isValidTimezone(tz?: string | null): boolean {
  if (!tz) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function getUserNow(tz: string = DEFAULT_TIMEZONE): Date {
  const safeTz = isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE;
  return toZonedTime(new Date(), safeTz);
}

export function formatUserDate(date: string | Date | null | undefined, tz: string = DEFAULT_TIMEZONE, pattern: string = 'PPp'): string {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '';
  const safeTz = isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE;
  return formatInTimeZone(d, safeTz, pattern);
}

export function formatShortDate(date: string | Date | null | undefined, tz: string = DEFAULT_TIMEZONE): string {
  return formatUserDate(date, tz, 'MMM d, yyyy');
}

export function formatTimeOnly(date: string | Date | null | undefined, tz: string = DEFAULT_TIMEZONE): string {
  return formatUserDate(date, tz, 'h:mm a');
}

export function isTaskOverdue(dueDate: string | null | undefined, tz: string = DEFAULT_TIMEZONE): boolean {
  if (!dueDate) return false;
  const d = parseISO(dueDate);
  if (!isValid(d)) return false;
  return isBefore(d, new Date());
}

export function isTaskDueToday(dueDate: string | null | undefined, tz: string = DEFAULT_TIMEZONE): boolean {
  if (!dueDate) return false;
  const d = parseISO(dueDate);
  if (!isValid(d)) return false;
  const safeTz = isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE;

  const todayStr = formatInTimeZone(new Date(), safeTz, 'yyyy-MM-dd');
  const dueStr = formatInTimeZone(d, safeTz, 'yyyy-MM-dd');
  return todayStr === dueStr;
}

export function toIsoStringInTimezone(date: Date, tz: string = DEFAULT_TIMEZONE): string {
  const safeTz = isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE;
  return formatInTimeZone(date, safeTz, "yyyy-MM-dd'T'HH:mm:ssXXX");
}
