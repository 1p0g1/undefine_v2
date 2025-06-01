-- Migration: 20240530000002_fix_leaderboard_summary
-- Original Description: Fix leaderboard summary structure and add ranking trigger
-- MODIFIED: Removed DROP TABLE CASCADE. CREATE TABLE is IF NOT EXISTS.
-- Functions and triggers here use a schema (score, completion_time_seconds)
-- that might be outdated. Later migrations should align these.

-- Recreate leaderboard_summary table with correct structure IF IT DOESN'T EXIST
-- WARNING: This schema still contains 'score' and 'completion_time_seconds'
-- and a FK to players(id) which differs from the final ERD.
-- Migration 20241201000005_align_leaderboard_schema.sql is expected to correct these.
CREATE TABLE IF NOT EXISTS leaderboard_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id TEXT NOT NULL, -- FK to players(id) originally, ERD wants user_stats(player_id)
  word_id UUID NOT NULL REFERENCES words(id),
  rank INTEGER, -- Made nullable, was NOT NULL
  was_top_10 BOOLEAN DEFAULT FALSE,
  score INTEGER, -- Was NOT NULL, not in ERD. Will be removed by 20241201000005_align_leaderboard_schema.sql if this table is newly created.
  completion_time_seconds INTEGER, -- Was NOT NULL, ERD uses best_time. Will be removed by 20241201000005_align_leaderboard_schema.sql.
  guesses_used INTEGER, -- Made nullable, was NOT NULL
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- ERD uses date DATE. Will be removed by 20241201000005_align_leaderboard_schema.sql.
  UNIQUE(player_id, word_id) -- This unique constraint might be fine
);

-- Ensure foreign key for player_id points to players(id) IF this table is newly created by this script.
-- Later migration 20241201000005_align_leaderboard_schema.sql will fix it to user_stats(player_id).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leaderboard_summary') AND
     NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'leaderboard_summary' AND constraint_name = 'leaderboard_summary_player_id_fkey_temp'
    ) AND
    EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'leaderboard_summary' AND column_name = 'player_id'
    ) AND
    EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'players'
    )
  THEN
    ALTER TABLE leaderboard_summary 
    ADD CONSTRAINT leaderboard_summary_player_id_fkey_temp 
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;


-- Create indices for performance (use IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_leaderboard_summary_player_id ON leaderboard_summary(player_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_summary_word_id ON leaderboard_summary(word_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_summary_rank ON leaderboard_summary(rank);
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
-- Populate leaderboard_summary from scores table (original logic)
-- WITH ranked_scores AS (
--   SELECT 
--     s.player_id,
--     s.word_id,
--     s.guesses_used,
--     s.completion_time_seconds,
--     s.score,
--     ROW_NUMBER() OVER (
--       PARTITION BY s.word_id
--       ORDER BY s.score DESC, s.completion_time_seconds ASC
--     ) as rank
--   FROM scores s
--   WHERE s.correct = true
-- )
-- INSERT INTO leaderboard_summary (
--   player_id,
--   word_id,
--   rank,
--   was_top_10,
--   score,
--   completion_time_seconds,
--   guesses_used
-- )
-- SELECT 
--   player_id,
--   word_id,
--   rank,
--   rank <= 10 as was_top_10,
--   score,
--   completion_time_seconds,
--   guesses_used
-- FROM ranked_scores
-- ON CONFLICT (player_id, word_id) 
-- DO UPDATE SET
--   rank = EXCLUDED.rank,
--   was_top_10 = EXCLUDED.was_top_10,
--   score = EXCLUDED.score,
--   completion_time_seconds = EXCLUDED.completion_time_seconds,
--   guesses_used = EXCLUDED.guesses_used;

-- Create function to update leaderboard rankings (original logic, uses score/completion_time_seconds)
CREATE OR REPLACE FUNCTION update_leaderboard_rankings_legacy()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Recalculate rankings for the specified word (this function is not called with target_word_id from trigger)
  -- This function is problematic as it doesn't take word_id and would try to update all words.
  -- Assuming it should be part of a trigger that knows the word_id.
  -- The logic below is a guess at what might have been intended if called from a trigger context.
  -- For now, this function is defined but likely not correctly used by the trigger below.
  -- A better version is expected in 20240601000001_fix_leaderboard_data_flow.sql.
END;
$$;

-- Create trigger to automatically update rankings when leaderboard changes (original logic)
-- This trigger calls a function that is not well-defined for its purpose.
CREATE OR REPLACE FUNCTION trigger_update_leaderboard_rankings_legacy()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- PERFORM update_leaderboard_rankings_legacy(NEW.word_id); -- original had NEW.word_id, but func didn't take arg
  -- This trigger and its function are likely superseded by 20240601000001_fix_leaderboard_data_flow.sql
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_rankings_after_leaderboard_change_legacy ON leaderboard_summary;
CREATE TRIGGER update_rankings_after_leaderboard_change_legacy
AFTER INSERT OR UPDATE ON leaderboard_summary
FOR EACH ROW
EXECUTE FUNCTION trigger_update_leaderboard_rankings_legacy(); 