-- Add similarity score tracking to theme_attempts table
-- Migration: 20250115000001_add_similarity_tracking_to_theme_attempts.sql

-- Add new columns for similarity tracking
ALTER TABLE theme_attempts 
ADD COLUMN similarity_score NUMERIC(5,4), -- Store 0.0000 to 1.0000 (raw similarity from AI)
ADD COLUMN confidence_percentage INTEGER, -- Store 0-100 (user-friendly percentage)
ADD COLUMN matching_method TEXT; -- Store 'exact', 'synonym', 'semantic', 'error'

-- Add check constraints to ensure valid data
ALTER TABLE theme_attempts 
ADD CONSTRAINT check_similarity_score_range 
CHECK (similarity_score IS NULL OR (similarity_score >= 0 AND similarity_score <= 1));

ALTER TABLE theme_attempts 
ADD CONSTRAINT check_confidence_percentage_range 
CHECK (confidence_percentage IS NULL OR (confidence_percentage >= 0 AND confidence_percentage <= 100));

ALTER TABLE theme_attempts 
ADD CONSTRAINT check_matching_method_values 
CHECK (matching_method IS NULL OR matching_method IN ('exact', 'synonym', 'semantic', 'error'));

-- Add index for querying by confidence scores (for analytics)
CREATE INDEX idx_theme_attempts_confidence ON theme_attempts(confidence_percentage) 
WHERE confidence_percentage IS NOT NULL;

-- Add index for querying by matching method (for analytics)  
CREATE INDEX idx_theme_attempts_method ON theme_attempts(matching_method) 
WHERE matching_method IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN theme_attempts.similarity_score IS 'Raw similarity score from AI (0.0-1.0), null for non-semantic matches';
COMMENT ON COLUMN theme_attempts.confidence_percentage IS 'User-friendly confidence percentage (0-100)';
COMMENT ON COLUMN theme_attempts.matching_method IS 'How the match was determined: exact, synonym, semantic, or error'; 