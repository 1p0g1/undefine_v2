-- Migration: Add archive play support columns to game_sessions
-- Date: 2024-12-19
-- Purpose: Enable tracking of archive plays vs live plays

-- Add is_archive_play column to distinguish archive games from live games
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS is_archive_play BOOLEAN DEFAULT FALSE;

-- Add game_date column to store the word's original date (for archive plays)
-- For live games, this will typically match the current date
-- For archive games, this will be the historical date of the word
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS game_date DATE;

-- Backfill game_date for existing records from the words table
UPDATE game_sessions gs
SET game_date = w.date::date
FROM words w
WHERE gs.word_id = w.id
  AND gs.game_date IS NULL
  AND w.date IS NOT NULL;

-- Backfill game_date from end_time for records where word date is null
UPDATE game_sessions
SET game_date = DATE(end_time)
WHERE game_date IS NULL
  AND end_time IS NOT NULL;

-- Backfill game_date from start_time as fallback
UPDATE game_sessions
SET game_date = DATE(start_time)
WHERE game_date IS NULL
  AND start_time IS NOT NULL;

-- Add index for filtering by archive status
CREATE INDEX IF NOT EXISTS idx_game_sessions_is_archive_play 
ON game_sessions(is_archive_play);

-- Add index for filtering by game_date
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_date 
ON game_sessions(game_date);

-- Add comment to explain purpose
COMMENT ON COLUMN game_sessions.is_archive_play IS 'True if this game is playing a historical word from the archive, false for live daily plays';
COMMENT ON COLUMN game_sessions.game_date IS 'The date of the word being played (matches words.date). For live plays, this is today; for archive plays, this is the historical date';

