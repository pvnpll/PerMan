import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PM_TABLES } from '@/lib/db-tables';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = '/mcp/authorize';
  return NextResponse.redirect(url);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in first.' }, { status: 401 });
    }

    const { client_id, redirect_uri, state, code_challenge } = await req.json();

    if (!redirect_uri) {
      return NextResponse.json({ error: 'redirect_uri is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const code = `pm_code_${crypto.randomBytes(24).toString('hex')}`;

    // Store auth code in pm_mcp_auth_codes
    await admin.from(PM_TABLES.MCP_AUTH_CODES).insert({
      code,
      user_id: user.id,
      client_id: client_id || 'chatgpt',
      redirect_uri,
      code_challenge: code_challenge || null,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    });

    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('code', code);
    if (state) redirectUrl.searchParams.set('state', state);

    return NextResponse.json({ redirectUrl: redirectUrl.toString() });
  } catch (err: any) {
    console.error('Authorize error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
