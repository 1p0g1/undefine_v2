-- Check for database triggers that might reference user_stats
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE NOT t.tgisinternal
  AND pg_get_triggerdef(t.oid) ILIKE '%user_stats%';

-- Check for functions that might reference user_stats
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) ILIKE '%user_stats%';

-- Check for views that might reference user_stats
SELECT 
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public'
  AND definition ILIKE '%user_stats%';
