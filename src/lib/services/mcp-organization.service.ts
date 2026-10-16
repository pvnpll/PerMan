import * as categories from './categories.service';
import * as projects from './projects.service';
import type { Task } from '@/lib/types';
import type { UpdateTaskInput } from '@/lib/validation';

export type OrganizationUpdate = Pick<UpdateTaskInput, 'category_id' | 'subcategory_id' | 'project_id'> & {
  category_name?: string;
  subcategory_name?: string | null;
  project_name?: string | null;
};

/** Resolve only supplied organization fields, using the authenticated user's records. */
export async function resolveTaskOrganizationUpdate(userId: string, task: Task, input: OrganizationUpdate) {
  if (!['category_id', 'subcategory_id', 'project_id', 'category_name', 'subcategory_name', 'project_name']
    .some(key => input[key as keyof OrganizationUpdate] !== undefined)) return {};
  for (const field of ['category', 'subcategory', 'project'] as const) {
    if (input[`${field}_name`] !== undefined && input[`${field}_id`] !== undefined) {
      throw new Error(`Use either ${field}_name or ${field}_id, not both`);
    }
  }
  const roots = await categories.getCategories(userId);
  const all = roots.flatMap(c => [c, ...(c.subcategories || [])]);
  const owned = (id: string) => {
    const category = all.find(c => c.id === id);
    if (!category) throw new Error('Category not found or access denied');
    return category;
  };
  const ensure = async (name: string, parentId: string | null) => {
    const found = all.find(c => !c.is_archived && c.parent_id === parentId && c.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (found) return found;
    const created = await categories.createCategory(userId, { name: name.trim(), parent_id: parentId, sort_order: 0 });
    all.push(created);
    return created;
  };
  let categoryId = input.category_id !== undefined ? input.category_id : task.category_id;
  let subcategoryId = input.subcategory_id !== undefined ? input.subcategory_id : task.subcategory_id;
  let projectId = input.project_id !== undefined ? input.project_id : task.project_id;
  if (input.category_id) {
    if (owned(input.category_id).parent_id) throw new Error('category_id must be a root category');
  }
  // Validate all supplied IDs before creating any records.
  const suppliedChild = input.subcategory_id ? owned(input.subcategory_id) : null;
  if (input.project_id && !await projects.getProjectById(userId, input.project_id)) throw new Error('Project not found or access denied');
  if (input.category_name) categoryId = (await ensure(input.category_name, null)).id;
  const rootChanged = categoryId !== task.category_id;
  if (rootChanged && input.subcategory_id === undefined && input.subcategory_name === undefined) subcategoryId = null;
  if (suppliedChild) {
    if (!suppliedChild.parent_id) throw new Error('subcategory_id must identify a subcategory');
    if (input.category_id === undefined && input.category_name === undefined) categoryId = suppliedChild.parent_id;
    else if (suppliedChild.parent_id !== categoryId) throw new Error('Subcategory does not belong to the selected category');
  }
  if (input.subcategory_name !== undefined) {
    if (input.subcategory_name === null) subcategoryId = null;
    else {
      if (!categoryId) throw new Error('Choose a category before assigning a subcategory');
      subcategoryId = (await ensure(input.subcategory_name, categoryId)).id;
    }
  }
  if (input.project_name !== undefined) {
    if (input.project_name === null) projectId = null;
    else {
      const existing = (await projects.getProjects(userId)).find(p => p.name.trim().toLowerCase() === input.project_name!.trim().toLowerCase());
      if (!categoryId) categoryId = (await ensure('Projects', null)).id;
      if (input.subcategory_name === undefined && input.subcategory_id === undefined) subcategoryId = (await ensure(input.project_name, categoryId)).id;
      projectId = existing?.id || (await projects.createProject(userId, { name: input.project_name, category_id: subcategoryId || categoryId, status: 'ACTIVE' })).id;
    }
  }
  // Keep an existing project unless the caller explicitly changes or clears it.
  return { category_id: categoryId, subcategory_id: subcategoryId, project_id: projectId };
}
