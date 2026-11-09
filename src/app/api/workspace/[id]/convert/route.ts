import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-helper';
import { createAdminClient } from '@/lib/supabase/admin';
import { createHash } from 'node:crypto';
import { z } from 'zod';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const { titles } = z.object({ titles: z.array(z.string().trim().min(1).max(500)).min(1).max(30) }).parse(await req.json());
    const admin = createAdminClient();
    const { data: item, error } = await admin.from('pm_workspace_items').select('*').eq('id', id).eq('user_id', userId).in('kind', ['NOTE', 'CAPTURE']).single();
    if (error || !item) return NextResponse.json({ error: 'Source not found.' }, { status: 404 });
    const tasks = [...new Set(titles)].map(title => {
      const hash = createHash('sha256').update(`${userId}:${id}:${title}`).digest('hex');
      const taskId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
      return { id: taskId, user_id: userId, title, description: `Captured from: ${item.title}\n\n${item.content}\n\nOriginal: /workspace?item=${id}`, status: 'INBOX', priority: 'MEDIUM', source: 'APP', external_url: new URL(`/workspace?item=${id}`, req.url).toString() };
    });
    const { error: taskError } = await admin.from('pm_tasks').upsert(tasks, { onConflict: 'id', ignoreDuplicates: true });
    if (taskError) throw taskError;
    return NextResponse.json({ count: tasks.length });
  } catch { return NextResponse.json({ error: 'Could not create tasks. Review titles and try again.' }, { status: 400 }); }
}
