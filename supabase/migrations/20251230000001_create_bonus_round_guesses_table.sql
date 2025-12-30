-- Migration: 20251230000001_create_bonus_round_guesses_table
-- Description: Create table to store bonus round guesses (early finisher mini-game)
-- Author: AI Assistant
-- Date: 2025-12-30

-- =============================================================================
-- TABLE: bonus_round_guesses
-- =============================================================================
-- Stores each guess made during the bonus round when players win in < 6 guesses.
-- Links to game_sessions, players, and words for full context.

CREATE TABLE IF NOT EXISTS public.bonus_round_guesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  game_session_id uuid NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  player_id text NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  word_id uuid NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  
  -- Attempt tracking
  attempt_number integer NOT NULL CHECK (attempt_number > 0),
  
  -- Guess details
  guess text NOT NULL,
  guess_lex_rank integer,  -- Lex rank of guessed word (NULL if not found)
  target_lex_rank integer, -- Lex rank of target word
  distance integer,        -- Absolute difference |guess_lex_rank - target_lex_rank|
  
  -- Scoring
  tier text CHECK (tier IN ('perfect', 'good', 'average', 'miss') OR tier IS NULL),
  is_valid boolean DEFAULT true, -- Whether guess was found in dictionary
  
  -- Timestamps
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- CONSTRAINTS
-- =============================================================================

-- One guess per attempt number per game session
ALTER TABLE public.bonus_round_guesses
ADD CONSTRAINT bonus_round_guesses_session_attempt_key
UNIQUE (game_session_id, attempt_number);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Fast lookup by player
CREATE INDEX idx_bonus_round_guesses_player_id ON public.bonus_round_guesses(player_id);

-- Fast lookup by game session
CREATE INDEX idx_bonus_round_guesses_game_session_id ON public.bonus_round_guesses(game_session_id);

-- Fast lookup by word (for stats)
CREATE INDEX idx_bonus_round_guesses_word_id ON public.bonus_round_guesses(word_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.bonus_round_guesses ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "bonus_round_guesses_service_role_all" ON public.bonus_round_guesses
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Anonymous can read (for potential future leaderboards)
CREATE POLICY "bonus_round_guesses_anon_read" ON public.bonus_round_guesses
FOR SELECT
TO anon
USING (true);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE public.bonus_round_guesses IS 'Stores bonus round guesses for early finishers (<6 guesses)';
COMMENT ON COLUMN public.bonus_round_guesses.lex_rank IS 'Lexicographic rank from dictionary table';
COMMENT ON COLUMN public.bonus_round_guesses.tier IS 'Scoring tier: perfect (≤10), good (≤20), average (≤30), miss (>30)';
COMMENT ON COLUMN public.bonus_round_guesses.distance IS 'Absolute difference between guess and target lex_rank';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Check table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'bonus_round_guesses'
) AS table_exists;

