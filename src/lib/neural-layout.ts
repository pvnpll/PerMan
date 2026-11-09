import type { Task } from './types';

export const NEURON_PAGE_SIZE = 180;
const COLORS = ['#e8c68b', '#77c6bb', '#b7a4d3', '#e5a68e', '#8daed0'];
export function isNeuronLit(task: Task): boolean {
  return !task.archived_at && task.status !== 'DONE' && task.status !== 'CANCELLED';
}
export function neuralHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return hash >>> 0;
}
export type Neuron = { task: Task; x: number; y: number; color: string; lit: boolean; seed: number };

/** Stable across status changes: completion switches light off without moving the memory. */
export function layoutNeurons(tasks: Task[]): Neuron[] {
  const placed: Neuron[] = [];
  const unique = [...new Map(tasks.filter(t => !t.archived_at).map(task => [task.id, task])).values()];
  for (const task of unique.sort((a, b) => a.id.localeCompare(b.id))) {
    const seed = neuralHash(task.id);
    let x = 0, y = 0;
    for (let attempt = 0; attempt < 48; attempt++) {
      const value = neuralHash(`${task.id}:${attempt}`);
      const side = seed % 2 ? 1 : -1;
      const angle = (value % 10000) / 10000 * Math.PI * 2;
      const radius = Math.sqrt(((value >>> 14) % 1000 + 20) / 1040);
      x = 500 + side * 156 + Math.cos(angle) * 126 * radius;
      y = 322 + Math.sin(angle) * 215 * radius;
      if (placed.every(node => Math.hypot(node.x - x, node.y - y) > 28) || attempt === 47) break;
    }
    placed.push({ task, x: +x.toFixed(2), y: +y.toFixed(2), seed, lit: isNeuronLit(task), color: COLORS[neuralHash(task.project_id || task.subcategory_id || task.category_id || 'personal') % COLORS.length] });
  }
  return placed;
}

export function neuralConnections(nodes: Neuron[]) {
  const edges: { from: Neuron; to: Neuron; path: string; lit: boolean }[] = [];
  const seen = new Set<string>();
  for (const from of nodes) {
    const nearest = nodes.filter(to => to !== from && Math.hypot(from.x - to.x, from.y - to.y) < 180)
      .sort((a, b) => Math.hypot(from.x - a.x, from.y - a.y) - Math.hypot(from.x - b.x, from.y - b.y)).slice(0, 2);
    for (const to of nearest) {
      const id = [from.task.id, to.task.id].sort().join(':');
      if (seen.has(id)) continue;
      seen.add(id);
      const bend = from.seed % 2 ? 16 : -16;
      const midX = (from.x + to.x) / 2 + bend;
      const midY = (from.y + to.y) / 2 - bend;
      edges.push({ from, to, path: `M${from.x},${from.y} Q${midX},${midY} ${to.x},${to.y}`, lit: from.lit && to.lit });
    }
  }
  return edges;
}

export function dendrites(node: Neuron): string[] {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * Math.PI * 2 + (node.seed % 30) / 30;
    const length = 18 + (neuralHash(`${node.task.id}:branch:${i}`) % 18);
    const mx = node.x + Math.cos(angle) * length * .58;
    const my = node.y + Math.sin(angle) * length * .58;
    const endX = node.x + Math.cos(angle + .17) * length;
    const endY = node.y + Math.sin(angle + .17) * length;
    const forkX = mx + Math.cos(angle - .7) * length * .48;
    const forkY = my + Math.sin(angle - .7) * length * .48;
    return `M${node.x},${node.y} Q${mx.toFixed(1)},${my.toFixed(1)} ${endX.toFixed(1)},${endY.toFixed(1)} M${mx.toFixed(1)},${my.toFixed(1)} L${forkX.toFixed(1)},${forkY.toFixed(1)}`;
  });
}
