-- Migration: 20230515143000_add_clue_fields_to_words
-- Description: Add DEFINE clue fields to words table and update game_sessions with hint tracking
-- Author: Project Team
-- Date: 2023-05-15

-- Up migration
-- Add DEFINE clue fields to words table
ALTER TABLE words
  ADD COLUMN IF NOT EXISTS equivalents TEXT,
  ADD COLUMN IF NOT EXISTS first_letter TEXT,
  ADD COLUMN IF NOT EXISTS in_a_sentence TEXT,
  ADD COLUMN IF NOT EXISTS number_of_letters INT,
  ADD COLUMN IF NOT EXISTS etymology TEXT,
  ADD COLUMN IF NOT EXISTS difficulty TEXT;

-- Update game_sessions table to track hint usage and clue status
ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS used_hint BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS clue_status JSONB DEFAULT '{"D": false, "E": false, "F": false, "I": false, "N": false, "E2": false}'::jsonb;

-- NOTE: DOWN migration operations removed to prevent accidental column drops
-- This migration should only ADD columns, never DROP them 