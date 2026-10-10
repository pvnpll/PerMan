import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createPerMangMcpServer, McpAuthInfo } from './server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PM_TABLES } from '@/lib/db-tables';
import { isValidTimezone, DEFAULT_TIMEZONE } from '@/lib/date';

export async function handleStatelessMcpRequest(webRequest: Request, authInfo: McpAuthInfo) {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Stateless per-request
    enableDnsRebindingProtection: false,
    enableJsonResponse: true,
  } as any);

  const server = createPerMangMcpServer(authInfo);
  await server.connect(transport);
  return transport.handleRequest(webRequest, {
    authInfo: {
      ...authInfo,
      scopes: authInfo.scopes || ['tasks:read', 'tasks:write', 'reminders:write'],
    } as any,
  });
}

export async function authenticateToken(req: Request): Promise<McpAuthInfo | null> {
  let token = '';

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else {
    // Fallback to query parameter (e.g. for SSE GET)
    try {
      const url = new URL(req.url);
      const queryToken = url.searchParams.get('token');
      if (queryToken) token = queryToken;
    } catch {
      // ignore
    }
  }

  if (!token) return null;

  const admin = createAdminClient();

  const { data: tokenRow, error } = await admin
    .from(PM_TABLES.MCP_TOKENS)
    .select('user_id, client_id, token_name, expires_at')
    .eq('access_token', token)
    .maybeSingle();

  if (error || !tokenRow) {
    return null;
  }

  // Check expiration if set
  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
    return null;
  }

  // Update last_used_at timestamp
  await admin
    .from(PM_TABLES.MCP_TOKENS)
    .update({ last_used_at: new Date().toISOString() })
    .eq('access_token', token);

  // Fetch user timezone from pm_profiles
  const { data: profile } = await admin
    .from(PM_TABLES.PROFILES)
    .select('timezone')
    .eq('id', tokenRow.user_id)
    .maybeSingle();

  const timezone = isValidTimezone(profile?.timezone) ? profile!.timezone : DEFAULT_TIMEZONE;

  const userAgent = req.headers.get('user-agent')?.toLowerCase() || '';
  let clientName = 'chatgpt';
  if (userAgent.includes('claude')) {
    clientName = 'claude';
  }

  return {
    token,
    userId: tokenRow.user_id,
    clientId: tokenRow.client_id || 'chatgpt',
    clientName,
    timezone,
  };
}
