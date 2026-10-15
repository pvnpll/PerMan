-- ==============================================================================
-- PerMan (Personal Management) Database Schema
-- Multi-Tenant Project Separation: All PerMan tables are strictly prefixed with 'pm_'
-- Project: random (Supabase)
-- Safe to run alongside 'cf_' (CalFlow) and 'ir_' (InstaReels) tables.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Helper Function: pm_update_updated_at_column
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pm_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 2. User Profiles (pm_profiles)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pm_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    notification_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER pm_tr_profiles_updated_at
    BEFORE UPDATE ON pm_profiles
    FOR EACH ROW
    EXECUTE FUNCTION pm_update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 3. Categories & Subcategories (pm_categories)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pm_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    parent_id UUID REFERENCES pm_categories(id) ON DELETE CASCADE,
    icon TEXT,
    color TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pm_unique_user_category_slug UNIQUE (user_id, parent_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_pm_categories_user_id ON pm_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_categories_parent_id ON pm_categories(parent_id);

CREATE TRIGGER pm_tr_categories_updated_at
    BEFORE UPDATE ON pm_categories
    FOR EACH ROW
    EXECUTE FUNCTION pm_update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 4. Projects (pm_projects)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pm_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    icon TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'ARCHIVED')),
    category_id UUID REFERENCES pm_categories(id) ON DELETE SET NULL,
    target_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_projects_user_id ON pm_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_projects_status ON pm_projects(status);

CREATE TRIGGER pm_tr_projects_updated_at
    BEFORE UPDATE ON pm_projects
    FOR EACH ROW
    EXECUTE FUNCTION pm_update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 5. Recurrence Rules (pm_recurrence_rules)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pm_recurrence_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM')),
    interval INT NOT NULL DEFAULT 1,
    days_of_week INT[], -- 0=Sunday, 1=Monday, ...
    day_of_month INT,
    end_date TIMESTAMPTZ,
    count INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_recurrence_rules_user_id ON pm_recurrence_rules(user_id);

-- ------------------------------------------------------------------------------
-- 6. Tasks (pm_tasks)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pm_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES pm_categories(id) ON DELETE SET NULL,
    subcategory_id UUID REFERENCES pm_categories(id) ON DELETE SET NULL,
    project_id UUID REFERENCES pm_projects(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'INBOX' CHECK (status IN ('INBOX', 'NEXT', 'SCHEDULED', 'WAITING', 'DONE', 'CANCELLED')),
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    due_date TIMESTAMPTZ,
    reminder_time TIMESTAMPTZ,
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    completed_at TIMESTAMPTZ,
    recurrence_id UUID REFERENCES pm_recurrence_rules(id) ON DELETE SET NULL,
    recurrence_rule JSONB,
    source TEXT NOT NULL DEFAULT 'APP' CHECK (source IN ('APP', 'MCP', 'SHORTCUT', 'API')),
    external_url TEXT,
    merchant TEXT,
    estimated_amount NUMERIC(12, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pm_tasks_user_id ON pm_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_status ON pm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_priority ON pm_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_due_date ON pm_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_reminder_time ON pm_tasks(reminder_time);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_category_id ON pm_tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_project_id ON pm_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_archived_at ON pm_tasks(archived_at);

CREATE TRIGGER pm_tr_tasks_updated_at
    BEFORE UPDATE ON pm_tasks
    FOR EACH ROW
    EXECUTE FUNCTION pm_update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 7. Reminders (pm_reminders)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pm_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    task_id UUID REFERENCES pm_tasks(id) ON DELETE CASCADE NOT NULL,
    remind_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'SNOOZED', 'DISMISSED', 'FAILED')),
    snooze_count INT NOT NULL DEFAULT 0,
    snoozed_until TIMESTAMPTZ,
    channel TEXT NOT NULL DEFAULT 'EMAIL' CHECK (channel IN ('EMAIL', 'PUSH', 'IN_APP')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_reminders_user_id ON pm_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_reminders_task_id ON pm_reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_pm_reminders_remind_at ON pm_reminders(remind_at);
CREATE INDEX IF NOT EXISTS idx_pm_reminders_status ON pm_reminders(status);

CREATE TRIGGER pm_tr_reminders_updated_at
    BEFORE UPDATE ON pm_reminders
    FOR EACH ROW
    EXECUTE FUNCTION pm_update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 8. Notification Logs (pm_notification_logs)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pm_notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    reminder_id UUID REFERENCES pm_reminders(id) ON DELETE SET NULL,
    task_id UUID REFERENCES pm_tasks(id) ON DELETE SET NULL,
    channel TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'RETRY')),
    attempt_number INT NOT NULL DEFAULT 1,
    idempotency_key TEXT UNIQUE,
    payload JSONB,
    response TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_notification_logs_user_id ON pm_notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_notification_logs_reminder_id ON pm_notification_logs(reminder_id);

