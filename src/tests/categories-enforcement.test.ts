import { describe, expect, it, vi, beforeEach } from 'vitest';
import { isProjectsCategoryAlias, createCategory } from '../lib/services/categories.service';
import { resolveProjectCategory } from '../lib/services/projects.service';
import * as categoriesService from '../lib/services/categories.service';
import { createAdminClient } from '../lib/supabase/admin';
import { createPerManMcpServer } from '../lib/mcp/server';

vi.mock('../lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

describe('Category & Project Canonical Enforcement', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('isProjectsCategoryAlias', () => {
    it('matches project aliases case-insensitively', () => {
      expect(isProjectsCategoryAlias('Projects')).toBe(true);
      expect(isProjectsCategoryAlias('projects')).toBe(true);
      expect(isProjectsCategoryAlias('project')).toBe(true);
      expect(isProjectsCategoryAlias('Development & Projects')).toBe(true);
      expect(isProjectsCategoryAlias('development & projects')).toBe(true);
      expect(isProjectsCategoryAlias('development and projects')).toBe(true);
      expect(isProjectsCategoryAlias('dev & projects')).toBe(true);
      expect(isProjectsCategoryAlias('dev and projects')).toBe(true);
    });

    it('rejects unrelated category names', () => {
      expect(isProjectsCategoryAlias('Personal & Life Admin')).toBe(false);
      expect(isProjectsCategoryAlias('Health & Fitness')).toBe(false);
      expect(isProjectsCategoryAlias('Work')).toBe(false);
    });
  });

  describe('createCategory alias protection', () => {
    it('returns existing canonical Development & Projects category when "Projects" root is requested', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'canonical-dev-id',
          name: 'Development & Projects',
          parent_id: null,
          user_id: 'user-123',
        },
        error: null,
      });

      const mockQuery: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: mockSingle,
        insert: vi.fn(),
      };

      vi.mocked(createAdminClient).mockReturnValue({
        from: vi.fn().mockReturnValue(mockQuery),
      } as any);

      const result = await createCategory('user-123', {
        name: 'Projects',
        sort_order: 0,
      });

      expect(result.id).toBe('canonical-dev-id');
      expect(result.name).toBe('Development & Projects');
      expect(mockQuery.insert).not.toHaveBeenCalled();
    });

    it('canonicalizes to Development & Projects if no canonical category exists yet', async () => {
      let isFirstCall = true;
      const mockMaybeSingle = vi.fn().mockImplementation(() => {
        if (isFirstCall) {
          isFirstCall = false;
          return Promise.resolve({ data: null, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const mockInsertSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'new-dev-id',
          name: 'Development & Projects',
          parent_id: null,
          user_id: 'user-123',
        },
        error: null,
      });

      const mockInsertBuilder = {
        select: vi.fn().mockReturnValue({
          single: mockInsertSingle,
        }),
      };

      const mockQuery: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: mockMaybeSingle,
        insert: vi.fn().mockReturnValue(mockInsertBuilder),
      };

      vi.mocked(createAdminClient).mockReturnValue({
        from: vi.fn().mockReturnValue(mockQuery),
      } as any);

      const result = await createCategory('user-123', {
        name: 'Projects',
        sort_order: 0,
      });

      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Development & Projects',
          slug: 'development-projects',
          parent_id: null,
        })
      );
      expect(result.id).toBe('new-dev-id');
    });
  });

  describe('resolveProjectCategory enforcement', () => {
    it('defaults to canonical Development & Projects when categoryId is omitted', async () => {
      const mockDevCat = {
        id: 'canonical-dev-id',
        name: 'Development & Projects',
        parent_id: null,
      };

      const mockQuery: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockDevCat, error: null }),
      };

      const adminMock = {
        from: vi.fn().mockReturnValue(mockQuery),
      } as any;
      vi.mocked(createAdminClient).mockReturnValue(adminMock);

      const resolved = await resolveProjectCategory(adminMock, 'user-123', undefined);
      expect(resolved).toBe('canonical-dev-id');
    });

    it('preserves valid subcategories belonging to Development & Projects', async () => {
      const mockDevCat = {
        id: 'canonical-dev-id',
        name: 'Development & Projects',
        parent_id: null,
      };

      const mockSubCat = {
        id: 'sub-ripple-id',
        name: 'Ripple',
        parent_id: 'canonical-dev-id',
      };

      let queryCount = 0;
      const mockQuery: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockImplementation(() => {
          queryCount++;
          if (queryCount === 1) return Promise.resolve({ data: mockDevCat, error: null });
          return Promise.resolve({ data: mockSubCat, error: null });
        }),
      };

      const adminMock = {
        from: vi.fn().mockReturnValue(mockQuery),
      } as any;
      vi.mocked(createAdminClient).mockReturnValue(adminMock);

      const resolved = await resolveProjectCategory(adminMock, 'user-123', 'sub-ripple-id');
      expect(resolved).toBe('sub-ripple-id');
    });

    it('forces foreign categories back to canonical Development & Projects', async () => {
      const mockDevCat = {
        id: 'canonical-dev-id',
        name: 'Development & Projects',
        parent_id: null,
      };

      const mockForeignCat = {
        id: 'foreign-personal-id',
        name: 'Personal & Life Admin',
        parent_id: null,
      };

      let queryCount = 0;
      const mockQuery: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockImplementation(() => {
          queryCount++;
          if (queryCount === 1) return Promise.resolve({ data: mockDevCat, error: null });
          return Promise.resolve({ data: mockForeignCat, error: null });
        }),
      };

      const adminMock = {
        from: vi.fn().mockReturnValue(mockQuery),
      } as any;
      vi.mocked(createAdminClient).mockReturnValue(adminMock);

      const resolved = await resolveProjectCategory(adminMock, 'user-123', 'foreign-personal-id');
      expect(resolved).toBe('canonical-dev-id');
    });
  });

  describe('MCP server category & project tools', () => {
    const dummyAuth = {
      token: 'test_token',
      userId: 'user-123',
      clientId: 'chatgpt',
      clientName: 'chatgpt',
      timezone: 'Asia/Kolkata',
    };

    it('aliases parent_category_name "Projects" to Development & Projects in create_category', async () => {
      const devCat = {
        id: 'canonical-dev-id',
        name: 'Development & Projects',
        parent_id: null,
        subcategories: [],
      } as any;

      vi.spyOn(categoriesService, 'getCategories').mockResolvedValue([devCat]);
      const createCatSpy = vi.spyOn(categoriesService, 'createCategory').mockResolvedValue({
        id: 'new-sub-id',
        name: 'NewSub',
        parent_id: 'canonical-dev-id',
      } as any);

      const server = createPerManMcpServer(dummyAuth);
      const createCatTool = (server as any)._registeredTools['create_category'];
      expect(createCatTool).toBeDefined();

      const toolHandler = createCatTool.handler || createCatTool.execute || createCatTool.callback;
      expect(toolHandler).toBeDefined();

      const response = await toolHandler({
        name: 'NewSub',
        parent_category_name: 'Projects',
      });
      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.success).toBe(true);
      expect(createCatSpy).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          name: 'NewSub',
          parent_id: 'canonical-dev-id',
        })
      );
    });

    it('rejects create_project if assigned to foreign category outside Development & Projects', async () => {
      const devCat = {
        id: 'canonical-dev-id',
        name: 'Development & Projects',
        parent_id: null,
        subcategories: [],
      } as any;
      const personalCat = {
        id: 'personal-cat-id',
        name: 'Personal & Life Admin',
        parent_id: null,
        subcategories: [],
      } as any;

      vi.spyOn(categoriesService, 'getCategories').mockResolvedValue([devCat, personalCat]);

      const server = createPerManMcpServer(dummyAuth);
      const createProjTool = (server as any)._registeredTools['create_project'];
      const toolHandler = createProjTool.handler || createProjTool.execute || createProjTool.callback;

      await expect(toolHandler({
        name: 'Bad Project',
        category_id: 'personal-cat-id',
      })).rejects.toThrow("Project category must be 'Development & Projects' or one of its subcategories");
    });
  });
});
