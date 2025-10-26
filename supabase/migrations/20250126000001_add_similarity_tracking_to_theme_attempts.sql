-- Add similarity tracking columns to theme_attempts table
-- These columns track the AI fuzzy matching details for each theme guess

ALTER TABLE theme_attempts 
ADD COLUMN IF NOT EXISTS similarity_score FLOAT,
ADD COLUMN IF NOT EXISTS confidence_percentage INTEGER,
ADD COLUMN IF NOT EXISTS matching_method TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_theme_attempts_confidence ON theme_attempts(confidence_percentage);
CREATE INDEX IF NOT EXISTS idx_theme_attempts_method ON theme_attempts(matching_method);

-- Add comments
COMMENT ON COLUMN theme_attempts.similarity_score IS 'AI semantic similarity score (0-1) for fuzzy matching';
COMMENT ON COLUMN theme_attempts.confidence_percentage IS 'Match confidence as percentage (0-100)';
COMMENT ON COLUMN theme_attempts.matching_method IS 'How the guess was matched: exact, semantic, etc.';

