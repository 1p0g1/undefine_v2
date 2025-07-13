-- Check what triggers exist for leaderboard system
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname IN ('game_sessions', 'leaderboard_summary')
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- Check what functions exist for leaderboard system  
SELECT 
    p.proname as function_name,
    p.pronargs as arg_count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE '%leaderboard%'
ORDER BY p.proname;
