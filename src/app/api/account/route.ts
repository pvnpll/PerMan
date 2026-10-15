import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PM_TABLES } from '@/lib/db-tables';
import { ensureUserProfile } from '@/lib/services/profile.service';
import crypto from 'crypto';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Ensure user profile & default categories exist in pm_ tables
  await ensureUserProfile(
    user.id,
    user.email,
    user.user_metadata?.full_name || user.email?.split('@')[0],
    user.user_metadata?.timezone
  );

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from(PM_TABLES.PROFILES)
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return NextResponse.json({ user, profile });
}

export async function POST(req: NextRequest) {
  // Generate a Personal Access Token for MCP
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const tokenName = body.name || 'ChatGPT / Claude PAT';

  const admin = createAdminClient();
  const token = `pm_pat_${crypto.randomBytes(32).toString('hex')}`;

  const { data, error } = await admin
    .from(PM_TABLES.MCP_TOKENS)
    .insert({
      access_token: token,
      user_id: user.id,
      client_id: 'personal-access-token',
      token_name: tokenName,
      expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // 180 days
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ token, record: data }, { status: 201 });
}

export async function DELETE() {
  // Strict Isolation: ONLY delete user records from pm_ tables.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Cascade or explicitly clean pm_ tables
  await admin.from(PM_TABLES.REMINDERS).delete().eq('user_id', user.id);
  await admin.from(PM_TABLES.TASKS).delete().eq('user_id', user.id);
  await admin.from(PM_TABLES.PROJECTS).delete().eq('user_id', user.id);
  await admin.from(PM_TABLES.CATEGORIES).delete().eq('user_id', user.id);
  await admin.from(PM_TABLES.NOTIFICATION_LOGS).delete().eq('user_id', user.id);
  await admin.from(PM_TABLES.MCP_TOKENS).delete().eq('user_id', user.id);
  await admin.from(PM_TABLES.MCP_AUTH_CODES).delete().eq('user_id', user.id);
  await admin.from(PM_TABLES.MCP_IDEMPOTENCY_KEYS).delete().eq('user_id', user.id);
  await admin.from(PM_TABLES.PROFILES).delete().eq('id', user.id);

  return NextResponse.json({ success: true, message: 'All PerMan data cleared.' });
}
