-- Migration: 20230515143001_update_leaderboard_ranking
-- Description: Update leaderboard ranking rules to include hint usage as a tiebreaker
-- Author: Project Team
-- Date: 2023-05-15

-- Up migration
-- Create a function to get the leaderboard for a specific word
CREATE OR REPLACE FUNCTION get_leaderboard_for_word(word_id UUID, limit_count INT DEFAULT 100)
RETURNS TABLE (
  player_id TEXT,
  rank INT,
  guesses_used INT,
  completion_time_seconds INT,
  used_hint BOOLEAN,
  submitted_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_scores AS (
    SELECT 
      s.player_id,
      s.guesses_used,
      s.completion_time_seconds,
      s.used_hint,
      s.submitted_at,
      ROW_NUMBER() OVER (
        ORDER BY 
          s.completion_time_seconds ASC,
          s.used_hint ASC
      ) AS rank
    FROM scores s
    WHERE s.word_id = get_leaderboard_for_word.word_id
  )
  SELECT 
    r.player_id,
    r.rank,
    r.guesses_used,
    r.completion_time_seconds,
    r.used_hint,
    r.submitted_at
  FROM ranked_scores r
  WHERE r.rank <= limit_count
  ORDER BY r.rank ASC;
END;
$$ LANGUAGE plpgsql;

-- Down migration
-- Revert to the original leaderboard function
CREATE OR REPLACE FUNCTION get_leaderboard_for_word(word_id UUID, limit_count INT DEFAULT 100)
RETURNS TABLE (
  player_id TEXT,
  rank INT,
  guesses_used INT,
  completion_time_seconds INT,
  submitted_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_scores AS (
    SELECT 
      s.player_id,
      s.guesses_used,
      s.completion_time_seconds,
      s.submitted_at,
      ROW_NUMBER() OVER (
        ORDER BY s.completion_time_seconds ASC
      ) AS rank
    FROM scores s
    WHERE s.word_id = get_leaderboard_for_word.word_id
  )
  SELECT 
    r.player_id,
    r.rank,
    r.guesses_used,
    r.completion_time_seconds,
    r.submitted_at
  FROM ranked_scores r
  WHERE r.rank <= limit_count
  ORDER BY r.rank ASC;
END;
$$ LANGUAGE plpgsql; 