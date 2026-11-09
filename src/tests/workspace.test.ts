import { describe, expect, it } from 'vitest';
import { captureLines, completionStreak, WorkspaceSchema } from '../lib/workspace';

describe('workspace capture', () => {
  it('normalizes checklist lines, removes duplicates and caps imports', () => {
    expect(captureLines('• Buy milk\n- Call Sam\n1. Book tickets\nBuy milk\n\n')).toEqual(['Buy milk', 'Call Sam', 'Book tickets']);
    expect(captureLines(Array.from({ length: 50 }, (_, i) => `Task ${i}`).join('\n'))).toHaveLength(30);
  });
  it('rejects oversized content, invalid effort and untrusted storage fields', () => {
    expect(WorkspaceSchema.safeParse({ kind: 'NOTE', title: 'Note', content: 'a'.repeat(30001) }).success).toBe(false);
    expect(WorkspaceSchema.safeParse({ kind: 'FIT', title: 'Fit', data: { minutes: -1 } }).success).toBe(false);
    const parsed = WorkspaceSchema.parse({ kind: 'NOTE', title: 'Note', user_id: 'other-user', image_path: 'other-user/private.png' });
    expect(parsed).not.toHaveProperty('user_id');
    expect(parsed).not.toHaveProperty('image_path');
  });
});
describe('completion streak', () => {
  const done = (completed_at: string) => ({ status: 'DONE', completed_at });
  it('counts each local day once and keeps yesterday’s streak before today is done', () => {
    const tasks = [done('2026-11-08T10:00:00Z'), done('2026-11-08T12:00:00Z'), done('2026-11-07T10:00:00Z')];
    expect(completionStreak(tasks, 'Asia/Kolkata', new Date('2026-11-09T10:00:00Z'))).toBe(2);
  });
  it('uses the user timezone at midnight and excludes reopened tasks', () => {
    expect(completionStreak([done('2026-11-08T20:00:00Z'), { status: 'NEXT', completed_at: '2026-11-08T10:00:00Z' }], 'Asia/Kolkata', new Date('2026-11-09T01:00:00Z'))).toBe(1);
  });
  it('survives a daylight-saving boundary and stops at gaps', () => {
    expect(completionStreak([done('2026-11-01T16:00:00Z'), done('2026-10-31T16:00:00Z'), done('2026-10-29T16:00:00Z')], 'America/New_York', new Date('2026-11-01T20:00:00Z'))).toBe(2);
  });
});
