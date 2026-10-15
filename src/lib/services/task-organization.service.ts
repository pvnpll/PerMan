import * as categories from './categories.service';
import * as projects from './projects.service';
import type { Category } from '@/lib/types';

const normalized = (name: string) => name.trim().toLocaleLowerCase();

/** Resolve names within the authenticated user's tree, never by partial match. */
export async function organizeTask(userId: string, input: {
  categoryName?: string;
  subcategoryName?: string;
  projectName?: string;
}) {
  const roots = await categories.getCategories(userId);
  const ensure = async (name: string, parent?: Category) => {
    const siblings = parent ? parent.subcategories || [] : roots;
    const existing = siblings.find(c => !c.is_archived && normalized(c.name) === normalized(name));
    if (existing) return existing;
    const created = await categories.createCategory(userId, {
      name: name.trim(), parent_id: parent?.id || null, sort_order: 0,
    });
    siblings.push(created);
    return created;
  };

  const root = await ensure(input.categoryName?.trim() || (input.projectName ? 'Projects' : 'Personal'));
  const childName = input.projectName?.trim() || input.subcategoryName?.trim();
  const child = childName ? await ensure(childName, root) : null;
  let projectId: string | null = null;
  if (input.projectName?.trim()) {
    const existing = (await projects.getProjects(userId)).find(p =>
      p.status === 'ACTIVE' && normalized(p.name) === normalized(input.projectName!)
    );
    const project = existing
      ? existing.category_id === child!.id ? existing
        : await projects.updateProject(userId, existing.id, { category_id: child!.id })
      : await projects.createProject(userId, {
        name: input.projectName.trim(), category_id: child!.id, status: 'ACTIVE',
      });
    projectId = project.id;
  }
  return { category_id: root.id, subcategory_id: child?.id || null, project_id: projectId };
}
