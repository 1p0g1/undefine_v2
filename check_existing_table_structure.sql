-- Check the actual structure of the existing daily_leaderboard_snapshots table
-- This will show us what columns exist vs what's missing

-- Show all columns in the existing table
SELECT 
    'EXISTING COLUMNS:' as info,
    '' as details
UNION ALL
SELECT 
    column_name as info,
    data_type || 
    CASE WHEN character_maximum_length IS NOT NULL THEN '(' || character_maximum_length || ')' ELSE '' END ||
    CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE ' NULL' END ||
    CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END as details
FROM information_schema.columns 
WHERE table_name = 'daily_leaderboard_snapshots' 
AND table_schema = 'public'
ORDER BY column_name;

-- Show all constraints on the table
SELECT 
    'EXISTING CONSTRAINTS:' as info,
    '' as details
UNION ALL
SELECT 
    constraint_name as info,
    constraint_type || ' on ' || STRING_AGG(column_name, ', ') as details
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'daily_leaderboard_snapshots'
AND tc.table_schema = 'public'
GROUP BY constraint_name, constraint_type;

-- Show all indexes on the table
SELECT 
    'EXISTING INDEXES:' as info,
    '' as details
UNION ALL
SELECT 
    indexname as info,
    indexdef as details
FROM pg_indexes 
WHERE tablename = 'daily_leaderboard_snapshots'
AND schemaname = 'public'; 