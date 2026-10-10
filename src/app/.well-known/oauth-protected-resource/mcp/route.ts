import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const metadata = {
    resource: `${baseUrl}/mcp`,
    authorization_servers: [baseUrl],
    scopes_supported: ['tasks:read', 'tasks:write', 'reminders:write'],
    bearer_methods_supported: ['header'],
    authorization_endpoint: `${baseUrl}/mcp/authorize`,
    token_endpoint: `${baseUrl}/api/mcp/token`,
    registration_endpoint: `${baseUrl}/api/mcp/register`,
    resource_documentation: `${baseUrl}/settings`,
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
