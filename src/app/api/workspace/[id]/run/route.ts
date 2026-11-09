import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-helper';
import { createAdminClient } from '@/lib/supabase/admin';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { captureLines, WorkspaceSchema } from '@/lib/workspace';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const body = z.object({ due_date: z.string().datetime({ offset: true }), timezone: z.string().refine(tz => { try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; } }) }).parse(await req.json());
    const admin = createAdminClient();
    const { data: item, error } = await admin.from('pm_workspace_items').select('*').eq('id', id).eq('user_id', userId).eq('kind', 'ROUTINE').single();
    if (error || !item) return NextResponse.json({ error: 'Routine not found.' }, { status: 404 });
    const routine = WorkspaceSchema.parse(item);
    // One instance per routine per chosen local calendar date; retries cannot duplicate work.
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: body.timezone }).format(new Date(body.due_date));
    const hash = createHash('sha256').update(`${userId}:${id}:${day}`).digest('hex');
    const taskId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
    const frequency = routine.data.frequency || 'NONE';
    const { error: taskError } = await admin.from('pm_tasks').upsert({ id: taskId, user_id: userId, title: routine.title, description: captureLines(routine.content).map(s => `☐ ${s}`).join('\n'), status: 'NEXT', priority: 'MEDIUM', due_date: body.due_date, timezone: body.timezone, source: 'APP', recurrence_rule: frequency === 'NONE' ? null : { frequency, interval: 1 } }, { onConflict: 'id', ignoreDuplicates: true });
    if (taskError) throw taskError;
    return NextResponse.json({ task_id: taskId });
  } catch { return NextResponse.json({ error: 'Could not start routine. Check the date and retry.' }, { status: 400 }); }
}
