import { createAdminClient } from '@/lib/supabase/admin';
import { PM_TABLES } from '@/lib/db-tables';
import { Project } from '@/lib/types';
import { CreateProjectInput, UpdateProjectInput } from '@/lib/validation';
import { getCanonicalDevelopmentCategory, isProjectsCategoryAlias } from './categories.service';

export async function getProjects(userId: string): Promise<Project[]> {
  const admin = createAdminClient();

  const { data: projects, error } = await admin
    .from(PM_TABLES.PROJECTS)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
    throw new Error(`Failed to fetch projects: ${error.message}`);
  }

  // Calculate task counts per project
  const { data: tasks } = await admin
    .from(PM_TABLES.TASKS)
    .select('id, project_id, status')
    .eq('user_id', userId)
    .is('archived_at', null);

  const taskMap = new Map<string, { total: number; completed: number }>();

  (tasks || []).forEach((t) => {
    if (t.project_id) {
      const current = taskMap.get(t.project_id) || { total: 0, completed: 0 };
      current.total += 1;
      if (t.status === 'DONE') current.completed += 1;
      taskMap.set(t.project_id, current);
    }
  });

  return (projects || []).map((p) => {
    const stats = taskMap.get(p.id) || { total: 0, completed: 0 };
    return {
      ...p,
      task_count: stats.total,
      completed_count: stats.completed,
    } as Project;
  });
}

export async function getProjectById(userId: string, projectId: string): Promise<Project | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from(PM_TABLES.PROJECTS)
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Project;
}

export async function resolveProjectCategory(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  requestedCategoryId?: string | null
): Promise<string> {
  let canonicalDev = await getCanonicalDevelopmentCategory(userId, admin);

  if (!canonicalDev) {
    const { data: newCat, error } = await admin
      .from(PM_TABLES.CATEGORIES)
      .insert({
        user_id: userId,
        name: 'Development & Projects',
        slug: 'development-projects',
        parent_id: null,
        icon: 'Code',
        color: '#3B82F6',
        sort_order: 10,
        is_archived: false,
      })
      .select('*')
      .single();

    if (!error && newCat) {
      canonicalDev = newCat as any;
    }
  }

  const canonicalId = canonicalDev?.id;
  if (!canonicalId) {
    throw new Error('Failed to resolve canonical Development & Projects category');
  }

  if (!requestedCategoryId || requestedCategoryId === canonicalId) {
    return canonicalId;
  }

  // Check if requested category is a valid subcategory of Development & Projects
  const { data: targetCat } = await admin
    .from(PM_TABLES.CATEGORIES)
    .select('id, parent_id, name')
    .eq('id', requestedCategoryId)
    .eq('user_id', userId)
    .maybeSingle();

  if (targetCat) {
    // If it's a subcategory under Development & Projects, preserve it
    if (targetCat.parent_id === canonicalId) {
      return targetCat.id;
    }
    // If it's a root category alias of Development & Projects
    if (!targetCat.parent_id && isProjectsCategoryAlias(targetCat.name)) {
      return canonicalId;
    }
  }

  // Any other category requested for a Project must default to Development & Projects
  return canonicalId;
}

export async function createProject(
  userId: string,
  input: CreateProjectInput
): Promise<Project> {
  const admin = createAdminClient();

  const categoryId = await resolveProjectCategory(admin, userId, input.category_id);

  const { data, error } = await admin
    .from(PM_TABLES.PROJECTS)
    .insert({
      user_id: userId,
      name: input.name,
      description: input.description || null,
      color: input.color || '#3B82F6',
      icon: input.icon || 'Folder',
      status: input.status || 'ACTIVE',
      category_id: categoryId,
      target_date: input.target_date || null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating project:', error);
    throw new Error(`Failed to create project: ${error.message}`);
  }

  return data as Project;
}

export async function updateProject(
  userId: string,
  projectId: string,
  input: UpdateProjectInput
): Promise<Project> {
  const admin = createAdminClient();

  let categoryId: string | undefined = undefined;
  if (input.category_id !== undefined) {
    categoryId = await resolveProjectCategory(admin, userId, input.category_id);
  }

  const { data, error } = await admin
    .from(PM_TABLES.PROJECTS)
    .update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.icon !== undefined && { icon: input.icon }),
      ...(input.status !== undefined && { status: input.status }),
      ...(categoryId !== undefined && { category_id: categoryId }),
      ...(input.target_date !== undefined && { target_date: input.target_date }),
    })
    .eq('id', projectId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating project:', error);
    throw new Error(`Failed to update project: ${error.message}`);
  }

  return data as Project;
}

export async function deleteProject(userId: string, projectId: string): Promise<boolean> {
  const admin = createAdminClient();

  const { error } = await admin
    .from(PM_TABLES.PROJECTS)
    .delete()
    .eq('id', projectId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting project:', error);
    throw new Error(`Failed to delete project: ${error.message}`);
  }

  return true;
}

export async function findProjectByName(userId: string, name: string): Promise<Project | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from(PM_TABLES.PROJECTS)
    .select('*')
    .eq('user_id', userId)
    .ilike('name', `%${name}%`)
    .limit(1)
    .maybeSingle();

  return (data as Project) || null;
}
