-- Migration: 20241202000003_add_clue_status_to_game_sessions.sql
-- Description: Add the clue_status JSONB column to the game_sessions table
--              to align with docs/database_schema.md and fix frontend errors.
-- Author: AI Assistant
-- Date: 2024-12-02

ALTER TABLE public.game_sessions
ADD COLUMN IF NOT EXISTS clue_status JSONB DEFAULT '{"definition": false, "equivalents": false, "first_letter": false, "in_a_sentence": false, "number_of_letters": false, "etymology": false}'::jsonb;

COMMENT ON COLUMN public.game_sessions.clue_status IS 'JSON object tracking the revealed state of each D.E.F.I.N.E. clue type for the session.'; 