import { z } from 'zod';

export const WorkspaceSchema = z.object({
  id: z.string().uuid().optional(),
  kind: z.enum(['NOTE', 'ROUTINE', 'CAPTURE', 'FIT', 'PREFERENCES']),
  title: z.string().trim().min(1).max(500),
  content: z.string().max(30000).default(''),
  data: z.object({
    minutes: z.number().int().min(1).max(1440).optional(),
    energy: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    task_id: z.string().uuid().optional(),
    frequency: z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY']).optional(),
    goal: z.number().int().min(1).max(50).optional(),
    motivation: z.boolean().optional(),
  }).default({}),
});
export type WorkspaceInput = z.infer<typeof WorkspaceSchema>;
export type WorkspaceItem = WorkspaceInput & { id: string; user_id: string; image_path: string | null; image_url?: string; created_at: string; updated_at: string };

export function captureLines(text: string): string[] {
  return [...new Set(text.split('\n').map(s => s.replace(/^\s*(?:[-*•]|\d+[.)]|\[[ xX]?\])\s*/, '').trim()).filter(Boolean))].slice(0, 30);
}

export function completionStreak(tasks: { status: string; completed_at: string | null }[], timezone: string, now = new Date()): number {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const days = new Set(tasks.filter(t => t.status === 'DONE' && t.completed_at).map(t => formatter.format(new Date(t.completed_at!))));
  // Walk calendar dates at noon UTC; avoid 24-hour arithmetic across local DST boundaries.
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (name: string) => Number(parts.find(p => p.type === name)!.value);
  const cursor = new Date(Date.UTC(part('year'), part('month') - 1, part('day'), 12));
  const key = () => `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}-${String(cursor.getUTCDate()).padStart(2, '0')}`;
  const dayKeys = new Set([...days]);
  if (!dayKeys.has(key())) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let count = 0;
  while (dayKeys.has(key())) { count++; cursor.setUTCDate(cursor.getUTCDate() - 1); }
  return count;
}

export interface WorkspaceCursor {
  updated_at: string;
  id: string;
}

export function encodeWorkspaceCursor(item: { updated_at: string; id: string }): string {
  return Buffer.from(JSON.stringify({ updated_at: item.updated_at, id: item.id })).toString('base64url');
}

export function decodeWorkspaceCursor(cursorStr: string): WorkspaceCursor | null {
  try {
    const raw = Buffer.from(cursorStr, 'base64url').toString('utf-8');
    const parsed = JSON.parse(raw);
    if (typeof parsed.updated_at === 'string' && typeof parsed.id === 'string') {
      return { updated_at: parsed.updated_at, id: parsed.id };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Iterates through all workspace items owned by userId in batches using range pagination,
 * ensuring no records are truncated.
 */
export async function getAllWorkspaceItems(admin: any, userId: string, batchSize = 1000): Promise<WorkspaceItem[]> {
  const items: WorkspaceItem[] = [];
  let from = 0;

  while (true) {
    const to = from + batchSize - 1;
    const { data, error } = await admin
      .from('pm_workspace_items')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to load workspace items: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    items.push(...(data as WorkspaceItem[]));

    if (data.length < batchSize) {
      break;
    }

    from += batchSize;
  }

  return items;
}

/**
 * Iterates through all screenshot image paths owned by userId in batches.
 */
export async function getAllWorkspaceCapturePaths(admin: any, userId: string, batchSize = 1000): Promise<string[]> {
  const paths: string[] = [];
  let from = 0;

  while (true) {
    const to = from + batchSize - 1;
    const { data, error } = await admin
      .from('pm_workspace_items')
      .select('image_path')
      .eq('user_id', userId)
      .not('image_path', 'is', null)
      .order('id', { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to load workspace capture paths: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const row of data) {
      if (row.image_path && typeof row.image_path === 'string' && row.image_path.startsWith(`${userId}/`)) {
        paths.push(row.image_path);
      }
    }

    if (data.length < batchSize) {
      break;
    }

    from += batchSize;
  }

  return paths;
}
