-- WORKING Beth's Streak Investigation
-- Based on ACTUAL database schema from screenshots
-- ID: 277b7094-7c6c-4644-bddf-5dd33e2fec9e

-- Step 1: Check player_streaks data (confirmed working table)
SELECT 
  'Beth player_streaks data' as analysis,
  current_streak,
  highest_streak,
  streak_start_date,
  last_win_date,
  updated_at
FROM player_streaks 
WHERE player_id = '277b7094-7c6c-4644-bddf-5dd33e2fec9e';

-- Step 2: Check leaderboard_summary wins (confirmed working)
SELECT 
  'Beth leaderboard wins' as analysis,
  date,
  rank,
  was_top_10,
  best_time,
  guesses_used
FROM leaderboard_summary 
WHERE player_id = '277b7094-7c6c-4644-bddf-5dd33e2fec9e'
  AND rank = 1  -- Only wins
ORDER BY date DESC;

-- Step 3: Calculate consecutive wins from leaderboard_summary
WITH consecutive_wins AS (
  SELECT 
    date,
    rank,
    LAG(date) OVER (ORDER BY date) as prev_date,
    ROW_NUMBER() OVER (ORDER BY date DESC) as row_num
  FROM leaderboard_summary 
  WHERE player_id = '277b7094-7c6c-4644-bddf-5dd33e2fec9e'
    AND rank = 1
  ORDER BY date DESC
),
streak_breaks AS (
  SELECT 
    date,
    row_num,
    CASE 
      WHEN prev_date IS NULL THEN 0  -- First win
      WHEN date - prev_date = 1 THEN 0  -- Consecutive day
      ELSE 1  -- Gap in dates = streak break
    END as is_break
  FROM consecutive_wins
),
current_streak_calc AS (
  SELECT 
    COUNT(*) as calculated_current_streak,
    MIN(date) as streak_start,
    MAX(date) as streak_end
  FROM streak_breaks
  WHERE row_num <= (
    SELECT COALESCE(MIN(row_num), 999) 
    FROM streak_breaks 
    WHERE is_break = 1
  )
)
SELECT 
  'Calculated streak from leaderboard' as analysis,
  calculated_current_streak,
  streak_start,
  streak_end
FROM current_streak_calc;

-- Step 4: Check user_stats (expected to be empty)
SELECT 
  'Beth user_stats data' as analysis,
  current_streak,
  longest_streak,
  games_played,
  games_won,
  best_rank,
  top_10_count
FROM user_stats 
WHERE player_id = '277b7094-7c6c-4644-bddf-5dd33e2fec9e';

-- Step 5: Check game_sessions summary (no score/time_taken columns)
SELECT 
  'Beth game_sessions summary' as analysis,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN is_won THEN 1 END) as total_wins,
  MAX(created_at) as last_game,
  MIN(created_at) as first_game
FROM game_sessions 
WHERE player_id = '277b7094-7c6c-4644-bddf-5dd33e2fec9e';

-- Step 6: Recent game sessions (last 10)
SELECT 
  'Recent game sessions' as analysis,
  DATE(created_at) as game_date,
  is_won,
  is_complete,
  guesses_used,
  created_at
FROM game_sessions 
WHERE player_id = '277b7094-7c6c-4644-bddf-5dd33e2fec9e'
ORDER BY created_at DESC
LIMIT 10;

-- Step 7: Check for trigger issues by examining recent player_streaks updates
SELECT 
  'All recent player_streaks updates' as analysis,
  player_id,
  current_streak,
  highest_streak,
  last_win_date,
  updated_at
FROM player_streaks 
WHERE updated_at >= '2025-06-01'
ORDER BY updated_at DESC
LIMIT 10;

-- Step 8: Identify the discrepancy
SELECT 
  'Discrepancy analysis' as analysis,
  'leaderboard_summary shows 8 consecutive wins June 11-26' as leaderboard_data,
  'player_streaks shows current_streak = 1, last_win = June 11' as streak_data,
  'Trigger is not updating properly on consecutive wins' as conclusion; 