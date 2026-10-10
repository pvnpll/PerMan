-- ==============================================================================
-- PerMang: Seed existing auth.users (if any) with profiles & default categories
-- ==============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id, email, raw_user_meta_data FROM auth.users LOOP
        INSERT INTO pm_profiles (id, email, full_name, timezone)
        VALUES (
            r.id,
            r.email,
            COALESCE(r.raw_user_meta_data->>'full_name', r.email),
            COALESCE(r.raw_user_meta_data->>'timezone', 'Asia/Kolkata')
        )
        ON CONFLICT (id) DO NOTHING;

        PERFORM pm_seed_user_defaults(r.id);
    END LOOP;
END;
$$ LANGUAGE plpgsql;
