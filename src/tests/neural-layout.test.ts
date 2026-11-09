import { describe, expect, it } from 'vitest';
import type { Task } from '@/lib/types';
import { isNeuronLit, layoutNeurons, neuralConnections } from '@/lib/neural-layout';
import { buildMemoryGroups } from '@/lib/memory-map';

const task = (id: string, status: Task['status'] = 'NEXT', extra: Partial<Task> = {}) => ({ id, title: id, status, ...extra }) as Task;
describe('memory neuron state', () => {
  it('lights unfinished tasks and leaves completed/cancelled memories dark', () => {
    for (const status of ['NEXT', 'INBOX', 'WAITING', 'SCHEDULED'] as const) expect(isNeuronLit(task(status, status))).toBe(true);
    expect(isNeuronLit(task('done', 'DONE'))).toBe(false);
    expect(isNeuronLit(task('cancelled', 'CANCELLED'))).toBe(false);
    expect(isNeuronLit(task('archived', 'NEXT', { archived_at: '2026-11-09' }))).toBe(false);
  });
  it('keeps completed neurons in the same position after completion and input reorder', () => {
    const before = layoutNeurons([task('b'), task('a')]);
    const after = layoutNeurons([task('a', 'DONE'), task('b')]);
    expect(after.map(({ task, ...node }) => ({ id: task.id, ...node, lit: undefined }))).toEqual(before.map(({ task, ...node }) => ({ id: task.id, ...node, lit: undefined })));
    expect(after.find(node => node.task.id === 'a')?.lit).toBe(false);
  });
  it('deduplicates, omits archives, and places nodes inside both brain hemispheres', () => {
    const neurons = layoutNeurons([...Array.from({ length: 72 }, (_, i) => task(`task-${i}`)), task('task-0'), task('archived', 'DONE', { archived_at: '2026-11-09' })]);
    expect(neurons).toHaveLength(72);
    expect(neurons.some(node => node.x < 500)).toBe(true);
    expect(neurons.some(node => node.x > 500)).toBe(true);
    for (const { x, y } of neurons) { expect(x).toBeGreaterThan(210); expect(x).toBeLessThan(790); expect(y).toBeGreaterThan(100); expect(y).toBeLessThan(540); }
  });
  it('never lights a connection incident to a completed neuron', () => {
    const neurons = layoutNeurons(Array.from({ length: 30 }, (_, i) => task(`task-${i}`, i % 2 ? 'DONE' : 'NEXT')));
    const connections = neuralConnections(neurons);
    expect(connections.length).toBeGreaterThan(0);
    expect(connections.filter(edge => !edge.from.lit || !edge.to.lit).every(edge => !edge.lit)).toBe(true);
  });
  it('retains completed-only areas while excluding archived tasks', () => {
    const groups = buildMemoryGroups([], [task('complete', 'DONE'), task('archive', 'NEXT', { archived_at: '2026-11-09' })]);
    expect(groups).toHaveLength(1);
    expect(groups[0].tasks.map(t => t.id)).toEqual(['complete']);
  });
});
