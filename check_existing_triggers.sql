-- Check All Existing Triggers Before Making Changes
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
    WHEN 'O' THEN '✅ Enabled'
    WHEN 'D' THEN '❌ Disabled'
    WHEN 'A' THEN '✅ Always Enabled'
    WHEN 'R' THEN '🔄 Replica Only'
    ELSE '❓ Unknown (' || t.tgenabled || ')'
  END as status,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_code
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
    WHEN 'O' THEN '✅ Enabled'
    WHEN 'D' THEN '❌ Disabled'
    WHEN 'A' THEN '✅ Always'
    ELSE '❓ ' || t.tgenabled
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
  pg_get_function_arguments(p.oid) as arguments,
  -- Show first 200 chars of function definition
  LEFT(pg_get_functiondef(p.oid), 200) || '...' as function_preview
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    p.proname ILIKE '%streak%' 
    OR p.proname ILIKE '%leaderboard%'
    OR p.proname ILIKE '%update_player%'
  )
ORDER BY p.proname;

-- Step 4: Check trigger execution history (if trigger_log exists)
SELECT 
  '4. RECENT TRIGGER EXECUTION LOG' as section,
  trigger_name,
  table_name,
  operation,
  COUNT(*) as execution_count,
  MAX(executed_at) as last_execution,
  MIN(executed_at) as first_execution
FROM trigger_log 
WHERE executed_at >= CURRENT_DATE - INTERVAL '7 days'
  AND (
    trigger_name ILIKE '%streak%'
    OR trigger_name ILIKE '%leaderboard%'
  )
GROUP BY trigger_name, table_name, operation
ORDER BY last_execution DESC;

-- Step 5: Summary recommendation
SELECT 
  '5. SAFETY CHECK SUMMARY' as section,
  'Check results above before enabling any triggers' as recommendation,
  'Look for duplicate functions or conflicting triggers' as warning,
  'Verify no other streak triggers exist' as validation; 