-- ==============================================================================
-- Migration: 002_remove_shared_auth_trigger.sql
-- Description: Drops the global trigger and function on auth.users.
--
-- RATIONALE:
-- The Supabase database is shared across multiple projects (Calflow, Instareels, PerMang).
-- Attaching a trigger to the shared `auth.users` table executes on signups for ALL apps,
-- violating strict multi-project isolation.
--
-- User profile creation and initial category/project seeding is now performed
-- safely in the PerMang application layer (ensureUserProfile) upon PerMang access.
-- ==============================================================================

DROP TRIGGER IF EXISTS pm_on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS pm_handle_new_user();
