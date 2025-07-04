-- Migration: 20241202000001_drop_word_text_from_game_sessions.sql
-- Description: Remove the redundant 'word' TEXT column from game_sessions.
--              The 'word_id' UUID column is the correct foreign key to the 'words' table.
-- Author: AI Assistant
-- Date: 2024-12-02

ALTER TABLE public.game_sessions
DROP COLUMN IF EXISTS word; 