-- CORRECTED Beth's Streak Investigation
-- ID: 277b7094-7c6c-4644-bddf-5dd33e2fec9e
-- Uses ACTUAL database schema (verified from types.ts and migrations)

-- Step 1: Check streak data in BOTH possible tables
-- user_stats table (confirmed to exist)
SELECT 
  'user_stats streak data' as section,
  current_streak,
  longest_streak,  -- NOT best_streak!
  games_played,
  games_won,
  best_rank,
  top_10_count,
  average_completion_time,
  last_played_word
FROM user_stats 
WHERE player_id = '277b7094-7c6c-4644-bddf-5dd33e2fec9e';

-- player_streaks table (exists but missing from types.ts)
SELECT 
  'player_streaks data' as section,
  current_streak,
  highest_streak,  -- NOT best_streak!
  streak_start_date,
  last_win_date,
  updated_at
FROM player_streaks 
WHERE player_id = '277b7094-7c6c-4644-bddf-5dd33e2fec9e';

-- Step 2: Recent game history (last 20 games)
SELECT 
  'Recent Game History' as section,
  DATE(created_at) as game_date,
  is_won,
  guesses_used,
  score,  -- Added score column
  time_taken,  -- Added time_taken column
  created_at
FROM game_sessions 
WHERE player_id = '277b7094-7c6c-4644-bddf-5dd33e2fec9e'
ORDER BY created_at DESC
LIMIT 20;

-- Step 3: Check leaderboard_summary for wins (rank = 1)
SELECT 
  'Leaderboard Summary - Wins' as section,
  date,
  rank,
  was_top_10,
  best_time,
  guesses_used
FROM leaderboard_summary 
WHERE player_id = '277b7094-7c6c-4644-bddf-5dd33e2fec9e'
  AND rank = 1  -- Only wins
ORDER BY date DESC
LIMIT 15;

-- Step 4: Calculate consecutive wins manually from game_sessions
WITH recent_games AS (
  SELECT 
    DATE(created_at) as game_date,
    is_won,
    created_at,
    ROW_NUMBER() OVER (ORDER BY created_at DESC) as game_order
  FROM game_sessions 
  WHERE player_id = '277b7094-7c6c-4644-bddf-5dd33e2fec9e'
    AND DATE(created_at) >= CURRENT_DATE - INTERVAL '30 days'
  ORDER BY created_at DESC
),
streak_analysis AS (
  SELECT 
    game_date,
    is_won,
    game_order,
    created_at,
    -- Calculate running streak from most recent game
    CASE 
      WHEN is_won THEN 1 
      ELSE 0 
    END as win_flag,
    -- Find first loss to stop streak calculation
    MIN(CASE WHEN NOT is_won THEN game_order END) OVER () as first_loss_order
  FROM recent_games
)
SELECT 
  'Manual Streak Calculation' as section,
  game_date,
  is_won,
  game_order,
  win_flag,
  first_loss_order,
  -- Count consecutive wins from top until first loss
  CASE 
    WHEN game_order < COALESCE(first_loss_order, 999) AND is_won 
    THEN 'Counts toward current streak'
    WHEN game_order >= COALESCE(first_loss_order, 999)
    THEN 'After streak break'
    ELSE 'Loss - breaks streak'
  END as streak_status
FROM streak_analysis
ORDER BY game_order;

-- Step 5: Calculate what the current streak SHOULD be
WITH recent_games AS (
  SELECT 
    is_won,
    DATE(created_at) as game_date,
    ROW_NUMBER() OVER (ORDER BY created_at DESC) as game_order
  FROM game_sessions 
  WHERE player_id = '277b7094-7c6c-4644-bddf-5dd33e2fec9e'
    AND DATE(created_at) >= CURRENT_DATE - INTERVAL '30 days'
  ORDER BY created_at DESC
)
SELECT 
  'Calculated Current Streak' as section,
  COUNT(*) as calculated_streak,
  MIN(game_date) as streak_start_date,
  MAX(game_date) as last_win_date
FROM recent_games 
WHERE is_won = true 
  AND game_order < COALESCE(
    (SELECT MIN(game_order) FROM recent_games WHERE is_won = false), 
    999
  );

-- Step 6: Data consistency check across all tables
SELECT 
  'Data Consistency Check' as section,
  p.display_name as nickname,
  us.current_streak as user_stats_current,
  us.longest_streak as user_stats_longest,
  ps.current_streak as player_streaks_current,
  ps.highest_streak as player_streaks_highest,
  us.games_played,
  us.games_won,
  COUNT(gs.id) as total_game_sessions,
  COUNT(CASE WHEN gs.is_won THEN 1 END) as actual_wins,
  MAX(CASE WHEN gs.is_won THEN DATE(gs.created_at) END) as actual_last_win_date,
  ps.last_win_date as recorded_last_win_date
FROM players p
LEFT JOIN user_stats us ON p.id = us.player_id
LEFT JOIN player_streaks ps ON p.id = ps.player_id
LEFT JOIN game_sessions gs ON p.id = gs.player_id
WHERE p.id = '277b7094-7c6c-4644-bddf-5dd33e2fec9e'
GROUP BY 
  p.id, p.display_name, 
  us.current_streak, us.longest_streak, us.games_played, us.games_won,
  ps.current_streak, ps.highest_streak, ps.last_win_date;

-- Step 7: Check if there are trigger issues
SELECT 
  'Recent Trigger Activity' as section,
  trigger_name,
  table_name,
  operation,
  COUNT(*) as execution_count,
  MAX(created_at) as last_execution
FROM trigger_log 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND (
    trigger_name ILIKE '%streak%'
    OR table_name IN ('player_streaks', 'game_sessions', 'user_stats')
  )
GROUP BY trigger_name, table_name, operation
ORDER BY last_execution DESC; 