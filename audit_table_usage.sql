-- Database Table Usage Audit
-- Run this in Supabase SQL Editor to analyze table usage

-- Step 1: Table sizes and activity
SELECT 
  'Table Activity Analysis' as section,
  schemaname,
  tablename,
  n_tup_ins as total_inserts,
  n_tup_upd as total_updates,
  n_tup_del as total_deletes,
  n_live_tup as current_rows,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_analyze
FROM pg_stat_user_tables 
ORDER BY n_live_tup DESC;

-- Step 2: Check potentially redundant tables

-- Check leaderboard_summary usage
SELECT 
  'leaderboard_summary Analysis' as section,
  COUNT(*) as total_rows,
  MAX(updated_at) as last_updated,
  MIN(updated_at) as first_created
FROM leaderboard_summary;

-- Check daily_leaderboard_snapshots usage  
SELECT 
  'daily_leaderboard_snapshots Analysis' as section,
  COUNT(*) as total_snapshots,
  COUNT(DISTINCT snapshot_date) as unique_dates,
  MAX(snapshot_date) as latest_snapshot,
  MIN(snapshot_date) as earliest_snapshot
FROM daily_leaderboard_snapshots;

-- Check user_stats vs game_sessions comparison
SELECT 
  'user_stats vs game_sessions Comparison' as section,
  'user_stats' as source,
  COUNT(*) as player_count,
  COALESCE(AVG(games_played), 0) as avg_games_played,
  COALESCE(AVG(games_won), 0) as avg_games_won
FROM user_stats
UNION ALL
SELECT 
  'user_stats vs game_sessions Comparison' as section,
  'game_sessions_calculated' as source,
  COUNT(DISTINCT player_id) as player_count,
  AVG(game_count) as avg_games_played,
  AVG(wins) as avg_games_won
FROM (
  SELECT 
    player_id, 
    COUNT(*) as game_count,
    COUNT(CASE WHEN is_won THEN 1 END) as wins
  FROM game_sessions 
  GROUP BY player_id
) gs;

-- Check scores table usage
SELECT 
  'scores Table Analysis' as section,
  COUNT(*) as total_scores,
  MAX(created_at) as latest_score,
  MIN(created_at) as earliest_score,
  COUNT(DISTINCT player_id) as unique_players
FROM scores;

-- Check if scores duplicates game_sessions.score
SELECT 
  'scores vs game_sessions Score Comparison' as section,
  'scores_table' as source,
  COUNT(*) as record_count,
  AVG(score) as avg_score
FROM scores
UNION ALL
SELECT 
  'scores vs game_sessions Score Comparison' as section,
  'game_sessions_scores' as source,
  COUNT(*) as record_count,
  AVG(score) as avg_score
FROM game_sessions 
WHERE score IS NOT NULL;

-- Check trigger_log usage
SELECT 
  'trigger_log Analysis' as section,
  trigger_name,
  COUNT(*) as log_entries,
  MAX(created_at) as last_logged,
  MIN(created_at) as first_logged
FROM trigger_log 
GROUP BY trigger_name 
ORDER BY last_logged DESC;

-- Step 3: Check for unused or rarely used tables
SELECT 
  'Table Usage Summary' as section,
  tablename,
  n_live_tup as current_rows,
  CASE 
    WHEN n_live_tup = 0 THEN 'EMPTY - Consider removing'
    WHEN n_live_tup < 10 THEN 'Very low usage'
    WHEN n_live_tup < 100 THEN 'Low usage'
    WHEN n_live_tup < 1000 THEN 'Moderate usage'
    ELSE 'High usage'
  END as usage_level,
  CASE 
    WHEN last_vacuum IS NULL AND last_autovacuum IS NULL THEN 'Never accessed'
    WHEN GREATEST(last_vacuum, last_autovacuum) < CURRENT_DATE - INTERVAL '7 days' THEN 'Rarely accessed'
    WHEN GREATEST(last_vacuum, last_autovacuum) < CURRENT_DATE - INTERVAL '1 day' THEN 'Occasionally accessed'
    ELSE 'Recently accessed'
  END as access_pattern
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- Step 4: Identify core vs auxiliary tables
SELECT 
  'Table Classification' as section,
  tablename,
  n_live_tup as rows,
  CASE tablename
    WHEN 'players' THEN 'CORE - Player management'
    WHEN 'words' THEN 'CORE - Game content'  
    WHEN 'game_sessions' THEN 'CORE - Game records'
    WHEN 'player_streaks' THEN 'CORE - Player progress'
    WHEN 'theme_attempts' THEN 'CORE - Theme feature'
    WHEN 'leaderboard_summary' THEN 'AUXILIARY - May be redundant'
    WHEN 'daily_leaderboard_snapshots' THEN 'AUXILIARY - Historical data'
    WHEN 'user_stats' THEN 'AUXILIARY - May be redundant'
    WHEN 'scores' THEN 'AUXILIARY - May be redundant'
    WHEN 'trigger_log' THEN 'UTILITY - Debugging'
    WHEN 'schema_migrations' THEN 'UTILITY - System'
    ELSE 'UNKNOWN - Needs investigation'
  END as classification,
  CASE 
    WHEN tablename IN ('players', 'words', 'game_sessions', 'player_streaks', 'theme_attempts') 
    THEN 'KEEP'
    WHEN tablename IN ('leaderboard_summary', 'user_stats', 'scores')
    THEN 'AUDIT - Potentially redundant'
    WHEN tablename = 'schema_migrations'
    THEN 'KEEP - System table'
    ELSE 'REVIEW'
  END as recommendation
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY 
  CASE 
    WHEN tablename IN ('players', 'words', 'game_sessions', 'player_streaks', 'theme_attempts') THEN 1
    WHEN tablename = 'schema_migrations' THEN 2
    ELSE 3
  END,
  n_live_tup DESC; 