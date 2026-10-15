import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const REQUIRED_TABLES = [
  'pm_profiles',
  'pm_categories',
  'pm_projects',
  'pm_recurrence_rules',
  'pm_tasks',
  'pm_reminders',
  'pm_notification_logs',
  'pm_tags',
  'pm_task_tags',
  'pm_mcp_idempotency_keys',
  'pm_mcp_auth_codes',
  'pm_mcp_tokens',
];

async function checkDatabase() {
  console.log('🔍 Checking Supabase project connection...');
  console.log(`📡 URL: ${SUPABASE_URL}`);

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        apikey: SERVICE_KEY!,
        Authorization: `Bearer ${SERVICE_KEY!}`,
      },
    });

    if (!res.ok) {
      console.error(`❌ REST API returned status ${res.status}: ${res.statusText}`);
      return;
    }

    const spec = await res.json();
    const existingDefinitions = Object.keys(spec.definitions || {});
    console.log(`\n📋 Found ${existingDefinitions.length} total tables in database schema cache.`);

    const foundPmTables = existingDefinitions.filter((t) => t.startsWith('pm_'));
    const missingTables = REQUIRED_TABLES.filter((t) => !existingDefinitions.includes(t));

    console.log(`\n--- PerMan (pm_) Table Status ---`);
    if (foundPmTables.length > 0) {
      console.log(`✅ Existing PerMan tables (${foundPmTables.length}):`);
      foundPmTables.forEach((t) => console.log(`   - ${t}`));
    } else {
      console.log(`⚠️  No 'pm_' tables found in database schema yet.`);
    }

    if (missingTables.length > 0) {
      console.log(`\n⏳ Tables pending migration (${missingTables.length}):`);
      missingTables.forEach((t) => console.log(`   - ${t}`));
      console.log(`\n💡 To create these tables:`);
      console.log(`   Open the Supabase SQL Editor for project 'random' (${SUPABASE_URL?.replace('.supabase.co', '')}):`);
      console.log(`   Copy and run: supabase/migrations/001_permang_initial_schema.sql`);
    } else {
      console.log(`\n🎉 All required PerMan tables are present and verified!`);
    }
  } catch (err: any) {
    console.error('❌ Connection failed:', err.message);
  }
}

checkDatabase();
