import type { Category, Task } from './types';

export interface MemoryGroup { id: string; name: string; tasks: Task[]; children: MemoryGroup[] }

/** Include uncategorized tasks and project-only tasks without duplicating them. */
export function buildMemoryGroups(categories: Category[], tasks: Task[]): MemoryGroup[] {
  const roots: MemoryGroup[] = categories.filter(c => !c.is_archived).map(c => ({
    id: c.id, name: c.name, tasks: [],
    children: (c.subcategories || []).filter(s => !s.is_archived).map(s => ({ id: s.id, name: s.name, tasks: [], children: [] })),
  }));
  for (const task of tasks) {
    let root = roots.find(r => r.id === task.category_id || r.children.some(c => c.id === task.category_id || c.id === task.subcategory_id));
    if (!root) {
      const id = task.project_id ? 'project-tasks' : 'uncategorized';
      root = roots.find(r => r.id === id);
      if (!root) {
        root = { id, name: task.project_id ? 'Projects' : 'Uncategorized', tasks: [], children: [] };
        roots.push(root);
      }
    }
    root.tasks.push(task);
    let child = root.children.find(c => c.id === task.subcategory_id || c.id === task.category_id);
    if (!child && task.project_id) {
      const id = `project:${task.project_id}`;
      child = root.children.find(c => c.id === id);
      if (!child) {
        child = { id, name: task.project?.name || 'Project', tasks: [], children: [] };
        root.children.push(child);
      }
    }
    child?.tasks.push(task);
  }
  return roots.filter(r => r.tasks.length > 0);
}
