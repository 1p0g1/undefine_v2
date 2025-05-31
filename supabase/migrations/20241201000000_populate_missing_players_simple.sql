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
WHERE player_id NOT IN (SELECT id FROM players);

-- Then, ensure all players from game_sessions exist in players table
INSERT INTO players (id, is_anonymous)
SELECT DISTINCT
  player_id, 
  TRUE
FROM game_sessions
WHERE player_id NOT IN (SELECT id FROM players);

-- Finally, ensure all players from scores exist in players table
INSERT INTO players (id, is_anonymous)
SELECT DISTINCT
  player_id, 
  TRUE
FROM scores
WHERE player_id NOT IN (SELECT id FROM players);

-- Create user_stats entries for any missing players (required for leaderboard foreign key)
INSERT INTO user_stats (player_id, current_streak, longest_streak, best_rank, top_10_count)
SELECT 
  id,
  0,
  0,
  NULL,
  0
FROM players
WHERE id NOT IN (SELECT player_id FROM user_stats);

-- Populate leaderboard_summary from existing scores using CORRECT schema
WITH ranked_scores AS (
  SELECT 
    s.player_id,
    s.word_id,
    s.completion_time_seconds as best_time,
    s.guesses_used,
    CURRENT_DATE as date,
    ROW_NUMBER() OVER (
      PARTITION BY s.word_id
      ORDER BY s.completion_time_seconds ASC, s.guesses_used ASC
    ) as rank
  FROM scores s
  WHERE s.correct = true
    AND s.player_id IN (SELECT id FROM players)
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