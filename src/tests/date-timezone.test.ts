import { describe, it, expect } from 'vitest';
import {
  isValidTimezone,
  formatUserDate,
  isTaskOverdue,
  isTaskDueToday,
  formatShortDate,
} from '../lib/date';
import { addDays, subDays } from 'date-fns';

describe('Date & Timezone Handling', () => {
  it('validates IANA timezones accurately', () => {
    expect(isValidTimezone('Asia/Kolkata')).toBe(true);
    expect(isValidTimezone('America/New_York')).toBe(true);
    expect(isValidTimezone('UTC')).toBe(true);
    expect(isValidTimezone('Invalid/Timezone')).toBe(false);
    expect(isValidTimezone(null)).toBe(false);
  });

  it('formats dates according to target user timezone', () => {
    const iso = '2026-10-10T12:00:00Z';
    const formatted = formatUserDate(iso, 'Asia/Kolkata', 'yyyy-MM-dd HH:mm');
    // 12:00 UTC is 17:30 IST (+5:30)
    expect(formatted).toBe('2026-10-10 17:30');
  });

  it('correctly identifies overdue tasks', () => {
    const yesterday = subDays(new Date(), 1).toISOString();
    const tomorrow = addDays(new Date(), 1).toISOString();

    expect(isTaskOverdue(yesterday, 'Asia/Kolkata')).toBe(true);
    expect(isTaskOverdue(tomorrow, 'Asia/Kolkata')).toBe(false);
    expect(isTaskOverdue(null, 'Asia/Kolkata')).toBe(false);
  });

  it('correctly identifies tasks due today', () => {
    const now = new Date().toISOString();
    const nextWeek = addDays(new Date(), 7).toISOString();

    expect(isTaskDueToday(now, 'Asia/Kolkata')).toBe(true);
    expect(isTaskDueToday(nextWeek, 'Asia/Kolkata')).toBe(false);
  });
});
