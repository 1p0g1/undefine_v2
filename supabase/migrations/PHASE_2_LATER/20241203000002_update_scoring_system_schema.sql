-- Migration: 20241203000002_update_scoring_system_schema.sql
-- Description: Update database schema for new simplified scoring system
-- Author: AI Assistant  
-- Date: 2024-12-03
-- 
-- MAJOR CHANGE: Switching from penalty-based to positive reward scoring system
-- 
-- OLD SYSTEM: score = 1000 - guess_penalty - fuzzy_penalty - time_penalty - hint_penalty
-- NEW SYSTEM: score = base_score_for_guess + fuzzy_bonus - time_penalty - hint_penalty
--
-- Changes made:
-- 1. ADD fuzzy_bonus column (fuzzy matches now give bonus points, not penalties)
-- 2. KEEP existing penalty columns for backward compatibility during transition
-- 3. UPDATE documentation comments

-- Add fuzzy_bonus column to scores table
ALTER TABLE scores 
ADD COLUMN IF NOT EXISTS fuzzy_bonus INTEGER NOT NULL DEFAULT 0;

-- Add index for potential performance optimization
CREATE INDEX IF NOT EXISTS idx_scores_fuzzy_bonus ON scores(fuzzy_bonus);

-- Add comments to document the new scoring system
COMMENT ON COLUMN scores.base_score IS 'Base points for guess number: 1000 for guess 1, 900 for guess 2, etc.';
COMMENT ON COLUMN scores.guess_penalty IS 'DEPRECATED: Always 0 in new system. Kept for backward compatibility.';
COMMENT ON COLUMN scores.fuzzy_bonus IS 'NEW: Bonus points for fuzzy matches (25 points each). Rewards close attempts.';
COMMENT ON COLUMN scores.time_penalty IS 'Time penalty: 1 point per 10 seconds (FIXED: was 10x too high)';
COMMENT ON COLUMN scores.hint_penalty IS 'Hint penalty: 200 points if hints used';
COMMENT ON COLUMN scores.score IS 'Final score: base_score + fuzzy_bonus - time_penalty - hint_penalty';

-- Update trigger log for monitoring
INSERT INTO trigger_log (trigger_name, table_name, operation, executed_at, execution_time)
VALUES (
    'update_scoring_system_schema', 
    'scores', 
    'ALTER TABLE ADD fuzzy_bonus', 
    NOW(), 
    '0.1 seconds'::INTERVAL
); 