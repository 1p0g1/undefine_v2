-- Migration: Add week_start and is_archive_attempt columns to theme_attempts
-- These columns support archive play and proper week-based tracking
-- Date: 2025-12-31

-- Add week_start column for proper weekly theme tracking
ALTER TABLE theme_attempts 
ADD COLUMN IF NOT EXISTS week_start DATE;

-- Add is_archive_attempt column to distinguish archive plays from live plays
ALTER TABLE theme_attempts 
ADD COLUMN IF NOT EXISTS is_archive_attempt BOOLEAN DEFAULT FALSE;

-- Update the unique constraint to allow both archive and live attempts
-- First drop the old constraint if it exists
ALTER TABLE theme_attempts 
DROP CONSTRAINT IF EXISTS theme_attempts_player_id_theme_attempt_date_key;

-- Create new unique constraint that includes is_archive_attempt and week_start
-- This allows:
-- 1. One live attempt per day per theme (attempt_date = today, is_archive_attempt = false)
-- 2. One archive attempt per day per historical week (is_archive_attempt = true, week_start varies)
CREATE UNIQUE INDEX IF NOT EXISTS idx_theme_attempts_unique_daily 
ON theme_attempts(player_id, theme, attempt_date, COALESCE(is_archive_attempt, false), COALESCE(week_start, attempt_date));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_theme_attempts_week_start ON theme_attempts(week_start);
CREATE INDEX IF NOT EXISTS idx_theme_attempts_archive ON theme_attempts(is_archive_attempt);

-- Comments
COMMENT ON COLUMN theme_attempts.week_start IS 'The Monday of the week this theme belongs to';
COMMENT ON COLUMN theme_attempts.is_archive_attempt IS 'Whether this guess was made during archive play (historical game)';

