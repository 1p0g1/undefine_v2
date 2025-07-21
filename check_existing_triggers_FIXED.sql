-- Check All Existing Triggers Before Making Changes (FIXED)
-- Purpose: Identify potential conflicts or duplicates before enabling trigger

-- Step 1: Check ALL triggers on leaderboard_summary table
SELECT 
  '1. ALL LEADERBOARD_SUMMARY TRIGGERS' as section,
  t.tgname as trigger_name,
  CASE t.tgtype & 66
    WHEN 2 THEN 'BEFORE'
    WHEN 64 THEN 'INSTEAD OF'  
    ELSE 'AFTER'
  END as timing,
  CASE t.tgtype & 28
    WHEN 4 THEN 'INSERT'
    WHEN 8 THEN 'DELETE'
    WHEN 16 THEN 'UPDATE'
    WHEN 12 THEN 'INSERT OR DELETE'
    WHEN 20 THEN 'INSERT OR UPDATE'
    WHEN 24 THEN 'DELETE OR UPDATE'
    WHEN 28 THEN 'INSERT OR DELETE OR UPDATE'
  END as events,
  CASE t.tgenabled
    WHEN 'O' THEN 'Enabled'
    WHEN 'D' THEN 'Disabled'
    WHEN 'A' THEN 'Always'
    WHEN 'R' THEN 'Replica'
    ELSE 'Unknown'
  END as status,
  t.tgenabled as raw_status,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'leaderboard_summary'
  AND NOT t.tgisinternal
ORDER BY t.tgname;

-- Step 2: Check for any streak-related triggers on OTHER tables
SELECT 
  '2. ALL STREAK-RELATED TRIGGERS' as section,
  c.relname as table_name,
  t.tgname as trigger_name,
  CASE t.tgenabled
    WHEN 'O' THEN 'Enabled'
    WHEN 'D' THEN 'Disabled'
    WHEN 'A' THEN 'Always'
    ELSE 'Other'
  END as status,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE (
  t.tgname ILIKE '%streak%' 
  OR p.proname ILIKE '%streak%'
  OR p.proname ILIKE '%leaderboard%'
)
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- Step 3: Check for functions that might be called by multiple triggers
SELECT 
  '3. STREAK FUNCTION DEFINITIONS' as section,
  p.proname as function_name,
  p.pronargs as arg_count,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    p.proname ILIKE '%streak%' 
    OR p.proname ILIKE '%leaderboard%'
    OR p.proname ILIKE '%update_player%'
  )
ORDER BY p.proname;

-- Step 4: Simple trigger count check
SELECT 
  '4. TRIGGER COUNT SUMMARY' as section,
  COUNT(*) as total_triggers_on_leaderboard_summary
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'leaderboard_summary'
  AND NOT t.tgisinternal; 