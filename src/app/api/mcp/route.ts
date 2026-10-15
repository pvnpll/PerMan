import { NextRequest } from 'next/server';
import { authenticateToken, handleStatelessMcpRequest } from '@/lib/mcp/transport';


function getCorsHeaders(baseUrl: string) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Expose-Headers': 'WWW-Authenticate',
    'WWW-Authenticate': `Bearer realm="PerMan", resource_metadata="${baseUrl}/.well-known/oauth-protected-resource", scope="tasks:read tasks:write reminders:write"`,
  };
}

export async function OPTIONS() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(baseUrl),
  });
}

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const authInfo = await authenticateToken(req as unknown as Request);

  if (!authInfo) {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'Authentication required. Valid Bearer token required for PerMan MCP.',
          data: {
            _meta: {
              'mcp/www_authenticate': `Bearer realm="PerMan", resource_metadata="${baseUrl}/.well-known/oauth-protected-resource", scope="tasks:read tasks:write reminders:write"`,
            },
          },
        },
        message: 'Valid Bearer token required for PerMan MCP endpoint.',
        oauth_metadata: `${baseUrl}/.well-known/oauth-protected-resource`,
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(baseUrl),
        },
      }
    );
  }

  return new Response(
    JSON.stringify({
      status: 'active',
      name: 'perman-mcp',
      version: '1.0.0',
      user_id: authInfo.userId,
      client: authInfo.clientName,
      timezone: authInfo.timezone,
      transport: 'stateless-http',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...getCorsHeaders(baseUrl),
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const authInfo = await authenticateToken(req as unknown as Request);

  if (!authInfo) {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'Authentication required. Valid Bearer token required for PerMan MCP.',
          data: {
            _meta: {
              'mcp/www_authenticate': `Bearer realm="PerMan", resource_metadata="${baseUrl}/.well-known/oauth-protected-resource", scope="tasks:read tasks:write reminders:write"`,
            },
          },
        },
        message: 'Valid Bearer token required for PerMan MCP endpoint.',
        oauth_metadata: `${baseUrl}/.well-known/oauth-protected-resource`,
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(baseUrl),
        },
      }
    );
  }

  try {
    // Inject Accept header for text/event-stream or json
    const proxiedReq = new Proxy(req as unknown as Request, {
      get(target, prop) {
        if (prop === 'headers') {
          return new Proxy(target.headers, {
            get(headersTarget, headersProp) {
              if (headersProp === 'get') {
                return (name: string) => {
                  if (name.toLowerCase() === 'accept') {
                    const val = headersTarget.get(name) || '*/*';
                    if (!val.includes('text/event-stream')) {
                      return `${val}, text/event-stream, application/json`;
                    }
                  }
                  return headersTarget.get(name);
                };
              }
              const val = Reflect.get(headersTarget, headersProp);
              return typeof val === 'function' ? val.bind(headersTarget) : val;
            },
          });
        }
        const val = Reflect.get(target, prop);
        return typeof val === 'function' ? val.bind(target) : val;
      },
    });

    const response = await handleStatelessMcpRequest(proxiedReq, authInfo);

    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    newHeaders.set('Access-Control-Allow-Headers', '*');
    newHeaders.set('Access-Control-Expose-Headers', 'WWW-Authenticate');

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  } catch (err: any) {
    console.error('MCP POST Error:', err);
    return new Response(
      JSON.stringify({
        error: 'Internal server error in MCP transport',
        details: err.message,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(baseUrl),
        },
      }
    );
  }
}
