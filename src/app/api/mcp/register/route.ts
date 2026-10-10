import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';


export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const clientName = body.client_name || 'ChatGPT Custom GPT';
    const redirectUris = body.redirect_uris || [];

    const clientId = `mcp_client_${crypto.randomBytes(8).toString('hex')}`;
    const clientSecret = crypto.randomBytes(24).toString('hex');

    return NextResponse.json({
      client_id: clientId,
      client_secret: clientSecret,
      client_name: clientName,
      redirect_uris: redirectUris,
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    }, {
      status: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'invalid_client_metadata', details: err.message },
      {
        status: 400,
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
