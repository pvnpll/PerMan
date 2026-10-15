import { beforeEach, describe, expect, it, vi } from 'vitest';
import { organizeTask } from '@/lib/services/task-organization.service';
import * as categories from '@/lib/services/categories.service';
import * as projects from '@/lib/services/projects.service';
import type { Category, Project } from '@/lib/types';

vi.mock('@/lib/services/categories.service', () => ({ getCategories: vi.fn(), createCategory: vi.fn() }));
vi.mock('@/lib/services/projects.service', () => ({ getProjects: vi.fn(), createProject: vi.fn(), updateProject: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(categories.getCategories).mockResolvedValue([]);
  vi.mocked(projects.getProjects).mockResolvedValue([]);
  vi.mocked(categories.createCategory).mockImplementation(async (_user, input) => ({
    ...input, id: input.parent_id ? 'child' : 'root', subcategories: [],
    user_id: _user, slug: input.name.toLowerCase(), is_archived: false,
    parent_id: input.parent_id || null, icon: null, color: null,
    created_at: '2026-10-15T00:00:00Z', updated_at: '2026-10-15T00:00:00Z',
  }) as Category);
  vi.mocked(projects.createProject).mockResolvedValue({ id: 'project' } as Project);
});

describe('personal memory organization', () => {
  it('creates Projects → arbitrary project name and links the task to both', async () => {
    expect(await organizeTask('user', { projectName: 'New App' })).toEqual({
      category_id: 'root', subcategory_id: 'child', project_id: 'project',
    });
    expect(categories.createCategory).toHaveBeenNthCalledWith(1, 'user', expect.objectContaining({ name: 'Projects', parent_id: null }));
    expect(categories.createCategory).toHaveBeenNthCalledWith(2, 'user', expect.objectContaining({ name: 'New App', parent_id: 'root' }));
    expect(projects.createProject).toHaveBeenCalledWith('user', expect.objectContaining({ name: 'New App', category_id: 'child' }));
  });

  it('creates Personal → Health without a project', async () => {
    expect(await organizeTask('user', { subcategoryName: 'Health' })).toEqual({
      category_id: 'root', subcategory_id: 'child', project_id: null,
    });
    expect(categories.createCategory).toHaveBeenNthCalledWith(1, 'user', expect.objectContaining({ name: 'Personal' }));
    expect(projects.createProject).not.toHaveBeenCalled();
  });

  it('reuses exact names case-insensitively within the correct parent', async () => {
    vi.mocked(categories.getCategories).mockResolvedValue([
      { id: 'wrong', name: 'Personal', subcategories: [{ id: 'wrong-child', name: 'App' }] },
      { id: 'root', name: 'Projects', subcategories: [{ id: 'child', name: 'App' }] },
    ] as Category[]);
    vi.mocked(projects.getProjects).mockResolvedValue([{ id: 'project', name: 'App', category_id: 'child', status: 'ACTIVE' }] as Project[]);
    expect(await organizeTask('user', { projectName: ' app ' })).toEqual({
      category_id: 'root', subcategory_id: 'child', project_id: 'project',
    });
    expect(categories.createCategory).not.toHaveBeenCalled();
    expect(projects.createProject).not.toHaveBeenCalled();
  });

  it('does not confuse partial project names', async () => {
    vi.mocked(projects.getProjects).mockResolvedValue([{ id: 'other', name: 'App Pro', status: 'ACTIVE' }] as Project[]);
    await organizeTask('user', { projectName: 'App' });
    expect(projects.createProject).toHaveBeenCalled();
  });

  it('propagates storage failures instead of silently creating uncategorized tasks', async () => {
    vi.mocked(categories.getCategories).mockRejectedValue(new Error('Database unavailable'));
    await expect(organizeTask('user', {})).rejects.toThrow('Database unavailable');
  });
});
