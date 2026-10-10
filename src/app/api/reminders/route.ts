import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PM_TABLES } from '@/lib/db-tables';
import { createReminder } from '@/lib/services/reminders.service';
import { CreateReminderSchema } from '@/lib/validation';


export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from(PM_TABLES.REMINDERS)
    .select(`
      *,
      task:pm_tasks!task_id(*)
    `)
    .eq('user_id', user.id)
    .order('remind_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reminders: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = CreateReminderSchema.parse(body);

    const reminder = await createReminder(
      user.id,
      validated.task_id,
      validated.remind_at,
      validated.channel
    );

    return NextResponse.json({ reminder }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
