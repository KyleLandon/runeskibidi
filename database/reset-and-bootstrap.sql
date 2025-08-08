-- =============================================
-- RUNESKIBIDI - Full Reset and Bootstrap to Minimal Core Schema
-- WARNING: This DROPS ALL public tables owned by the app (game data)
-- Run in Supabase SQL editor. Ensure you have backups.
-- =============================================

-- 0) Safety: require confirmation variable (optional)
-- DO $$ BEGIN
--   IF current_setting('app.allow_reset', true) IS DISTINCT FROM 'on' THEN
--     RAISE EXCEPTION 'Set app.allow_reset to on to proceed';
--   END IF;
-- END $$;

-- 1) Drop realtime publication entries (avoid dependency errors)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname='supabase_realtime' LOOP
    BEGIN
      -- Some Postgres versions don't support IF EXISTS here; also qualify with schema
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE %I.%I', r.schemaname, r.tablename);
    EXCEPTION WHEN OTHERS THEN
      -- Ignore if already removed or not applicable
      NULL;
    END;
  END LOOP;
END$$;

-- 2) Drop known tables in dependency order
DROP TABLE IF EXISTS character_equipment CASCADE;
DROP TABLE IF EXISTS character_inventory CASCADE;
DROP TABLE IF EXISTS character_skills CASCADE;
DROP TABLE IF EXISTS characters CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS skills CASCADE;
DROP TABLE IF EXISTS players CASCADE;

-- 3) Drop legacy/optional tables if present
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS player_skills CASCADE;
DROP TABLE IF EXISTS hotbar_slots CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS guild_members CASCADE;
DROP TABLE IF EXISTS guilds CASCADE;
DROP TABLE IF EXISTS world_objects CASCADE;
DROP TABLE IF EXISTS zones CASCADE;
DROP TABLE IF EXISTS npcs CASCADE;
DROP TABLE IF EXISTS monsters CASCADE;
DROP TABLE IF EXISTS auctions CASCADE;
DROP TABLE IF EXISTS bank_accounts CASCADE;
DROP TABLE IF EXISTS loot_tables CASCADE;
DROP TABLE IF EXISTS crafting_recipes CASCADE;
DROP TABLE IF EXISTS quests CASCADE;

-- 4) Drop triggers and helper functions if exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS check_character_limit();

-- 5) Recreate the minimal core schema
-- NOTE: Supabase SQL editor does not support psql meta-commands like \i
-- After running this reset script, run the contents of schema-minimal.sql in a new query

-- 6) Re-enable realtime publications for new tables
SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname='supabase_realtime' ORDER BY tablename;

-- Done
SELECT 'Database reset and minimal schema bootstrapped.' AS status;

