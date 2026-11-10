import { describe, expect, it } from 'vitest';
import type { Task } from '@/lib/types';
import { isNeuronLit, layoutNeurons, neuralConnections, layoutSynapticWeb } from '@/lib/neural-layout';
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

 describe('synaptic hierarchy', () => {
  const groups = [{ id: 'work', name: 'Work', tasks: [task('a'), task('b', 'DONE')], children: [{ id: 'project', name: 'Project', tasks: [task('a')], children: [] }] }, { id: 'life', name: 'Life', tasks: [task('c', 'DONE')], children: [] }];
  it('connects every category, project and task to the PerMan core without duplicate tasks', () => {
    const { nodes, edges } = layoutSynapticWeb(groups, groups.flatMap(g => g.tasks));
    expect(nodes.filter(n => n.kind === 'core').map(n => n.id)).toEqual(['perman-core']);
    expect(edges.filter(e => e.from.id === 'perman-core')).toHaveLength(2);
    expect(nodes.filter(n => n.task).map(n => n.task!.id).sort()).toEqual(['a', 'b', 'c']);
    const reached = new Set(['perman-core']);
    for (let i = 0; i < nodes.length; i++) for (const edge of edges) if (reached.has(edge.from.id)) reached.add(edge.to.id);
    expect(reached.size).toBe(nodes.length);
    expect(edges.find(e => e.to.task?.id === 'b')?.from.kind).toBe('category');
  });
  it('aggregates light from descendants and retains all positions after completion', () => {
    const before = layoutSynapticWeb(groups, groups.flatMap(g => g.tasks));
    const completed = groups.map(g => ({ ...g, tasks: g.tasks.map(t => ({ ...t, status: 'DONE' as const })), children: g.children.map(c => ({ ...c, tasks: c.tasks.map(t => ({ ...t, status: 'DONE' as const })) })) }));
    const after = layoutSynapticWeb(completed, completed.flatMap(g => g.tasks));
    expect(before.nodes.find(n => n.kind === 'core')?.lit).toBe(true);
    expect(before.nodes.find(n => n.id === 'category:life')?.lit).toBe(false);
    expect(after.nodes.every(n => !n.lit)).toBe(true);
    expect(after.edges.every(e => !e.lit)).toBe(true);
    expect(after.nodes.map(n => [n.id, n.x, n.y])).toEqual(before.nodes.map(n => [n.id, n.x, n.y]));
  });
});
