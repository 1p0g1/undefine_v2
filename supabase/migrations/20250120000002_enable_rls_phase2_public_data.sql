-- Migration: Enable RLS Phase 2 - Public Data Tables
-- Description: Enable RLS on tables that should be publicly readable
-- Author: AI Assistant
-- Date: 2025-01-20

-- =====================================================
-- PHASE 2: PUBLIC DATA TABLES (MEDIUM RISK)
-- These tables contain data that should be publicly readable
-- but may need write restrictions
-- =====================================================

-- 1. WORDS - Game content (should be publicly readable)
ALTER TABLE words ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read words (needed for game functionality)
CREATE POLICY "words_public_read" ON words
FOR SELECT TO anon, authenticated
USING (true);

-- Policy: Only service_role can write words
CREATE POLICY "words_service_role_write" ON words
FOR INSERT, UPDATE, DELETE TO service_role
USING (true)
WITH CHECK (true);

-- 2. DAILY_LEADERBOARD_SNAPSHOTS - Historical leaderboard data
ALTER TABLE daily_leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read snapshots (needed for leaderboards)
CREATE POLICY "snapshots_public_read" ON daily_leaderboard_snapshots
FOR SELECT TO anon, authenticated
USING (true);

-- Policy: Only service_role can write snapshots
CREATE POLICY "snapshots_service_role_write" ON daily_leaderboard_snapshots
FOR INSERT, UPDATE, DELETE TO service_role
USING (true)
WITH CHECK (true);

-- 3. LEADERBOARD_SUMMARY - Current rankings
ALTER TABLE leaderboard_summary ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read leaderboard (needed for public rankings)
CREATE POLICY "leaderboard_public_read" ON leaderboard_summary
FOR SELECT TO anon, authenticated
USING (true);

-- Policy: Only service_role can write leaderboard entries
CREATE POLICY "leaderboard_service_role_write" ON leaderboard_summary
FOR INSERT, UPDATE, DELETE TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('words', 'daily_leaderboard_snapshots', 'leaderboard_summary');

-- Check policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('words', 'daily_leaderboard_snapshots', 'leaderboard_summary');

-- =====================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- =====================================================

-- To disable RLS if there are issues:
-- ALTER TABLE words DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_leaderboard_snapshots DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE leaderboard_summary DISABLE ROW LEVEL SECURITY;

-- To drop policies:
-- DROP POLICY IF EXISTS "words_public_read" ON words;
-- DROP POLICY IF EXISTS "words_service_role_write" ON words;
-- DROP POLICY IF EXISTS "snapshots_public_read" ON daily_leaderboard_snapshots;
-- DROP POLICY IF EXISTS "snapshots_service_role_write" ON daily_leaderboard_snapshots;
-- DROP POLICY IF EXISTS "leaderboard_public_read" ON leaderboard_summary;
-- DROP POLICY IF EXISTS "leaderboard_service_role_write" ON leaderboard_summary;
