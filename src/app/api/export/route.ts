import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PM_TABLES } from '@/lib/db-tables';


export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const [tasksRes, categoriesRes, projectsRes, remindersRes, profileRes] = await Promise.all([
    admin.from(PM_TABLES.TASKS).select('*').eq('user_id', user.id),
    admin.from(PM_TABLES.CATEGORIES).select('*').eq('user_id', user.id),
    admin.from(PM_TABLES.PROJECTS).select('*').eq('user_id', user.id),
    admin.from(PM_TABLES.REMINDERS).select('*').eq('user_id', user.id),
    admin.from(PM_TABLES.PROFILES).select('*').eq('id', user.id).maybeSingle(),
  ]);

  const exportData = {
    exportDate: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      profile: profileRes.data,
    },
    counts: {
      tasks: tasksRes.data?.length || 0,
      categories: categoriesRes.data?.length || 0,
      projects: projectsRes.data?.length || 0,
      reminders: remindersRes.data?.length || 0,
    },
    categories: categoriesRes.data || [],
    projects: projectsRes.data || [],
    tasks: tasksRes.data || [],
    reminders: remindersRes.data || [],
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="permang-export-${new Date().toISOString().split('T')[0]}.json"`,
    },
  });
}
