-- COMPREHENSIVE TRIGGER STATUS CHECK
-- Run this in Supabase SQL Editor to diagnose all trigger issues

-- 1. Check all triggers on leaderboard_summary table
SELECT 
  'leaderboard_summary triggers' as table_name,
  tgname as trigger_name,
  CASE 
    WHEN tgenabled = 'O' THEN 'ENABLED'
    WHEN tgenabled = 'D' THEN 'DISABLED' 
    ELSE 'UNKNOWN'
  END as status,
  tgtype,
  proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'leaderboard_summary'
AND NOT tgisinternal;

-- 2. Check player_streaks table existence and structure
SELECT 
  'player_streaks table' as check_name,
  COUNT(*) as record_count,
  MAX(updated_at) as last_update
FROM player_streaks;

-- 3. Check if streak functions exist
SELECT 
  'streak functions' as check_name,
  proname as function_name,
  pronargs as arg_count
FROM pg_proc 
WHERE proname LIKE '%streak%' 
OR proname LIKE '%player_streak%';

-- 4. Check recent leaderboard_summary records
SELECT 
  'recent leaderboard entries' as check_name,
  COUNT(*) as count_last_7_days,
  MAX(date) as latest_date
FROM leaderboard_summary 
WHERE date >= CURRENT_DATE - INTERVAL '7 days';

-- 5. Check if all-time leaderboard view/table exists
SELECT 
  'all_time_leaderboard check' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'all_time_leaderboard') 
    THEN 'TABLE EXISTS'
    WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'all_time_leaderboard')
    THEN 'VIEW EXISTS'
    ELSE 'NOT FOUND'
  END as status;

-- 6. Test a specific player's streak data
SELECT 
  'player streak data' as check_name,
  player_id,
  current_streak,
  highest_streak,
  last_win_date,
  updated_at
FROM player_streaks 
WHERE current_streak > 0 
OR highest_streak > 0
LIMIT 5; 