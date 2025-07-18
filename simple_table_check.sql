-- Simple check: Just show what columns exist in daily_leaderboard_snapshots table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'daily_leaderboard_snapshots' 
AND table_schema = 'public';

-- Even simpler: Just list the column names
SELECT column_name
FROM information_schema.columns 
WHERE table_name = 'daily_leaderboard_snapshots' 
AND table_schema = 'public'; 