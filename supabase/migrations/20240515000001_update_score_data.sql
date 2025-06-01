-- Update existing scores with calculated values
UPDATE scores
SET score = 
  CASE 
    WHEN correct THEN 
      GREATEST(
        0,
        1000 - 
        ((guesses_used - 1) * 100) - 
        (FLOOR(completion_time_seconds / 10) * 10) -
        (CASE WHEN used_hint THEN 200 ELSE 0 END)
      )
    ELSE 0
  END,
  base_score = 1000,
  guess_penalty = CASE WHEN correct THEN (guesses_used - 1) * 100 ELSE 0 END,
  time_penalty = CASE WHEN correct THEN FLOOR(completion_time_seconds / 10) * 10 ELSE 0 END,
  hint_penalty = CASE WHEN correct AND used_hint THEN 200 ELSE 0 END;

-- WARNING: The following index creation on leaderboard_summary(score) is REMOVED
-- because the 'score' column is not part of the final ERD-aligned 'leaderboard_summary' table
-- and likely does not exist on the remote if later migrations have run or schema is ERD-aligned.
-- CREATE INDEX IF NOT EXISTS idx_leaderboard_summary_score ON leaderboard_summary(score DESC);

-- WARNING: The following INSERT into leaderboard_summary is REMOVED.
-- It attempts to populate columns (score, completion_time_seconds) that are not in the
-- final ERD-aligned 'leaderboard_summary' table.
-- Correct population is handled by triggers (20240601000001_fix_leaderboard_data_flow.sql)
-- and backfill migrations (20241201000000_populate_missing_players_simple.sql)
-- using the ERD-correct schema (best_time, guesses_used, date).
-- INSERT INTO leaderboard_summary (player_id, word_id, score, completion_time_seconds)
-- SELECT 
--   s.player_id,
--   s.word_id,
--   s.score,
--   s.completion_time_seconds
-- FROM scores s
-- WHERE s.correct = true
-- ON CONFLICT (player_id, word_id) 
-- DO UPDATE SET 
--   score = EXCLUDED.score,
--   completion_time_seconds = EXCLUDED.completion_time_seconds; 