-- Beth's Streak Investigation
-- ID: 277b7094-7c6c-4644-bddf-5dd33e2fec9e
-- Run this in Supabase SQL Editor

-- Step 1: Current streak record
SELECT 
  'Current Streak Record' as section,
  current_streak,
  best_streak,
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
  time_taken,
  score,
  created_at
FROM game_sessions 
WHERE player_id = '277b7094-7c6c-4644-bddf-5dd33e2fec9e'
ORDER BY created_at DESC
LIMIT 20;

-- Step 3: Calculate consecutive wins manually
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
  'Streak Calculation Analysis' as section,
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

-- Step 4: Summary calculation
WITH recent_games AS (
  SELECT 
    is_won,
    ROW_NUMBER() OVER (ORDER BY created_at DESC) as game_order
  FROM game_sessions 
  WHERE player_id = '277b7094-7c6c-4644-bddf-5dd33e2fec9e'
    AND DATE(created_at) >= CURRENT_DATE - INTERVAL '30 days'
  ORDER BY created_at DESC
)
SELECT 
  'Calculated Current Streak' as section,
  COUNT(*) as calculated_streak
FROM recent_games 
WHERE is_won = true 
  AND game_order < COALESCE(
    (SELECT MIN(game_order) FROM recent_games WHERE is_won = false), 
    999
  );

-- Step 5: Check for data inconsistencies
SELECT 
  'Data Consistency Check' as section,
  p.nickname,
  ps.current_streak as recorded_streak,
  ps.best_streak,
  ps.last_win_date as recorded_last_win,
  COUNT(CASE WHEN gs.is_won THEN 1 END) as total_wins,
  MAX(CASE WHEN gs.is_won THEN DATE(gs.created_at) END) as actual_last_win_date,
  COUNT(gs.id) as total_games,
  ROUND(COUNT(CASE WHEN gs.is_won THEN 1 END)::float / COUNT(gs.id) * 100, 1) as win_percentage
FROM players p
LEFT JOIN player_streaks ps ON p.id = ps.player_id
LEFT JOIN game_sessions gs ON p.id = gs.player_id
WHERE p.id = '277b7094-7c6c-4644-bddf-5dd33e2fec9e'
GROUP BY p.id, p.nickname, ps.current_streak, ps.best_streak, ps.last_win_date; 