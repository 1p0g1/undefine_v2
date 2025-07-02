-- Check Streak Tracking Triggers and Functions
-- Run this in Supabase SQL Editor

-- Step 1: Find all triggers on relevant tables
SELECT 
  'Trigger Analysis' as section,
  n.nspname as schema_name,
  c.relname as table_name,
  t.tgname as trigger_name,
  CASE t.tgtype & 66
    WHEN 2 THEN 'BEFORE'
    WHEN 64 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END as trigger_timing,
  CASE t.tgtype & 28
    WHEN 4 THEN 'INSERT'
    WHEN 8 THEN 'DELETE'
    WHEN 16 THEN 'UPDATE'
    WHEN 12 THEN 'INSERT OR DELETE'
    WHEN 20 THEN 'INSERT OR UPDATE'
    WHEN 24 THEN 'DELETE OR UPDATE'
    WHEN 28 THEN 'INSERT OR DELETE OR UPDATE'
  END as trigger_events,
  p.proname as function_name,
  t.tgenabled as enabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname IN ('game_sessions', 'player_streaks', 'players')
  AND n.nspname = 'public'
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- Step 2: Get function definitions for streak-related functions
SELECT 
  'Function Definitions' as section,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    p.proname ILIKE '%streak%' 
    OR p.proname ILIKE '%leaderboard%'
    OR p.proname ILIKE '%game_session%'
  )
ORDER BY p.proname;

-- Step 3: Check for any views related to streaks
SELECT 
  'Streak-Related Views' as section,
  schemaname,
  viewname,
  definition
FROM pg_views 
WHERE schemaname = 'public'
  AND (
    viewname ILIKE '%streak%'
    OR viewname ILIKE '%leaderboard%'
    OR definition ILIKE '%streak%'
  );

-- Step 4: Look for any stored procedures or functions that update streaks
SELECT 
  'Streak Update Functions' as section,
  p.proname as function_name,
  p.pronargs as arg_count,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) ILIKE '%player_streaks%'
ORDER BY p.proname;

-- Step 5: Check recent trigger log entries for streak updates
SELECT 
  'Recent Trigger Activity' as section,
  trigger_name,
  table_name,
  operation,
  COUNT(*) as execution_count,
  MAX(created_at) as last_execution,
  MIN(created_at) as first_execution
FROM trigger_log 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND (
    trigger_name ILIKE '%streak%'
    OR table_name IN ('player_streaks', 'game_sessions')
  )
GROUP BY trigger_name, table_name, operation
ORDER BY last_execution DESC; 