import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { snoozeReminder } from '@/lib/services/reminders.service';
import { SnoozeReminderSchema } from '@/lib/validation';


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const validated = SnoozeReminderSchema.parse(body);

    const reminder = await snoozeReminder(user.id, id, validated.minutes);
    return NextResponse.json({ reminder });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
