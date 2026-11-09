import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-helper';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid item.' }, { status: 400 });
  const admin = createAdminClient();
  const { data: item, error } = await admin.from('pm_workspace_items').select('image_path').eq('id', id).eq('user_id', userId).maybeSingle();
  if (error || !item) return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
  if (item.image_path?.startsWith(`${userId}/`)) {
    const { error: storageError } = await admin.storage.from('pm-captures').remove([item.image_path]);
    if (storageError) return NextResponse.json({ error: 'Could not remove screenshot. Please retry.' }, { status: 500 });
  }
  const { error: deleteError } = await admin.from('pm_workspace_items').delete().eq('id', id).eq('user_id', userId);
  return deleteError ? NextResponse.json({ error: 'Could not delete item.' }, { status: 500 }) : NextResponse.json({ success: true });
}
