-- Migration: 20230515143000_add_clue_fields_to_words
-- Description: Add DEFINE clue fields to words table and update game_sessions with hint tracking
-- Author: Project Team
-- Date: 2023-05-15

-- Up migration
-- Add DEFINE clue fields to words table
ALTER TABLE words
  ADD COLUMN equivalents TEXT,
  ADD COLUMN first_letter TEXT,
  ADD COLUMN in_a_sentence TEXT,
  ADD COLUMN number_of_letters INT,
  ADD COLUMN etymology TEXT,
  ADD COLUMN difficulty TEXT;

-- Update game_sessions table to track hint usage and clue status
ALTER TABLE game_sessions
  ADD COLUMN used_hint BOOLEAN DEFAULT FALSE,
  ADD COLUMN clue_status JSONB DEFAULT '{"D": false, "E": false, "F": false, "I": false, "N": false, "E2": false}'::jsonb;

-- Down migration
-- Remove clue fields from words table
ALTER TABLE words
  DROP COLUMN equivalents,
  DROP COLUMN first_letter,
  DROP COLUMN in_a_sentence,
  DROP COLUMN number_of_letters,
  DROP COLUMN etymology,
  DROP COLUMN difficulty;

-- Remove hint tracking from game_sessions table
ALTER TABLE game_sessions
  DROP COLUMN used_hint,
  DROP COLUMN clue_status; 