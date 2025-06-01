-- Part 1: Add score fields to scores table
ALTER TABLE scores
ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_score INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN IF NOT EXISTS guess_penalty INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS time_penalty INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS hint_penalty INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS correct BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for score ordering
CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);

-- Create or update leaderboard_summary table
-- WARNING: The schema defined here for leaderboard_summary is outdated compared to the ERD.
-- Later migrations (e.g., 20240530000002_fix_leaderboard_summary.sql and 20241201000005_align_leaderboard_schema.sql)
-- are expected to correctly define or align it. This CREATE TABLE is IF NOT EXISTS for safety.
CREATE TABLE IF NOT EXISTS leaderboard_summary (
  player_id TEXT NOT NULL,
  word_id UUID NOT NULL,
  score INTEGER NOT NULL DEFAULT 0, -- This column is not in the final ERD for leaderboard_summary
  completion_time_seconds INTEGER NOT NULL DEFAULT 0, -- This column is not in the final ERD for leaderboard_summary
  PRIMARY KEY (player_id, word_id)
);

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