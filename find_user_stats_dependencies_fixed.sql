-- Find all views that depend on user_stats table
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE definition ILIKE '%user_stats%';

-- Check for functions that reference user_stats
SELECT 
    n.nspname as schema,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) ILIKE '%user_stats%';

-- Check for triggers that might reference user_stats
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    pg_get_triggerdef(t.oid) as definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE pg_get_triggerdef(t.oid) ILIKE '%user_stats%';

-- Check for RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    definition
FROM pg_policies
WHERE definition ILIKE '%user_stats%';
