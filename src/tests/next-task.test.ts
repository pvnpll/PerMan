import { describe, expect, it } from 'vitest';
import { rankNextTasks } from '../lib/next-task';
import type { Task } from '../lib/types';

const now = Date.parse('2026-11-09T10:00:00Z');
const task = (id: string, changes: Partial<Task> = {}) => ({ id, title: id, status: 'NEXT', priority: 'MEDIUM', created_at: '2026-11-01T00:00:00Z', ...changes } as Task);
describe('next task recommendations', () => {
  it('excludes blocked, finished, archived and future scheduled work', () => {
    const tasks = [task('next'), task('waiting', { status: 'WAITING' }), task('done', { status: 'DONE' }), task('cancelled', { status: 'CANCELLED' }), task('archived', { archived_at: '2026-11-01' }), task('future', { status: 'SCHEDULED', due_date: '2026-11-10T10:00:00Z' })];
    expect(rankNextTasks(tasks, 25, 'LOW', {}, now).map(t => t.id)).toEqual(['next']);
  });
  it('respects known duration and effort without inventing unknown estimates', () => {
    const tasks = [task('long'), task('hard'), task('fit'), task('unknown')];
    expect(rankNextTasks(tasks, 25, 'LOW', { long: { minutes: 60 }, hard: { energy: 'HIGH' }, fit: { minutes: 15, energy: 'LOW' } }, now).map(t => t.id)).toEqual(['fit', 'unknown']);
  });
  it('prioritizes overdue commitments and does not mutate input', () => {
    const tasks = [task('urgent', { priority: 'URGENT' }), task('overdue', { priority: 'LOW', due_date: '2026-11-08T10:00:00Z' })];
    expect(rankNextTasks(tasks, 25, 'MEDIUM', {}, now)[0].id).toBe('overdue');
    expect(tasks[0].id).toBe('urgent');
  });
});
