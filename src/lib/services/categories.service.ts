import { createAdminClient } from '@/lib/supabase/admin';
import { PM_TABLES } from '@/lib/db-tables';
import { Category } from '@/lib/types';
import { CreateCategoryInput } from '@/lib/validation';

export async function getCategories(userId: string): Promise<Category[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from(PM_TABLES.CATEGORIES)
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  const all = (data || []) as Category[];
  const rootCategories: Category[] = all.filter((c) => !c.parent_id);

  // Nest subcategories
  return rootCategories.map((root) => ({
    ...root,
    subcategories: all.filter((c) => c.parent_id === root.id),
  }));
}

export async function createCategory(
  userId: string,
  input: CreateCategoryInput
): Promise<Category> {
  const admin = createAdminClient();
  const slug = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  const { data, error } = await admin
    .from(PM_TABLES.CATEGORIES)
    .insert({
      user_id: userId,
      name: input.name,
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

  // Tasks referencing this category will have category_id set to NULL automatically by db foreign key ON DELETE SET NULL.
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
  const { data } = await admin
    .from(PM_TABLES.CATEGORIES)
    .select('*')
    .eq('user_id', userId)
    .ilike('name', `%${name}%`)
    .limit(1)
    .maybeSingle();

  return (data as Category) || null;
}
