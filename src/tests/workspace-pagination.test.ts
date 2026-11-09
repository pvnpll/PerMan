import { describe, it, expect, vi } from 'vitest';
import {
  encodeWorkspaceCursor,
  decodeWorkspaceCursor,
  getAllWorkspaceItems,
  getAllWorkspaceCapturePaths,
} from '@/lib/workspace';

describe('Workspace Pagination & Batch Iteration (PM-201)', () => {
  describe('Cursor encode / decode', () => {
    it('roundtrips a valid cursor', () => {
      const original = { updated_at: '2026-11-09T14:00:00.000Z', id: '123e4567-e89b-12d3-a456-426614174000' };
      const encoded = encodeWorkspaceCursor(original);
      const decoded = decodeWorkspaceCursor(encoded);
      expect(decoded).toEqual(original);
    });

    it('returns null on invalid cursor string', () => {
      expect(decodeWorkspaceCursor('not-valid-base64')).toBeNull();
      expect(decodeWorkspaceCursor(Buffer.from(JSON.stringify({ wrong: 123 })).toString('base64url'))).toBeNull();
    });
  });

  describe('getAllWorkspaceItems boundary pagination', () => {
    const mockAdmin = (totalRows: number, pageSize: number) => {
      const items = Array.from({ length: totalRows }, (_, i) => ({
        id: `item-${i + 1}`,
        user_id: 'user-123',
        kind: 'NOTE',
        title: `Note ${i + 1}`,
        content: `Content ${i + 1}`,
        data: {},
        image_path: null,
        created_at: new Date(1794200000000 - i * 1000).toISOString(),
        updated_at: new Date(1794200000000 - i * 1000).toISOString(),
      }));

      return {
        from: (table: string) => ({
          select: () => ({
            eq: (_col: string, val: string) => ({
              order: () => ({
                order: () => ({
                  range: async (from: number, to: number) => {
                    const slice = items.slice(from, to + 1);
                    return { data: slice, error: null };
                  },
                }),
              }),
            }),
          }),
        }),
      };
    };

    it('handles total records at page-size minus one (e.g. 4 items with batchSize 5)', async () => {
      const admin = mockAdmin(4, 5);
      const items = await getAllWorkspaceItems(admin, 'user-123', 5);
      expect(items).toHaveLength(4);
      expect(items[0].id).toBe('item-1');
      expect(items[3].id).toBe('item-4');
    });

    it('handles total records at exactly page-size (e.g. 5 items with batchSize 5)', async () => {
      const admin = mockAdmin(5, 5);
      const items = await getAllWorkspaceItems(admin, 'user-123', 5);
      expect(items).toHaveLength(5);
      expect(items[4].id).toBe('item-5');
    });

    it('handles total records across multiple pages (e.g. 12 items with batchSize 5)', async () => {
      const admin = mockAdmin(12, 5);
      const items = await getAllWorkspaceItems(admin, 'user-123', 5);
      expect(items).toHaveLength(12);
      expect(items[0].id).toBe('item-1');
      expect(items[11].id).toBe('item-12');
    });

    it('throws when database query encounters an error', async () => {
      const failingAdmin = {
        from: () => ({
          select: () => ({
            eq: () => ({
              order: () => ({
                order: () => ({
                  range: async () => ({ data: null, error: { message: 'DB connection failure' } }),
                }),
              }),
            }),
          }),
        }),
      };

      await expect(getAllWorkspaceItems(failingAdmin, 'user-123')).rejects.toThrow('DB connection failure');
    });
  });

  describe('getAllWorkspaceCapturePaths isolation & batching', () => {
    it('collects all image paths owned by user and filters out un-scoped paths', async () => {
      const mockCaptures = [
        { image_path: 'user-123/screenshot1.png' },
        { image_path: 'user-456/other-user.png' }, // Cross-user path: should be discarded!
        { image_path: 'user-123/screenshot2.png' },
      ];

      const admin = {
        from: () => ({
          select: () => ({
            eq: () => ({
              not: () => ({
                order: () => ({
                  range: async () => ({ data: mockCaptures, error: null }),
                }),
              }),
            }),
          }),
        }),
      };

      const paths = await getAllWorkspaceCapturePaths(admin, 'user-123', 10);
      expect(paths).toEqual(['user-123/screenshot1.png', 'user-123/screenshot2.png']);
      expect(paths).not.toContain('user-456/other-user.png');
    });
  });
});
