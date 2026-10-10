import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const path = url.pathname;

  // Handle MCP JSON-RPC requests or probes sent to the root domain
  if (request.method === 'POST' && path === '/') {
    return NextResponse.rewrite(new URL('/api/mcp', request.url));
  }

  // Exclude static assets, api routes, mcp endpoints, auth pages
  const isMcpAuthorize = path === '/mcp/authorize';
  const isAuthPage = path.startsWith('/login') || path.startsWith('/signup') || path.startsWith('/auth') || isMcpAuthorize;
  const isPublicApi = path.startsWith('/api/mcp') || path === '/mcp' || path.startsWith('/api/cron') || path.startsWith('/.well-known');
  const isStatic = path.startsWith('/_next') || path.includes('.');

  if (!user && !isPublicApi && !isStatic) {
    if (isAuthPage && !isMcpAuthorize) {
      return supabaseResponse;
    }
    url.pathname = '/login';
    url.searchParams.set('next', `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage && !path.startsWith('/auth/callback') && !isMcpAuthorize) {
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
