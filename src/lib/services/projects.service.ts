import { createAdminClient } from '@/lib/supabase/admin';
import { PM_TABLES } from '@/lib/db-tables';
import { Project } from '@/lib/types';
import { CreateProjectInput, UpdateProjectInput } from '@/lib/validation';

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

export async function createProject(
  userId: string,
  input: CreateProjectInput
): Promise<Project> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from(PM_TABLES.PROJECTS)
    .insert({
      user_id: userId,
      name: input.name,
      description: input.description || null,
      color: input.color || '#3B82F6',
      icon: input.icon || 'Folder',
      status: input.status || 'ACTIVE',
      category_id: input.category_id || null,
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

  const { data, error } = await admin
    .from(PM_TABLES.PROJECTS)
    .update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.icon !== undefined && { icon: input.icon }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.category_id !== undefined && { category_id: input.category_id }),
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
