import { createAdminClient } from '@/lib/supabase/admin';
import { PM_TABLES } from '@/lib/db-tables';
import { Category, TaskCounts } from '@/lib/types';
import { CreateCategoryInput } from '@/lib/validation';

export function isProjectsCategoryAlias(name: string): boolean {
  return /^(projects?|development\s*(&|and)\s*projects?|dev\s*(&|and)\s*projects?)$/i.test(name.trim());
}

export async function getCanonicalDevelopmentCategory(userId: string, adminClient?: any): Promise<Category | null> {
  const admin = adminClient || createAdminClient();
  const { data } = await admin
    .from(PM_TABLES.CATEGORIES)
    .select('*')
    .eq('user_id', userId)
    .is('parent_id', null)
    .ilike('name', '%development%project%')
    .limit(1)
    .maybeSingle();

  return (data as Category) || null;
}

export function computeCategoryTaskCounts(
  categories: Category[],
  tasks: Array<{ id: string; category_id: string | null; subcategory_id: string | null; status: string }>
): Category[] {
  const subIdsByParent = new Map<string, Set<string>>();
  for (const cat of categories) {
    if (cat.parent_id) {
      if (!subIdsByParent.has(cat.parent_id)) {
        subIdsByParent.set(cat.parent_id, new Set());
      }
      subIdsByParent.get(cat.parent_id)!.add(cat.id);
    }
  }

  const countsMap = new Map<string, TaskCounts>();
  const activeStatuses = new Set(['INBOX', 'NEXT', 'SCHEDULED', 'WAITING']);

  for (const cat of categories) {
    const isRoot = !cat.parent_id;
    const subIds = isRoot ? subIdsByParent.get(cat.id) : undefined;
    const seenTaskIds = new Set<string>();

    let active = 0;
    let completed = 0;
    let total = 0;

    for (const t of tasks) {
      if (seenTaskIds.has(t.id)) continue;

      let matches = false;
      if (isRoot) {
        matches = t.category_id === cat.id || Boolean(t.subcategory_id && subIds?.has(t.subcategory_id));
      } else {
        matches = t.subcategory_id === cat.id;
      }

      if (matches) {
        seenTaskIds.add(t.id);
        total++;
        if (activeStatuses.has(t.status)) {
          active++;
        } else if (t.status === 'DONE') {
          completed++;
        }
      }
    }

    countsMap.set(cat.id, { active, completed, total });
  }

  const rootCategories = categories.filter((c) => !c.parent_id);

  return rootCategories.map((root) => ({
    ...root,
    counts: countsMap.get(root.id) || { active: 0, completed: 0, total: 0 },
    subcategories: categories
      .filter((c) => c.parent_id === root.id)
      .map((sub) => ({
        ...sub,
        counts: countsMap.get(sub.id) || { active: 0, completed: 0, total: 0 },
      })),
  }));
}

export async function getCategories(userId: string): Promise<Category[]> {
  const admin = createAdminClient();

  const [categoriesRes, tasksRes] = await Promise.all([
    admin
      .from(PM_TABLES.CATEGORIES)
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    admin
      .from(PM_TABLES.TASKS)
      .select('id, category_id, subcategory_id, status')
      .eq('user_id', userId)
      .is('archived_at', null),
  ]);

  if (categoriesRes.error) {
    console.error('Error fetching categories:', categoriesRes.error);
    throw new Error(`Failed to fetch categories: ${categoriesRes.error.message}`);
  }

  if (tasksRes.error) {
    console.error('Error fetching category task counts:', tasksRes.error);
    throw new Error(`Failed to fetch category task counts: ${tasksRes.error.message}`);
  }

  return computeCategoryTaskCounts(
    (categoriesRes.data || []) as Category[],
    (tasksRes.data || []) as Array<{ id: string; category_id: string | null; subcategory_id: string | null; status: string }>
  );
}

