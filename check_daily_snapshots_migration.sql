-- Daily Snapshots Migration Status Check
-- Run this to verify if the migration has already been applied

-- Check if daily_leaderboard_snapshots table exists
SELECT 
    'daily_leaderboard_snapshots table' as component,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'daily_leaderboard_snapshots' 
            AND table_schema = 'public'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
UNION ALL

-- Check if snapshot_date column exists with proper type
SELECT 
    'snapshot_date column (DATE)' as component,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'daily_leaderboard_snapshots' 
            AND column_name = 'snapshot_date'
            AND data_type = 'date'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
UNION ALL

-- Check if player_id column exists
SELECT 
    'player_id column' as component,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'daily_leaderboard_snapshots' 
            AND column_name = 'player_id'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
UNION ALL

-- Check if finalize_daily_leaderboard function exists
SELECT 
    'finalize_daily_leaderboard() function' as component,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'finalize_daily_leaderboard'
            AND routine_schema = 'public'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
UNION ALL

-- Check if get_historical_leaderboard function exists
SELECT 
    'get_historical_leaderboard() function' as component,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'get_historical_leaderboard'
            AND routine_schema = 'public'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
UNION ALL

-- Check if unique constraint exists on daily_leaderboard_snapshots
SELECT 
    'unique constraint (snapshot_date, player_id)' as component,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'daily_leaderboard_snapshots'
            AND tc.constraint_type = 'UNIQUE'
            AND kcu.column_name IN ('snapshot_date', 'player_id')
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
UNION ALL

-- Check if index exists on snapshot_date
SELECT 
    'index on snapshot_date' as component,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'daily_leaderboard_snapshots'
            AND indexname LIKE '%snapshot_date%'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- Additional detailed check: Show table structure if it exists
SELECT 
    '\n--- TABLE STRUCTURE (if exists) ---' as info,
    '' as details
UNION ALL
SELECT 
    'Column: ' || column_name as info,
    'Type: ' || data_type || 
    CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
    CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END as details
FROM information_schema.columns 
WHERE table_name = 'daily_leaderboard_snapshots' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show any existing data in the table
SELECT 
    '\n--- EXISTING DATA COUNT ---' as info,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'daily_leaderboard_snapshots'
        ) THEN 
            'Total records: ' || (
                SELECT COUNT(*)::text FROM daily_leaderboard_snapshots
            )
        ELSE 'Table does not exist'
    END as details; 