-- ------------------------------------------------------------------------------
-- 9. Tags & Task Tags (pm_tags, pm_task_tags)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pm_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pm_unique_user_tag_name UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS pm_task_tags (
    task_id UUID REFERENCES pm_tasks(id) ON DELETE CASCADE NOT NULL,
    tag_id UUID REFERENCES pm_tags(id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (task_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_tags_user_id ON pm_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_task_tags_task ON pm_task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_pm_task_tags_tag ON pm_task_tags(tag_id);

-- ------------------------------------------------------------------------------
-- 10. MCP Idempotency Keys (pm_mcp_idempotency_keys)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pm_mcp_idempotency_keys (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL,
    result JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_pm_mcp_idempotency_user ON pm_mcp_idempotency_keys(user_id);

-- ------------------------------------------------------------------------------
-- 11. MCP OAuth & Auth Tokens (pm_mcp_auth_codes, pm_mcp_tokens)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pm_mcp_auth_codes (
    code TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    client_id TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    code_challenge TEXT,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pm_mcp_tokens (
    access_token TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    client_id TEXT NOT NULL,
    token_name TEXT DEFAULT 'PerMan MCP Access Token',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pm_mcp_tokens_user ON pm_mcp_tokens(user_id);

-- ------------------------------------------------------------------------------
-- 12. Enable Row Level Security (RLS) on all PerMan tables
-- ------------------------------------------------------------------------------
ALTER TABLE pm_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_recurrence_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_mcp_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_mcp_auth_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_mcp_tokens ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 13. RLS Policies: User Ownership & Service Role
-- ------------------------------------------------------------------------------
-- Service role has full access across all pm_ tables
CREATE POLICY "pm_service_role_profiles" ON pm_profiles FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "pm_service_role_categories" ON pm_categories FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "pm_service_role_projects" ON pm_projects FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "pm_service_role_recurrence" ON pm_recurrence_rules FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "pm_service_role_tasks" ON pm_tasks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "pm_service_role_reminders" ON pm_reminders FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "pm_service_role_notification_logs" ON pm_notification_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "pm_service_role_tags" ON pm_tags FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "pm_service_role_task_tags" ON pm_task_tags FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "pm_service_role_mcp_idempotency" ON pm_mcp_idempotency_keys FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "pm_service_role_mcp_auth_codes" ON pm_mcp_auth_codes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "pm_service_role_mcp_tokens" ON pm_mcp_tokens FOR ALL USING (auth.role() = 'service_role');

-- User policies
CREATE POLICY "pm_user_profiles_select" ON pm_profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "pm_user_profiles_update" ON pm_profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "pm_user_profiles_insert" ON pm_profiles FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "pm_user_categories_all" ON pm_categories FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "pm_user_projects_all" ON pm_projects FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "pm_user_recurrence_all" ON pm_recurrence_rules FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "pm_user_tasks_all" ON pm_tasks FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "pm_user_reminders_all" ON pm_reminders FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "pm_user_notification_logs_select" ON pm_notification_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "pm_user_tags_all" ON pm_tags FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "pm_user_task_tags_all" ON pm_task_tags FOR ALL USING (
    EXISTS (SELECT 1 FROM pm_tasks WHERE pm_tasks.id = pm_task_tags.task_id AND pm_tasks.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM pm_tasks WHERE pm_tasks.id = pm_task_tags.task_id AND pm_tasks.user_id = auth.uid())
);
CREATE POLICY "pm_user_mcp_idempotency_all" ON pm_mcp_idempotency_keys FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "pm_user_mcp_tokens_all" ON pm_mcp_tokens FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 14. Helper Function: Seed default categories & initial projects for a user
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pm_seed_user_defaults(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_dev_id UUID;
    v_life_id UUID;
    v_fin_id UUID;
    v_shop_id UUID;
    v_learn_id UUID;
    v_health_id UUID;
    v_routine_id UUID;
    v_content_id UUID;
    v_travel_id UUID;
    v_ideas_id UUID;
BEGIN
    -- Check if user already has categories
    IF EXISTS (SELECT 1 FROM pm_categories WHERE user_id = p_user_id LIMIT 1) THEN
        RETURN;
    END IF;

    -- 1. Development & Projects
    INSERT INTO pm_categories (user_id, name, slug, icon, color, sort_order)
    VALUES (p_user_id, 'Development & Projects', 'development-projects', 'Code', '#3B82F6', 10)
    RETURNING id INTO v_dev_id;

    INSERT INTO pm_categories (user_id, name, slug, parent_id, sort_order) VALUES
    (p_user_id, 'Calflow', 'calflow', v_dev_id, 1),
    (p_user_id, 'Rimev', 'rimev', v_dev_id, 2),
    (p_user_id, 'Klay', 'klay', v_dev_id, 3),
    (p_user_id, 'Personal Website & Domain', 'personal-website-domain', v_dev_id, 4),
    (p_user_id, 'Instagram/Reels Automation', 'instagram-reels-automation', v_dev_id, 5),
    (p_user_id, 'AI Experiments', 'ai-experiments', v_dev_id, 6),
    (p_user_id, 'Other Projects', 'other-projects', v_dev_id, 7);

    -- 2. Personal & Life Admin
    INSERT INTO pm_categories (user_id, name, slug, icon, color, sort_order)
    VALUES (p_user_id, 'Personal & Life Admin', 'personal-life-admin', 'UserCheck', '#10B981', 20)
    RETURNING id INTO v_life_id;

    INSERT INTO pm_categories (user_id, name, slug, parent_id, sort_order) VALUES
    (p_user_id, 'Daily Errands', 'daily-errands', v_life_id, 1),
    (p_user_id, 'Family & Friends', 'family-friends', v_life_id, 2),
    (p_user_id, 'Calls & Messages', 'calls-messages', v_life_id, 3),
    (p_user_id, 'Appointments', 'appointments', v_life_id, 4),
    (p_user_id, 'Documents & Renewals', 'documents-renewals', v_life_id, 5),
    (p_user_id, 'Home Maintenance', 'home-maintenance', v_life_id, 6),
    (p_user_id, 'Travel Administration', 'travel-administration', v_life_id, 7),
    (p_user_id, 'Important Commitments', 'important-commitments', v_life_id, 8);

    -- 3. Finances
    INSERT INTO pm_categories (user_id, name, slug, icon, color, sort_order)
    VALUES (p_user_id, 'Finances', 'finances', 'DollarSign', '#F59E0B', 30)
    RETURNING id INTO v_fin_id;

    INSERT INTO pm_categories (user_id, name, slug, parent_id, sort_order) VALUES
    (p_user_id, 'Expenses to Record', 'expenses-to-record', v_fin_id, 1),
    (p_user_id, 'Bills & Payments', 'bills-payments', v_fin_id, 2),
    (p_user_id, 'Subscriptions', 'subscriptions', v_fin_id, 3),
    (p_user_id, 'Investments & IPOs', 'investments-ipos', v_fin_id, 4),
    (p_user_id, 'Banking & UPI', 'banking-upi', v_fin_id, 5),
    (p_user_id, 'Budget & Savings', 'budget-savings', v_fin_id, 6),
    (p_user_id, 'Taxes & Financial Documents', 'taxes-financial-documents', v_fin_id, 7);

    -- 4. Shopping & Purchases
    INSERT INTO pm_categories (user_id, name, slug, icon, color, sort_order)
    VALUES (p_user_id, 'Shopping & Purchases', 'shopping-purchases', 'ShoppingCart', '#EC4899', 40)
    RETURNING id INTO v_shop_id;

    INSERT INTO pm_categories (user_id, name, slug, parent_id, sort_order) VALUES
    (p_user_id, 'Amazon', 'amazon', v_shop_id, 1),
    (p_user_id, 'Flipkart', 'flipkart', v_shop_id, 2),
    (p_user_id, 'Offline Stores', 'offline-stores', v_shop_id, 3),
    (p_user_id, 'Groceries', 'groceries', v_shop_id, 4),
    (p_user_id, 'Electronics', 'electronics', v_shop_id, 5),
    (p_user_id, 'Clothing & Accessories', 'clothing-accessories', v_shop_id, 6),
    (p_user_id, 'Fitness & Nutrition', 'fitness-nutrition-shopping', v_shop_id, 7),
    (p_user_id, 'Wishlist', 'wishlist', v_shop_id, 8),
    (p_user_id, 'Price Tracking', 'price-tracking', v_shop_id, 9),
    (p_user_id, 'Returns & Refunds', 'returns-refunds', v_shop_id, 10),
    (p_user_id, 'Warranties', 'warranties', v_shop_id, 11);

    -- 5. Learning & Career
    INSERT INTO pm_categories (user_id, name, slug, icon, color, sort_order)
    VALUES (p_user_id, 'Learning & Career', 'learning-career', 'GraduationCap', '#8B5CF6', 50)
    RETURNING id INTO v_learn_id;

    INSERT INTO pm_categories (user_id, name, slug, parent_id, sort_order) VALUES
    (p_user_id, 'Java', 'java', v_learn_id, 1),
    (p_user_id, 'Spring Boot & Microservices', 'spring-boot-microservices', v_learn_id, 2),
    (p_user_id, 'LeetCode & DSA', 'leetcode-dsa', v_learn_id, 3),
    (p_user_id, 'SAP Hybris', 'sap-hybris', v_learn_id, 4),
    (p_user_id, 'AI & LLM Research', 'ai-llm-research', v_learn_id, 5),
    (p_user_id, 'Courses & Tutorials', 'courses-tutorials', v_learn_id, 6),
    (p_user_id, 'Interview Preparation', 'interview-preparation', v_learn_id, 7),
    (p_user_id, 'Career Applications', 'career-applications', v_learn_id, 8);

    -- 6. Health & Fitness
    INSERT INTO pm_categories (user_id, name, slug, icon, color, sort_order)
    VALUES (p_user_id, 'Health & Fitness', 'health-fitness', 'Activity', '#EF4444', 60)
    RETURNING id INTO v_health_id;

    INSERT INTO pm_categories (user_id, name, slug, parent_id, sort_order) VALUES
    (p_user_id, 'Gym & Workouts', 'gym-workouts', v_health_id, 1),
    (p_user_id, 'Nutrition & Meal Planning', 'nutrition-meal-planning', v_health_id, 2),
    (p_user_id, 'Supplements', 'supplements', v_health_id, 3),
    (p_user_id, 'Medical Appointments', 'medical-appointments', v_health_id, 4),
    (p_user_id, 'Health Follow-ups', 'health-follow-ups', v_health_id, 5),
    (p_user_id, 'Dance & Physical Activities', 'dance-physical-activities', v_health_id, 6);

    -- 7. Personal Practice & Routine
    INSERT INTO pm_categories (user_id, name, slug, icon, color, sort_order)
    VALUES (p_user_id, 'Personal Practice & Routine', 'personal-practice-routine', 'Clock', '#06B6D4', 70)
    RETURNING id INTO v_routine_id;

    INSERT INTO pm_categories (user_id, name, slug, parent_id, sort_order) VALUES
    (p_user_id, 'Daily Practice', 'daily-practice', v_routine_id, 1),
    (p_user_id, 'Reading', 'reading', v_routine_id, 2),
    (p_user_id, 'Journaling & Reflection', 'journaling-reflection', v_routine_id, 3),
    (p_user_id, 'Recurring Routines', 'recurring-routines', v_routine_id, 4),
    (p_user_id, 'Personal Commitments', 'personal-commitments', v_routine_id, 5);

    -- 8. Content & Creativity
    INSERT INTO pm_categories (user_id, name, slug, icon, color, sort_order)
    VALUES (p_user_id, 'Content & Creativity', 'content-creativity', 'Sparkles', '#F97316', 80)
    RETURNING id INTO v_content_id;

    INSERT INTO pm_categories (user_id, name, slug, parent_id, sort_order) VALUES
    (p_user_id, 'Instagram Content', 'instagram-content', v_content_id, 1),
    (p_user_id, 'Reel Ideas & Scripts', 'reel-ideas-scripts', v_content_id, 2),
    (p_user_id, 'AI Image & Video Experiments', 'ai-image-video-experiments', v_content_id, 3),
    (p_user_id, 'Blog Ideas & Research', 'blog-ideas-research', v_content_id, 4),
    (p_user_id, 'Creative Experiments', 'creative-experiments', v_content_id, 5);

    -- 9. Travel & Experiences
    INSERT INTO pm_categories (user_id, name, slug, icon, color, sort_order)
    VALUES (p_user_id, 'Travel & Experiences', 'travel-experiences', 'Compass', '#14B8A6', 90)
    RETURNING id INTO v_travel_id;

    INSERT INTO pm_categories (user_id, name, slug, parent_id, sort_order) VALUES
    (p_user_id, 'Trip Planning', 'trip-planning', v_travel_id, 1),
    (p_user_id, 'Bookings & Reservations', 'bookings-reservations', v_travel_id, 2),
    (p_user_id, 'Packing Lists', 'packing-lists', v_travel_id, 3),
    (p_user_id, 'Treks & Outdoor Activities', 'treks-outdoor-activities', v_travel_id, 4),
    (p_user_id, 'Places to Visit', 'places-to-visit', v_travel_id, 5);

    -- 10. Ideas & Someday
    INSERT INTO pm_categories (user_id, name, slug, icon, color, sort_order)
    VALUES (p_user_id, 'Ideas & Someday', 'ideas-someday', 'Lightbulb', '#A855F7', 100)
    RETURNING id INTO v_ideas_id;

    INSERT INTO pm_categories (user_id, name, slug, parent_id, sort_order) VALUES
    (p_user_id, 'App Ideas', 'app-ideas', v_ideas_id, 1),
    (p_user_id, 'Business Ideas', 'business-ideas', v_ideas_id, 2),
    (p_user_id, 'Research Ideas', 'research-ideas', v_ideas_id, 3),
    (p_user_id, 'Future Purchases', 'future-purchases', v_ideas_id, 4),
    (p_user_id, 'Experiments to Try', 'experiments-to-try', v_ideas_id, 5);

    -- Default Projects modeled as database records
    INSERT INTO pm_projects (user_id, name, description, color, category_id, status)
    VALUES
    (p_user_id, 'Calflow', 'Calorie & Nutrition Tracking Platform', '#10B981', v_dev_id, 'ACTIVE'),
    (p_user_id, 'Rimev', 'EV Fleet & Battery Optimization System', '#3B82F6', v_dev_id, 'ACTIVE'),
    (p_user_id, 'Klay', 'Interactive Canvas & Modeling Tool', '#F59E0B', v_dev_id, 'ACTIVE'),
    (p_user_id, 'Personal Website', 'Portfolio, writing, and custom projects', '#8B5CF6', v_dev_id, 'ACTIVE');

END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 15. User initialization (Handled in application layer for multi-project isolation)
-- ------------------------------------------------------------------------------
-- NOTE: In a shared Supabase database (e.g. shared with Calflow / Instareels),
-- global triggers on `auth.users` must NOT be used because they fire on signups
-- for all sibling projects.
--
-- User profile creation (pm_profiles) and default category/project seeding
-- (pm_seed_user_defaults) are handled safely in the PerMan application layer
-- (see src/lib/services/profile.service.ts).
--
-- DROP TRIGGER IF EXISTS pm_on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS pm_handle_new_user();

-- ==============================================================================
-- End of PerMan Schema
-- ==============================================================================
