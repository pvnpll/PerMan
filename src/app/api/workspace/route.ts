import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-helper';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  WorkspaceSchema,
  WorkspaceItem,
  getAllWorkspaceItems,
  encodeWorkspaceCursor,
  decodeWorkspaceCursor,
} from '@/lib/workspace';

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = createAdminClient();

  const searchParams = req.nextUrl.searchParams;
  const cursorParam = searchParams.get('cursor');
  const limitParam = searchParams.get('limit');
  const allParam = searchParams.get('all');

  // If specific pagination is requested:
  if (cursorParam || limitParam || allParam === 'false') {
    const limit = Math.min(Math.max(1, parseInt(limitParam || '50', 10) || 50), 1000);
    const decodedCursor = cursorParam ? decodeWorkspaceCursor(cursorParam) : null;

    let query = admin
      .from('pm_workspace_items')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1);

    if (decodedCursor) {
      // Keyset pagination: records strictly older than cursor
      query = query.or(
        `updated_at.lt.${decodedCursor.updated_at},and(updated_at.eq.${decodedCursor.updated_at},id.lt.${decodedCursor.id})`
      );
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: 'Could not load workspace.' }, { status: 500 });

    const rawItems = (data || []) as WorkspaceItem[];
    const hasMore = rawItems.length > limit;
    const pageItems = hasMore ? rawItems.slice(0, limit) : rawItems;

    const items = await Promise.all(
      pageItems.map(async (item) => {
        if (!item.image_path?.startsWith(`${userId}/`)) return item;
        const { data: image } = await admin.storage.from('pm-captures').createSignedUrl(item.image_path, 3600);
        return { ...item, image_url: image?.signedUrl };
      })
    );

    const nextCursor = hasMore && pageItems.length > 0 ? encodeWorkspaceCursor(pageItems[pageItems.length - 1]) : null;

    return NextResponse.json(
      { items, next_cursor: nextCursor, has_more: hasMore },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  // Default: load all owned records without 1000-row truncation
  try {
    const allItems = await getAllWorkspaceItems(admin, userId);
    const items = await Promise.all(
      allItems.map(async (item) => {
        if (!item.image_path?.startsWith(`${userId}/`)) return item;
        const { data: image } = await admin.storage.from('pm-captures').createSignedUrl(item.image_path, 3600);
        return { ...item, image_url: image?.signedUrl };
      })
    );
    return NextResponse.json(
      { items, next_cursor: null, has_more: false },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Could not load workspace.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = WorkspaceSchema.parse(await req.json());
    const admin = createAdminClient();
    // Deterministic preference/fit IDs still require checking ownership before upsert.
    if (body.id) {
      const { data: existing, error } = await admin.from('pm_workspace_items').select('user_id').eq('id', body.id).maybeSingle();
      if (error || (existing && existing.user_id !== userId)) return NextResponse.json({ error: 'Item unavailable.' }, { status: 404 });
    }
    const payload = { ...body, user_id: userId, updated_at: new Date().toISOString() };
    const existing = body.id ? await admin.from('pm_workspace_items').select('id').eq('id', body.id).eq('user_id', userId).maybeSingle() : null;
    const write = existing?.data
      ? admin.from('pm_workspace_items').update(payload).eq('id', body.id!).eq('user_id', userId)
      : admin.from('pm_workspace_items').insert(payload);
    const { data, error } = await write.select('*').single();
    if (error) throw error;
    return NextResponse.json({ item: data });
  } catch { return NextResponse.json({ error: 'Could not save item. Check the fields and try again.' }, { status: 400 }); }
}
