-- Migration: Cleanup duplicate foreign keys (preserve effective behavior)
-- Date: 2025-12-19
--
-- Context:
-- Supabase schema currently contains duplicate FKs on:
--   1) game_sessions.word_id -> words.id (NO ACTION + CASCADE duplicates)
--   2) leaderboard_summary.player_id -> players.id (multiple duplicates, including a temp SET NULL)
--
-- Goal:
-- Remove duplicate constraints while preserving CURRENT effective delete semantics:
-- - Today, deletes are effectively "NO ACTION" when duplicates include a NO ACTION FK.
-- - We keep a single NO ACTION FK in each case.

BEGIN;

-- 1) game_sessions.word_id
-- Keep: fk_game_sessions_word (ON DELETE NO ACTION)
-- Drop: fk_word_id (ON DELETE CASCADE) to preserve today's effective behavior (NO ACTION).
ALTER TABLE public.game_sessions
  DROP CONSTRAINT IF EXISTS fk_word_id;

-- 2) leaderboard_summary.player_id
-- Keep: fk_leaderboard_player_to_players (ON DELETE NO ACTION)
-- Drop the duplicate NO ACTION constraints + the temp SET NULL constraint.
ALTER TABLE public.leaderboard_summary
  DROP CONSTRAINT IF EXISTS fk_leaderboard_summary_player_id_to_players;

ALTER TABLE public.leaderboard_summary
  DROP CONSTRAINT IF EXISTS leaderboard_summary_player_id_fkey_temp;

ALTER TABLE public.leaderboard_summary
  DROP CONSTRAINT IF EXISTS leaderboard_summary_player_id_to_players;

COMMIT;


