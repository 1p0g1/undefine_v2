-- Migration: add similarity/metadata columns to theme_attempts and a week key for leaderboards
-- Safe to run multiple times due to IF NOT EXISTS guards where applicable

DO $$ BEGIN
  -- similarity score from semantic model (0..1)
  ALTER TABLE theme_attempts ADD COLUMN IF NOT EXISTS similarity_score NUMERIC;
  -- confidence from matcher (0..100)
  ALTER TABLE theme_attempts ADD COLUMN IF NOT EXISTS confidence_percentage INTEGER;
  -- matching method used: exact | synonym | semantic | error
  ALTER TABLE theme_attempts ADD COLUMN IF NOT EXISTS matching_method TEXT;
  -- normalized percentage for leaderboard (0..100)
  ALTER TABLE theme_attempts ADD COLUMN IF NOT EXISTS similarity_percent NUMERIC(5,2) NOT NULL DEFAULT 0;
  -- ISO week key for grouping (e.g., 2025-W27)
  ALTER TABLE theme_attempts ADD COLUMN IF NOT EXISTS week_key TEXT;
EXCEPTION WHEN duplicate_column THEN
  -- ignore if columns already exist
  NULL;
END $$;

-- Backfill week_key and similarity_percent where possible
UPDATE theme_attempts
SET 
  week_key = COALESCE(week_key, to_char(date_trunc('week', attempt_date), 'IYYY-"W"IW')),
  similarity_percent = CASE 
    WHEN similarity_percent IS NULL OR similarity_percent = 0 THEN 
      ROUND(COALESCE(similarity_score, 0) * 100.0, 2)
    ELSE similarity_percent
  END;

-- Indexes to speed up leaderboard queries
CREATE INDEX IF NOT EXISTS idx_theme_attempts_week_key ON theme_attempts(week_key);
CREATE INDEX IF NOT EXISTS idx_theme_attempts_week_key_player ON theme_attempts(week_key, player_id);
CREATE INDEX IF NOT EXISTS idx_theme_attempts_similarity_percent ON theme_attempts(similarity_percent); 