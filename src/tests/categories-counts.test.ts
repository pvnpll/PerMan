import { describe, it, expect } from 'vitest';
import { computeCategoryTaskCounts } from '@/lib/services/categories.service';
import { Category } from '@/lib/types';

describe('computeCategoryTaskCounts (PM-199 counting contract)', () => {
  const rootWork: Category = {
    id: 'root-work',
    user_id: 'user-1',
    name: 'Work',
    slug: 'work',
    parent_id: null,
    icon: 'Briefcase',
    color: '#3B82F6',
    sort_order: 1,
    is_archived: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const subProjectA: Category = {
    id: 'sub-a',
    user_id: 'user-1',
    name: 'Project A',
    slug: 'project-a',
    parent_id: 'root-work',
    icon: null,
    color: '#3B82F6',
    sort_order: 1,
    is_archived: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const subProjectB: Category = {
    id: 'sub-b',
    user_id: 'user-1',
    name: 'Project B',
    slug: 'project-b',
    parent_id: 'root-work',
    icon: null,
    color: '#3B82F6',
    sort_order: 2,
    is_archived: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const rootPersonal: Category = {
    id: 'root-personal',
    user_id: 'user-1',
    name: 'Personal',
    slug: 'personal',
    parent_id: null,
    icon: 'User',
    color: '#10B981',
    sort_order: 2,
    is_archived: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  it('returns zero counts for all categories when there are no tasks', () => {
    const result = computeCategoryTaskCounts(
      [rootWork, subProjectA, subProjectB, rootPersonal],
      []
    );

    expect(result).toHaveLength(2);
    const work = result.find((c) => c.id === 'root-work')!;
    expect(work.counts).toEqual({ active: 0, completed: 0, total: 0 });
    expect(work.subcategories?.[0].counts).toEqual({ active: 0, completed: 0, total: 0 });
    expect(work.subcategories?.[1].counts).toEqual({ active: 0, completed: 0, total: 0 });

    const personal = result.find((c) => c.id === 'root-personal')!;
    expect(personal.counts).toEqual({ active: 0, completed: 0, total: 0 });
  });

  it('deduplicates parent count when task has both category_id and subcategory_id', () => {
    const tasks = [
      {
        id: 'task-1',
        category_id: 'root-work',
        subcategory_id: 'sub-a',
        status: 'NEXT',
      },
    ];

    const result = computeCategoryTaskCounts([rootWork, subProjectA], tasks);
    const work = result.find((c) => c.id === 'root-work')!;
    const projectA = work.subcategories?.find((c) => c.id === 'sub-a')!;

    // Counted once in child
    expect(projectA.counts).toEqual({ active: 1, completed: 0, total: 1 });
    // Deduplicated: counted once in parent, NOT twice
    expect(work.counts).toEqual({ active: 1, completed: 0, total: 1 });
  });

  it('aggregates multiple subcategories and direct parent tasks correctly', () => {
    const tasks = [
      // Direct root task (INBOX -> active)
      { id: 't1', category_id: 'root-work', subcategory_id: null, status: 'INBOX' },
      // Sub-A task (SCHEDULED -> active)
      { id: 't2', category_id: null, subcategory_id: 'sub-a', status: 'SCHEDULED' },
      // Sub-A task (DONE -> completed)
      { id: 't3', category_id: 'root-work', subcategory_id: 'sub-a', status: 'DONE' },
      // Sub-B task (WAITING -> active)
      { id: 't4', category_id: null, subcategory_id: 'sub-b', status: 'WAITING' },
      // Sub-B task (CANCELLED -> counted in total, not active/completed)
      { id: 't5', category_id: 'root-work', subcategory_id: 'sub-b', status: 'CANCELLED' },
      // Personal task (should not leak to Work)
      { id: 't6', category_id: 'root-personal', subcategory_id: null, status: 'NEXT' },
    ];

    const result = computeCategoryTaskCounts(
      [rootWork, subProjectA, subProjectB, rootPersonal],
      tasks
    );

    const work = result.find((c) => c.id === 'root-work')!;
    const subA = work.subcategories?.find((c) => c.id === 'sub-a')!;
    const subB = work.subcategories?.find((c) => c.id === 'sub-b')!;
    const personal = result.find((c) => c.id === 'root-personal')!;

    // Sub A: 1 SCHEDULED (active) + 1 DONE (completed) = total 2
    expect(subA.counts).toEqual({ active: 1, completed: 1, total: 2 });

    // Sub B: 1 WAITING (active) + 1 CANCELLED (in total only) = active 1, completed 0, total 2
    expect(subB.counts).toEqual({ active: 1, completed: 0, total: 2 });

    // Work Parent: t1(active), t2(active), t3(completed), t4(active), t5(cancelled)
    // Active = t1 + t2 + t4 = 3
    // Completed = t3 = 1
    // Total = t1 + t2 + t3 + t4 + t5 = 5 (notice 3 active + 1 completed != 5 total, due to cancelled)
    expect(work.counts).toEqual({ active: 3, completed: 1, total: 5 });

    // Personal Parent: t6(active)
    expect(personal.counts).toEqual({ active: 1, completed: 0, total: 1 });
  });
});
