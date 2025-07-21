-- Simple Trigger Check (No Complex Syntax)
-- Purpose: Basic check of existing triggers without fancy formatting

-- Step 1: All triggers on leaderboard_summary
SELECT 
  'LEADERBOARD TRIGGERS' as check_type,
  t.tgname as trigger_name,
  t.tgenabled as enabled_status,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'leaderboard_summary'
  AND NOT t.tgisinternal;

-- Step 2: All streak-related functions
SELECT 
  'STREAK FUNCTIONS' as check_type,
  p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname ILIKE '%streak%';

-- Step 3: All triggers with streak in name
SELECT 
  'STREAK TRIGGERS' as check_type,
  c.relname as table_name,
  t.tgname as trigger_name,
  t.tgenabled as enabled_status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE t.tgname ILIKE '%streak%'
  AND NOT t.tgisinternal;

-- Step 4: Count triggers on leaderboard_summary
SELECT 
  'TRIGGER COUNT' as check_type,
  COUNT(*) as total_count
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'leaderboard_summary'
  AND NOT t.tgisinternal; 