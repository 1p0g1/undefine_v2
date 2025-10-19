-- Migration: Enable RLS Phase 1 - System Tables Only
-- Description: Enable RLS on low-risk system tables that won't affect API functionality
-- Author: AI Assistant  
-- Date: 2025-01-20

-- =====================================================
-- PHASE 1: SYSTEM TABLES (LOW RISK)
-- These tables contain system internals and can be safely restricted
-- =====================================================

-- 1. TRIGGER_LOG - System logging table
-- Only service_role should access trigger logs
ALTER TABLE trigger_log ENABLE ROW LEVEL SECURITY;

-- Policy: Only service_role can access trigger logs
CREATE POLICY "trigger_log_service_role_only" ON trigger_log
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Block all other access
CREATE POLICY "trigger_log_block_others" ON trigger_log
FOR ALL TO anon, authenticated
USING (false)
WITH CHECK (false);

-- 2. SCHEMA_MIGRATIONS - Database migration tracking
-- Only service_role should access migration history
ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;

-- Policy: Only service_role can access schema migrations
CREATE POLICY "schema_migrations_service_role_only" ON schema_migrations
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Block all other access
CREATE POLICY "schema_migrations_block_others" ON schema_migrations
FOR ALL TO anon, authenticated
USING (false)
WITH CHECK (false);

-- =====================================================
-- VERIFICATION QUERIES
-- Run these to verify RLS is working correctly
-- =====================================================

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('trigger_log', 'schema_migrations');

-- Check policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('trigger_log', 'schema_migrations');

-- =====================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- =====================================================

-- To disable RLS if there are issues:
-- ALTER TABLE trigger_log DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE schema_migrations DISABLE ROW LEVEL SECURITY;

-- To drop policies:
-- DROP POLICY IF EXISTS "trigger_log_service_role_only" ON trigger_log;
-- DROP POLICY IF EXISTS "trigger_log_block_others" ON trigger_log;
-- DROP POLICY IF EXISTS "schema_migrations_service_role_only" ON schema_migrations;
-- DROP POLICY IF EXISTS "schema_migrations_block_others" ON schema_migrations;
