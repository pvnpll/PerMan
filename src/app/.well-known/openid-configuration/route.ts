import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const metadata = {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/mcp/authorize`,
    token_endpoint: `${baseUrl}/api/mcp/token`,
    registration_endpoint: `${baseUrl}/api/mcp/register`,
    userinfo_endpoint: `${baseUrl}/api/account`,
    scopes_supported: ['openid', 'profile', 'email', 'tasks:read', 'tasks:write', 'reminders:write'],
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['HS256'],
    code_challenge_methods_supported: ['S256', 'plain'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
    service_documentation: `${baseUrl}/settings`,
  };

  return NextResponse.json(metadata, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
