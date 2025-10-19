-- Migration: Enable RLS Phase 3 - Player Data (CAREFUL!)
-- Description: Enable RLS on player-specific tables
-- WARNING: This phase requires careful testing as it affects core game functionality
-- Author: AI Assistant
-- Date: 2025-01-20

-- =====================================================
-- PHASE 3: PLAYER DATA TABLES (HIGH RISK)
-- These tables contain player-specific data and need careful RLS policies
-- Current system uses anonymous UUIDs, not Supabase auth
-- =====================================================

-- IMPORTANT NOTE:
-- Your current system uses anonymous player UUIDs stored in localStorage
-- This makes traditional RLS (based on auth.uid()) challenging
-- We need custom policies that work with your UUID-based system

-- 1. PLAYERS - Player information
-- For now, we'll make this publicly readable but service_role writable
-- TODO: Implement proper player-specific access when auth system is ready
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read player info (needed for leaderboards, nicknames)
CREATE POLICY "players_public_read" ON players
FOR SELECT TO anon, authenticated
USING (true);

-- Policy: Only service_role can write player data
CREATE POLICY "players_service_role_write" ON players
FOR INSERT, UPDATE, DELETE TO service_role
USING (true)
WITH CHECK (true);

-- 2. GAME_SESSIONS - Individual game records
-- This is tricky because APIs need cross-player access for leaderboards
-- For now, keep it publicly readable but service_role writable
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read game sessions (needed for leaderboards)
CREATE POLICY "game_sessions_public_read" ON game_sessions
FOR SELECT TO anon, authenticated
USING (true);

-- Policy: Only service_role can write game sessions
CREATE POLICY "game_sessions_service_role_write" ON game_sessions
FOR INSERT, UPDATE, DELETE TO service_role
USING (true)
WITH CHECK (true);

-- 3. PLAYER_STREAKS - Player streak data
-- Similar approach - public read, service_role write
ALTER TABLE player_streaks ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read streaks (needed for leaderboards)
CREATE POLICY "player_streaks_public_read" ON player_streaks
FOR SELECT TO anon, authenticated
USING (true);

-- Policy: Only service_role can write streaks
CREATE POLICY "player_streaks_service_role_write" ON player_streaks
FOR INSERT, UPDATE, DELETE TO service_role
USING (true)
WITH CHECK (true);

-- 4. SCORES - Player scoring data
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read scores (needed for leaderboards)
CREATE POLICY "scores_public_read" ON scores
FOR SELECT TO anon, authenticated
USING (true);

-- Policy: Only service_role can write scores
CREATE POLICY "scores_service_role_write" ON scores
FOR INSERT, UPDATE, DELETE TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- FUTURE ENHANCEMENT NOTES
-- =====================================================

-- When you're ready to implement proper player-specific access:
-- 
-- Option 1: Implement Supabase Auth
-- - Add auth.users integration
-- - Map player UUIDs to auth.uid()
-- - Use policies like: USING (player_id = auth.uid()::text)
--
-- Option 2: Custom JWT system
-- - Implement custom JWT tokens with player_id claims
-- - Use policies like: USING (player_id = (current_setting('request.jwt.claims'))::json->>'player_id')
--
-- Option 3: API-level filtering
-- - Keep current public read access
-- - Implement filtering in API layer
-- - More flexible but less secure

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('players', 'game_sessions', 'player_streaks', 'scores');

-- Check policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('players', 'game_sessions', 'player_streaks', 'scores');

-- =====================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- =====================================================

-- To disable RLS if there are issues:
-- ALTER TABLE players DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE game_sessions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE player_streaks DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE scores DISABLE ROW LEVEL SECURITY;

-- To drop policies:
-- DROP POLICY IF EXISTS "players_public_read" ON players;
-- DROP POLICY IF EXISTS "players_service_role_write" ON players;
-- DROP POLICY IF EXISTS "game_sessions_public_read" ON game_sessions;
-- DROP POLICY IF EXISTS "game_sessions_service_role_write" ON game_sessions;
-- DROP POLICY IF EXISTS "player_streaks_public_read" ON player_streaks;
-- DROP POLICY IF EXISTS "player_streaks_service_role_write" ON player_streaks;
-- DROP POLICY IF EXISTS "scores_public_read" ON scores;
-- DROP POLICY IF EXISTS "scores_service_role_write" ON scores;
