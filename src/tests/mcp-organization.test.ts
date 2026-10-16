import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveTaskOrganizationUpdate } from '../lib/services/mcp-organization.service';
import * as categories from '../lib/services/categories.service';
import * as projects from '../lib/services/projects.service';
import type { Task, Category } from '../lib/types';
vi.mock('../lib/services/categories.service', () => ({ getCategories: vi.fn(), createCategory: vi.fn() }));
vi.mock('../lib/services/projects.service', () => ({ getProjects: vi.fn(), getProjectById: vi.fn(), createProject: vi.fn() }));
const task = { category_id: 'personal', subcategory_id: 'health', project_id: null, status: 'NEXT', priority: 'MEDIUM' } as Task;
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(categories.getCategories).mockResolvedValue([
    { id: 'personal', parent_id: null, name: 'Personal', subcategories: [{ id: 'health', parent_id: 'personal', name: 'Health' }] },
    { id: 'shopping', parent_id: null, name: 'Shopping & Purchases', subcategories: [{ id: 'fitness', parent_id: 'shopping', name: 'Fitness & Nutrition' }] },
  ] as Category[]);
});
describe('MCP task organization', () => {
  it('assigns the requested hierarchy without altering task details', async () => {
    expect(await resolveTaskOrganizationUpdate('user', task, { category_name: 'Shopping & Purchases', subcategory_name: 'Fitness & Nutrition' }))
      .toEqual({ category_id: 'shopping', subcategory_id: 'fitness', project_id: null });
    expect(categories.createCategory).not.toHaveBeenCalled();
  });
  it('leaves organization untouched when omitted', async () => {
    expect(await resolveTaskOrganizationUpdate('user', task, {})).toEqual({});
    expect(categories.getCategories).not.toHaveBeenCalled();
  });
  it('clears the old child when moving to a different category', async () => {
    expect(await resolveTaskOrganizationUpdate('user', task, { category_id: 'shopping' })).toMatchObject({ category_id: 'shopping', subcategory_id: null });
  });
  it('infers parent from an owned child ID', async () => {
    expect(await resolveTaskOrganizationUpdate('user', task, { subcategory_id: 'fitness' })).toMatchObject({ category_id: 'shopping', subcategory_id: 'fitness' });
  });
  it('rejects other accounts references and mismatched hierarchies', async () => {
    await expect(resolveTaskOrganizationUpdate('user', task, { category_id: 'foreign' })).rejects.toThrow('access denied');
    await expect(resolveTaskOrganizationUpdate('user', task, { category_id: 'personal', subcategory_id: 'fitness' })).rejects.toThrow('does not belong');
    await expect(resolveTaskOrganizationUpdate('user', task, { project_id: 'foreign' })).rejects.toThrow('access denied');
  });
  it('supports explicitly clearing links', async () => {
    expect(await resolveTaskOrganizationUpdate('user', task, { category_id: null, subcategory_id: null, project_id: null })).toEqual({ category_id: null, subcategory_id: null, project_id: null });
  });
  it('preserves the root for subcategory-only name changes and creates missing names', async () => {
    vi.mocked(categories.createCategory).mockResolvedValue({ id: 'new' } as Category);
    expect(await resolveTaskOrganizationUpdate('user', task, { subcategory_name: 'Exercise' })).toMatchObject({ category_id: 'personal', subcategory_id: 'new' });
    expect(categories.createCategory).toHaveBeenCalledWith('user', { name: 'Exercise', parent_id: 'personal', sort_order: 0 });
  });
});
