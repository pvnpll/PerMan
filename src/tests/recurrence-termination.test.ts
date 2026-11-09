import { describe, it, expect } from 'vitest';
import { calculateNextOccurrence } from '@/lib/services/tasks.service';
import { RecurrenceRuleSchema } from '@/lib/validation';

describe('Recurrence Termination & Validation (PM-202)', () => {
  describe('RecurrenceRuleSchema validation', () => {
    it('accepts valid recurrence rules', () => {
      const valid = {
        frequency: 'DAILY' as const,
        interval: 2,
        count: 5,
        end_date: '2026-12-31T23:59:59.000Z',
      };
      const parsed = RecurrenceRuleSchema.parse(valid);
      expect(parsed.interval).toBe(2);
      expect(parsed.count).toBe(5);
    });

    it('rejects invalid frequencies', () => {
      expect(() =>
        RecurrenceRuleSchema.parse({ frequency: 'HOURLY', interval: 1 })
      ).toThrow();
    });

    it('rejects negative or zero interval', () => {
      expect(() =>
        RecurrenceRuleSchema.parse({ frequency: 'DAILY', interval: 0 })
      ).toThrow();
      expect(() =>
        RecurrenceRuleSchema.parse({ frequency: 'DAILY', interval: -2 })
      ).toThrow();
    });

    it('rejects count less than 1', () => {
      expect(() =>
        RecurrenceRuleSchema.parse({ frequency: 'WEEKLY', count: 0 })
      ).toThrow();
    });
  });

  describe('calculateNextOccurrence termination', () => {
    it('advances occurrence count up to the limit', () => {
      const task = {
        due_date: '2026-11-10T10:00:00.000Z',
        timezone: 'Asia/Kolkata',
        recurrence_rule: {
          frequency: 'DAILY',
          interval: 1,
          count: 3,
          current_occurrence: 1,
        },
      };

      const firstNext = calculateNextOccurrence(task);
      expect(firstNext?.shouldCreate).toBe(true);
      expect(firstNext?.nextDueDate).toBe('2026-11-11T10:00:00.000Z');
      expect(firstNext?.nextRule.current_occurrence).toBe(2);

      // Second completion
      task.due_date = firstNext!.nextDueDate!;
      task.recurrence_rule = firstNext!.nextRule;

      const secondNext = calculateNextOccurrence(task);
      expect(secondNext?.shouldCreate).toBe(true);
      expect(secondNext?.nextDueDate).toBe('2026-11-12T10:00:00.000Z');
      expect(secondNext?.nextRule.current_occurrence).toBe(3);

      // Third completion reaches count limit (3)
      task.due_date = secondNext!.nextDueDate!;
      task.recurrence_rule = secondNext!.nextRule;

      const thirdNext = calculateNextOccurrence(task);
      expect(thirdNext?.shouldCreate).toBe(false);
      expect(thirdNext?.nextDueDate).toBeNull();
    });

    it('stops recurrence when next due date exceeds end_date', () => {
      const task = {
        due_date: '2026-11-20T10:00:00.000Z',
        timezone: 'Asia/Kolkata',
        recurrence_rule: {
          frequency: 'WEEKLY',
          interval: 1,
          end_date: '2026-11-25T00:00:00.000Z', // 5 days after Nov 20, but next weekly due date is Nov 27
        },
      };

      const result = calculateNextOccurrence(task);
      expect(result?.shouldCreate).toBe(false);
      expect(result?.nextDueDate).toBeNull();
    });

    it('allows recurrence when next due date is before end_date', () => {
      const task = {
        due_date: '2026-11-20T10:00:00.000Z',
        timezone: 'Asia/Kolkata',
        recurrence_rule: {
          frequency: 'DAILY',
          interval: 1,
          end_date: '2026-11-25T00:00:00.000Z',
        },
      };

      const result = calculateNextOccurrence(task);
      expect(result?.shouldCreate).toBe(true);
      expect(result?.nextDueDate).toBe('2026-11-21T10:00:00.000Z');
    });

    it('handles month-end transitions gracefully', () => {
      const task = {
        due_date: '2026-01-31T12:00:00.000Z',
        timezone: 'Asia/Kolkata',
        recurrence_rule: {
          frequency: 'MONTHLY',
          interval: 1,
        },
      };

      const result = calculateNextOccurrence(task);
      expect(result?.shouldCreate).toBe(true);
      // Jan 31 + 1 month in non-leap 2026 gives Feb 28
      expect(result?.nextDueDate?.startsWith('2026-02-28')).toBe(true);
    });

    it('preserves reminder time offset relative to new due date', () => {
      const task = {
        due_date: '2026-11-10T10:00:00.000Z',
        reminder_time: '2026-11-10T09:00:00.000Z', // 1 hour before
        timezone: 'Asia/Kolkata',
        recurrence_rule: {
          frequency: 'DAILY',
          interval: 1,
        },
      };

      const result = calculateNextOccurrence(task);
      expect(result?.shouldCreate).toBe(true);
      expect(result?.nextDueDate).toBe('2026-11-11T10:00:00.000Z');
      expect(result?.nextReminderDate).toBe('2026-11-11T09:00:00.000Z');
    });
  });
});
