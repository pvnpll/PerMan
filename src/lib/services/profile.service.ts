import { createAdminClient } from '@/lib/supabase/admin';
import { PM_TABLES } from '@/lib/db-tables';

export async function ensureUserProfile(
  userId: string,
  email?: string,
  fullName?: string,
  timezone?: string
) {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from(PM_TABLES.PROFILES)
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!existing) {
    await admin.from(PM_TABLES.PROFILES).upsert(
      {
        id: userId,
        email: email || '',
        full_name: fullName || email || 'PerMang User',
        timezone: timezone || 'Asia/Kolkata',
      },
      { onConflict: 'id' }
    );

    // Seed default categories & projects safely (idempotent, pm_ tables only)
    try {
      await admin.rpc('pm_seed_user_defaults', { p_user_id: userId });
    } catch (err) {
      console.error('Error running pm_seed_user_defaults:', err);
    }
  }
}
