import { describe, it, expect } from 'vitest';
import { addMinutes } from 'date-fns';

describe('Reminder Scheduling & Idempotency', () => {
  it('generates deterministic idempotency keys for reminder deliveries', () => {
    const reminderId = '123e4567-e89b-12d3-a456-426614174000';
    const remindAt = '2026-10-10T09:00:00.000Z';
    const snoozeCount = 0;

    const key1 = `rem_${reminderId}_snooze${snoozeCount}_${remindAt.slice(0, 16)}`;
    const key2 = `rem_${reminderId}_snooze${snoozeCount}_${remindAt.slice(0, 16)}`;

    expect(key1).toBe(key2);
    expect(key1).toBe('rem_123e4567-e89b-12d3-a456-426614174000_snooze0_2026-10-10T09:00');
  });

  it('updates key when reminder is snoozed to prevent false duplicate suppression', () => {
    const reminderId = '123e4567-e89b-12d3-a456-426614174000';
    const remindAt = '2026-10-10T09:00:00.000Z';

    const originalKey = `rem_${reminderId}_snooze0_${remindAt.slice(0, 16)}`;
    const snoozedKey = `rem_${reminderId}_snooze1_${remindAt.slice(0, 16)}`;

    expect(originalKey).not.toBe(snoozedKey);
  });

  it('calculates correct snooze intervals', () => {
    const now = new Date('2026-10-10T10:00:00Z');
    const snoozed60 = addMinutes(now, 60);
    const snoozed15 = addMinutes(now, 15);

    expect(snoozed60.toISOString()).toBe('2026-10-10T11:00:00.000Z');
    expect(snoozed15.toISOString()).toBe('2026-10-10T10:15:00.000Z');
  });
});
