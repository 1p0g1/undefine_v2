-- Create theme_attempts table for proper daily theme tracking and statistics
CREATE TABLE theme_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id TEXT NOT NULL REFERENCES user_stats(player_id) ON DELETE CASCADE,
  theme TEXT NOT NULL,
  guess TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  attempt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  words_completed_when_guessed INTEGER DEFAULT 0, -- How many theme words completed when they made this guess
  total_word_guesses INTEGER DEFAULT 0, -- Total word guesses made when they attempted theme
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(player_id, theme, attempt_date) -- One guess per player per theme per day
);

-- Indexes for performance
CREATE INDEX idx_theme_attempts_player_id ON theme_attempts(player_id);
CREATE INDEX idx_theme_attempts_theme ON theme_attempts(theme);
CREATE INDEX idx_theme_attempts_date ON theme_attempts(attempt_date);
CREATE INDEX idx_theme_attempts_correct ON theme_attempts(is_correct);

-- Comments for documentation
COMMENT ON TABLE theme_attempts IS 'Tracks daily theme guesses for Theme of the Week feature with statistics';
COMMENT ON COLUMN theme_attempts.words_completed_when_guessed IS 'Number of theme words player had completed when making this guess';
COMMENT ON COLUMN theme_attempts.total_word_guesses IS 'Total word guesses across all sessions when making theme guess';
COMMENT ON CONSTRAINT theme_attempts_player_id_theme_attempt_date_key ON theme_attempts IS 'Ensures one theme guess per player per day';

-- Optional: Remove theme_guess from game_sessions if we want clean separation
-- ALTER TABLE game_sessions DROP COLUMN IF EXISTS theme_guess; 