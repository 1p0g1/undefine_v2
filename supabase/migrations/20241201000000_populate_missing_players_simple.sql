-- Migration: 20241201000000_populate_missing_players_simple
-- Description: Populate missing players and basic leaderboard data
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

-- Simple leaderboard population - basic insert without conflicts
WITH ranked_scores AS (
  SELECT 
    s.player_id,
    s.word_id,
    ROW_NUMBER() OVER (
      PARTITION BY s.word_id
      ORDER BY s.score DESC, s.completion_time_seconds ASC
    ) as rank
  FROM scores s
  WHERE s.correct = true
    AND s.player_id IN (SELECT id FROM players)
)
INSERT INTO leaderboard_summary (
  player_id,
  word_id,
  rank,
  was_top_10
)
SELECT 
  player_id,
  word_id,
  rank,
  rank <= 10 as was_top_10
FROM ranked_scores; 