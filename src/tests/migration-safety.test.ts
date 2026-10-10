import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Database Migration Safety & Isolation', () => {
  const migrationPath = path.resolve(__dirname, '../../supabase/migrations/001_permang_initial_schema.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  it('ensures migration file exists and is populated', () => {
    expect(sql.length).toBeGreaterThan(100);
  });

  it('strictly ensures EVERY created table starts with "pm_"', () => {
    const createTableRegex = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([a-zA-Z0-9_]+)/gi;
    const matches: string[] = [];
    let match;

    while ((match = createTableRegex.exec(sql)) !== null) {
      matches.push(match[1]);
    }

    expect(matches.length).toBeGreaterThanOrEqual(10);

    for (const tableName of matches) {
      expect(
        tableName.startsWith('pm_'),
        `Table "${tableName}" does not have mandatory "pm_" prefix!`
      ).toBe(true);
    }
  });

  it('strictly prohibits destructive DROP TABLE statements on non-pm_ tables', () => {
    const dropTableRegex = /DROP\s+TABLE(?:\s+IF\s+EXISTS)?\s+([a-zA-Z0-9_]+)/gi;
    let match;

    while ((match = dropTableRegex.exec(sql)) !== null) {
      const dropped = match[1];
      expect(
        dropped.startsWith('pm_'),
        `Forbidden DROP TABLE on non-pm table: "${dropped}"!`
      ).toBe(true);
    }
  });

  it('prohibits dropping or resetting schemas', () => {
    expect(sql.toLowerCase()).not.toContain('drop schema');
    expect(sql.toLowerCase()).not.toContain('truncate');
  });

  it('enforces Row Level Security (RLS) on all PerMang application tables', () => {
    const tablesWithRls = [
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

    for (const table of tablesWithRls) {
      const rlsStatement = `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`;
      expect(
        sql.includes(rlsStatement),
        `Table ${table} is missing RLS enable statement!`
      ).toBe(true);
    }
  });

  it('ensures all functions and triggers are prefixed with "pm_"', () => {
    const createFunctionRegex = /CREATE(?:\s+OR\s+REPLACE)?\s+FUNCTION\s+([a-zA-Z0-9_]+)/gi;
    let match;

    while ((match = createFunctionRegex.exec(sql)) !== null) {
      const funcName = match[1];
      expect(
        funcName.startsWith('pm_'),
        `Function "${funcName}" must have "pm_" prefix!`
      ).toBe(true);
    }
  });
});