export async function createCategory(
  userId: string,
  input: CreateCategoryInput
): Promise<Category> {
  const admin = createAdminClient();
  const trimmedName = input.name.trim();

  // If attempting to create a root category with "Projects" or any alias of "Development & Projects",
  // enforce re-use of canonical "Development & Projects" to avoid duplicate root categories.
  if (!input.parent_id && isProjectsCategoryAlias(trimmedName)) {
    const existingDev = await getCanonicalDevelopmentCategory(userId);
    if (existingDev) {
      return existingDev;
    }
  }

  const finalName = (!input.parent_id && isProjectsCategoryAlias(trimmedName))
    ? 'Development & Projects'
    : trimmedName;

  const slug = finalName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  const { data, error } = await admin
    .from(PM_TABLES.CATEGORIES)
    .insert({
      user_id: userId,
      name: finalName,
      slug,
      parent_id: input.parent_id || null,
      icon: input.icon || null,
      color: input.color || null,
      sort_order: input.sort_order ?? 0,
      is_archived: false,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating category:', error);
    throw new Error(`Failed to create category: ${error.message}`);
  }

  return data as Category;
}

export async function updateCategory(
  userId: string,
  categoryId: string,
  input: Partial<CreateCategoryInput & { is_archived: boolean }>
): Promise<Category> {
  const admin = createAdminClient();

  const payload: any = {};
  if (input.name !== undefined) {
    payload.name = input.name;
    payload.slug = input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
  if (input.icon !== undefined) payload.icon = input.icon;
  if (input.color !== undefined) payload.color = input.color;
  if (input.sort_order !== undefined) payload.sort_order = input.sort_order;
  if (input.is_archived !== undefined) payload.is_archived = input.is_archived;

  const { data, error } = await admin
    .from(PM_TABLES.CATEGORIES)
    .update(payload)
    .eq('id', categoryId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating category:', error);
    throw new Error(`Failed to update category: ${error.message}`);
  }

  return data as Category;
}

export async function deleteCategory(userId: string, categoryId: string): Promise<boolean> {
  const admin = createAdminClient();

  // 1. Fetch the category being deleted to inspect hierarchy
  const { data: targetCat } = await admin
    .from(PM_TABLES.CATEGORIES)
    .select('*')
    .eq('id', categoryId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!targetCat) return true;

  if (!targetCat.parent_id) {
    // Root category: Find a safe fallback root category (preferably Development & Projects or Personal & Life Admin)
    const { data: fallbackCats } = await admin
      .from(PM_TABLES.CATEGORIES)
      .select('id, name')
      .eq('user_id', userId)
      .is('parent_id', null)
      .neq('id', categoryId);

    const devProjFallback = (fallbackCats || []).find(c => /development\s*&\s*projects?/i.test(c.name));
    const fallbackRoot = devProjFallback || fallbackCats?.[0];

    // Find any subcategories under this root category
    const { data: children } = await admin
      .from(PM_TABLES.CATEGORIES)
      .select('id')
      .eq('parent_id', categoryId)
      .eq('user_id', userId);

    const childIds = (children || []).map(c => c.id);
    const affectedCategoryIds = [categoryId, ...childIds];

    if (fallbackRoot) {
      // Reassign projects to fallback root
      await admin
        .from(PM_TABLES.PROJECTS)
        .update({ category_id: fallbackRoot.id })
        .eq('user_id', userId)
        .in('category_id', affectedCategoryIds);

      // Re-parent subcategories so they are not cascade-deleted
      if (childIds.length > 0) {
        await admin
          .from(PM_TABLES.CATEGORIES)
          .update({ parent_id: fallbackRoot.id })
          .eq('user_id', userId)
          .in('id', childIds);

        // Update tasks pointing to these subcategories
        await admin
          .from(PM_TABLES.TASKS)
          .update({ category_id: fallbackRoot.id })
          .eq('user_id', userId)
          .in('subcategory_id', childIds);
      }

      // Reassign remaining tasks pointing to this root category
      await admin
        .from(PM_TABLES.TASKS)
        .update({ category_id: fallbackRoot.id })
        .eq('user_id', userId)
        .eq('category_id', categoryId);
    }
  } else {
    // Subcategory: Safely preserve tasks and projects under the parent category
    await admin
      .from(PM_TABLES.TASKS)
      .update({ subcategory_id: null, category_id: targetCat.parent_id })
      .eq('user_id', userId)
      .eq('subcategory_id', categoryId);

    await admin
      .from(PM_TABLES.PROJECTS)
      .update({ category_id: targetCat.parent_id })
      .eq('user_id', userId)
      .eq('category_id', categoryId);
  }

  // Delete category from database
  const { error } = await admin
    .from(PM_TABLES.CATEGORIES)
    .delete()
    .eq('id', categoryId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting category:', error);
    throw new Error(`Failed to delete category: ${error.message}`);
  }

  return true;
}

export async function findCategoryByName(userId: string, name: string): Promise<Category | null> {
  const admin = createAdminClient();
  const trimmed = name.trim();

  if (isProjectsCategoryAlias(trimmed)) {
    const canonical = await getCanonicalDevelopmentCategory(userId);
    if (canonical) return canonical;
  }

  const { data } = await admin
    .from(PM_TABLES.CATEGORIES)
    .select('*')
    .eq('user_id', userId)
    .ilike('name', `%${trimmed}%`)
    .limit(1)
    .maybeSingle();

  return (data as Category) || null;
}
