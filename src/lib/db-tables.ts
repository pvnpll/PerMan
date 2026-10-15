/**
-- ==============================================================================
-- PerMan Database Table Constants
-- All PerMan tables are strictly isolated with prefix 'pm_'
-- Project: random (Supabase)
-- ==============================================================================
*/

export const PM_TABLES = {
  PROFILES: 'pm_profiles',
  CATEGORIES: 'pm_categories',
  PROJECTS: 'pm_projects',
  RECURRENCE_RULES: 'pm_recurrence_rules',
  TASKS: 'pm_tasks',
  REMINDERS: 'pm_reminders',
  NOTIFICATION_LOGS: 'pm_notification_logs',
  TAGS: 'pm_tags',
  TASK_TAGS: 'pm_task_tags',
  MCP_IDEMPOTENCY_KEYS: 'pm_mcp_idempotency_keys',
  MCP_AUTH_CODES: 'pm_mcp_auth_codes',
  MCP_TOKENS: 'pm_mcp_tokens',
} as const;

export type PmTableName = typeof PM_TABLES[keyof typeof PM_TABLES];
