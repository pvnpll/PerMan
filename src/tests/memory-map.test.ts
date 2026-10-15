import { describe, expect, it } from 'vitest';
import { buildMemoryGroups } from '@/lib/memory-map';
import type { Category, Task } from '@/lib/types';

const task = (id: string, fields: Partial<Task> = {}) => ({ id, title: id, ...fields }) as Task;
const categories = [{ id: 'projects', name: 'Projects', subcategories: [{ id: 'app', name: 'My App' }] }] as Category[];

describe('memory map hierarchy', () => {
  it('places project tasks in their existing subcategory without duplication', () => {
    const groups = buildMemoryGroups(categories, [task('ticket', { category_id: 'projects', subcategory_id: 'app', project_id: 'project' })]);
    expect(groups).toHaveLength(1);
    expect(groups[0].tasks.map(t => t.id)).toEqual(['ticket']);
    expect(groups[0].children).toHaveLength(1);
    expect(groups[0].children[0].tasks.map(t => t.id)).toEqual(['ticket']);
  });
  it('retains uncategorized and project-only tasks', () => {
    const groups = buildMemoryGroups([], [task('personal'), task('ticket', { project_id: 'p', project: { name: 'My App' } as Task['project'] })]);
    expect(groups.map(g => g.name)).toEqual(['Uncategorized', 'Projects']);
    expect(groups[1].children[0].name).toBe('My App');
    expect(groups.flatMap(g => g.tasks)).toHaveLength(2);
  });
  it('handles tasks assigned directly to a subcategory', () => {
    const groups = buildMemoryGroups(categories, [task('ticket', { category_id: 'app' })]);
    expect(groups[0].id).toBe('projects');
    expect(groups[0].children[0].tasks).toHaveLength(1);
  });
  it('omits empty life areas and keeps tasks with missing category references', () => {
    const groups = buildMemoryGroups(categories, [task('legacy', { category_id: 'deleted' })]);
    expect(groups.map(g => g.name)).toEqual(['Uncategorized']);
  });
});
