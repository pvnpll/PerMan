import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PM_TABLES } from '@/lib/db-tables';
import crypto from 'crypto';


export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries());
    } else {
      body = await req.json().catch(() => ({}));
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    };

    const { grant_type, code, client_id, redirect_uri, code_verifier } = body;

    if (grant_type !== 'authorization_code') {
      return NextResponse.json(
        { error: 'unsupported_grant_type', error_description: 'Only authorization_code is supported' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!code) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Missing authorization code' },
        { status: 400, headers: corsHeaders }
      );
    }

    const admin = createAdminClient();

    // Verify authorization code
    const { data: authCode, error } = await admin
      .from(PM_TABLES.MCP_AUTH_CODES)
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (error || !authCode) {
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'Invalid or expired authorization code' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (new Date(authCode.expires_at) < new Date()) {
      await admin.from(PM_TABLES.MCP_AUTH_CODES).delete().eq('code', code);
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'Authorization code has expired' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify PKCE code_verifier if code_challenge was provided
    if (authCode.code_challenge) {
      if (!code_verifier) {
        return NextResponse.json(
          { error: 'invalid_grant', error_description: 'Missing code_verifier for PKCE' },
          { status: 400, headers: corsHeaders }
        );
      }

      const computedChallenge = crypto
        .createHash('sha256')
        .update(code_verifier)
        .digest('base64url');

      if (computedChallenge !== authCode.code_challenge && code_verifier !== authCode.code_challenge) {
        return NextResponse.json(
          { error: 'invalid_grant', error_description: 'Invalid code_verifier' },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Delete used auth code (single-use)
    await admin.from(PM_TABLES.MCP_AUTH_CODES).delete().eq('code', code);

    // Generate access token
    const accessToken = `pm_live_${crypto.randomBytes(32).toString('hex')}`;
    const expiresIn = 90 * 24 * 60 * 60; // 90 days

    await admin.from(PM_TABLES.MCP_TOKENS).insert({
      access_token: accessToken,
      user_id: authCode.user_id,
      client_id: client_id || authCode.client_id || 'chatgpt',
      token_name: `ChatGPT MCP Token (${new Date().toLocaleDateString()})`,
    });

    return NextResponse.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      scope: 'tasks:read tasks:write reminders:write',
    }, {
      headers: corsHeaders,
    });
  } catch (err: any) {
    console.error('Token endpoint error:', err);
    return NextResponse.json(
      { error: 'server_error', error_description: err.message },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
