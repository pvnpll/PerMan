import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PM_TABLES } from '@/lib/db-tables';
import { ensureUserProfile } from '@/lib/services/profile.service';
import { getAllWorkspaceCapturePaths } from '@/lib/workspace';
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

  // Remove only this user's PerMan screenshots across all pages before cascading workspace records.
  let paths: string[] = [];
  try {
    paths = await getAllWorkspaceCapturePaths(admin, user.id);
  } catch (err: any) {
    return NextResponse.json({ error: 'Could not read screenshot data. Please retry.' }, { status: 500 });
  }

  // Remove files in safe chunks
  const CHUNK_SIZE = 500;
  for (let i = 0; i < paths.length; i += CHUNK_SIZE) {
    const chunk = paths.slice(i, i + CHUNK_SIZE);
    const { error: removeError } = await admin.storage.from('pm-captures').remove(chunk);
    if (removeError) {
      return NextResponse.json({ error: 'Could not delete screenshots. Please retry.' }, { status: 500 });
    }
  }

  const { error: workspaceError } = await admin.from('pm_workspace_items').delete().eq('user_id', user.id);
  if (workspaceError) return NextResponse.json({ error: 'Could not delete workspace. Please retry.' }, { status: 500 });

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
