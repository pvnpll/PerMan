import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import { ensureUserProfile } from '@/lib/services/profile.service';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      await ensureUserProfile(
        data.user.id,
        data.user.email,
        data.user.user_metadata?.full_name,
        data.user.user_metadata?.timezone
      );
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // Return the user to login with an error if code exchange failed
  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', requestUrl.origin));
}
