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
    let existing = siblings.find(c => !c.is_archived && normalized(c.name) === normalized(name));
    if (!existing && !parent) {
      if (/^(development\s*&\s*projects?|projects?)$/i.test(name.trim())) {
        existing = roots.find(c => !c.is_archived && /development\s*&\s*projects?/i.test(c.name));
      } else if (/^(personal|personal\s*&\s*life\s*admin)$/i.test(name.trim())) {
        existing = roots.find(c => !c.is_archived && /personal(\s*&\s*life\s*admin)?/i.test(c.name));
      }
    }
    if (existing) return existing;
    const resolvedName = (!parent && /^(projects?|development\s*&\s*projects?)$/i.test(name.trim()))
      ? 'Development & Projects'
      : name.trim();
    const created = await categories.createCategory(userId, {
      name: resolvedName, parent_id: parent?.id || null, sort_order: 0,
    });
    siblings.push(created);
    return created;
  };

  const defaultRoot = input.projectName ? 'Development & Projects' : 'Personal & Life Admin';
  const root = await ensure(input.categoryName?.trim() || defaultRoot);
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
