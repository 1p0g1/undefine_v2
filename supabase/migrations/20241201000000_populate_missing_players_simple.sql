-- Migration: 20241201000000_populate_missing_players_simple
-- Description: Populate missing players and basic leaderboard data from existing scores
-- Author: Project Team
-- Date: 2024-12-01

-- First, ensure all players from user_stats exist in players table
INSERT INTO players (id, is_anonymous)
SELECT 
  player_id, 
  TRUE
FROM user_stats
WHERE player_id NOT IN (SELECT id FROM players)
ON CONFLICT (id) DO NOTHING;

-- Then, ensure all players from game_sessions exist in players table
INSERT INTO players (id, is_anonymous)
SELECT DISTINCT
  player_id, 
  TRUE
FROM game_sessions
WHERE player_id NOT IN (SELECT id FROM players)
ON CONFLICT (id) DO NOTHING;

-- Finally, ensure all players from scores exist in players table
INSERT INTO players (id, is_anonymous)
SELECT DISTINCT
  player_id, 
  TRUE
FROM scores
WHERE player_id NOT IN (SELECT id FROM players)
ON CONFLICT (id) DO NOTHING;

-- Create user_stats entries for any missing players (required for leaderboard foreign key)
-- Aligning with user_stats schema from docs/database_schema.md
INSERT INTO user_stats (
    player_id, 
    current_streak, 
    longest_streak, 
    best_rank, 
    top_10_count,
    average_completion_time,
    last_played_word
    -- Note: games_played, games_won, total_guesses, etc. are not in the INSERT 
    -- as they might not exist on the remote user_stats or are handled elsewhere.
    -- If these columns (like games_played from ERD) are missing from the remote table,
    -- a separate migration should add them first.
)
SELECT 
  id, -- player_id
  0,  -- current_streak
  0,  -- longest_streak
  NULL, -- best_rank
  0,  -- top_10_count
  NULL, -- average_completion_time
  NULL  -- last_played_word
FROM players
WHERE id NOT IN (SELECT player_id FROM user_stats)
ON CONFLICT (player_id) DO NOTHING;

-- Populate leaderboard_summary from existing scores using CORRECT schema
WITH ranked_scores AS (
  SELECT 
    s.player_id,
    s.word_id,
    s.completion_time_seconds as best_time,
    s.guesses_used,
    COALESCE(s.submitted_at::date, CURRENT_DATE) as date, -- Ensure date is populated
    ROW_NUMBER() OVER (
      PARTITION BY s.word_id
      ORDER BY s.completion_time_seconds ASC, s.guesses_used ASC
    ) as rank
  FROM scores s
  WHERE s.correct = true
    AND s.player_id IN (SELECT id FROM players) -- Ensure player exists for FK integrity
)
INSERT INTO leaderboard_summary (
  player_id,
  word_id,
  rank,
  was_top_10,
  best_time,
  guesses_used,
  date
)
SELECT 
  player_id,
  word_id,
  rank,
  rank <= 10 as was_top_10,
  best_time,
  guesses_used,
  date
FROM ranked_scores
WHERE NOT EXISTS (
  SELECT 1 FROM leaderboard_summary ls 
  WHERE ls.player_id = ranked_scores.player_id 
  AND ls.word_id = ranked_scores.word_id
); 