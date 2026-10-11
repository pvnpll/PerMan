import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authenticateToken } from '@/lib/mcp/transport';

export async function getAuthUserId(req: NextRequest): Promise<string | null> {
  // 1. Check Bearer token (OAuth access token or PAT)
  try {
    const authInfo = await authenticateToken(req as unknown as Request);
    if (authInfo?.userId) {
      return authInfo.userId;
    }
  } catch {
    // continue to cookie auth
  }

  // 2. Check Supabase session cookies
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      return user.id;
    }
  } catch {
    // cookie parsing failed or absent
  }

  return null;
}
