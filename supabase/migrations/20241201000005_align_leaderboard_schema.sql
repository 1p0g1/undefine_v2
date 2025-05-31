-- Migration: 20241201000005_align_leaderboard_schema
-- Description: Align leaderboard_summary table schema with API expectations
-- Author: Project Team
-- Date: 2024-12-01

-- Step 1: Add missing columns that the API expects
ALTER TABLE leaderboard_summary 
ADD COLUMN IF NOT EXISTS best_time INTEGER,
ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;

-- Step 2: Migrate data from old columns to new columns
UPDATE leaderboard_summary 
SET best_time = completion_time_seconds 
WHERE best_time IS NULL AND completion_time_seconds IS NOT NULL;

-- Step 3: Drop old columns that the API doesn't use
ALTER TABLE leaderboard_summary 
DROP COLUMN IF EXISTS score,
DROP COLUMN IF EXISTS completion_time_seconds,
DROP COLUMN IF EXISTS created_at;

-- Step 4: Update foreign key constraints to match ERD
-- Drop old constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'leaderboard_summary_player_id_fkey' 
               AND table_name = 'leaderboard_summary') THEN
        ALTER TABLE leaderboard_summary DROP CONSTRAINT leaderboard_summary_player_id_fkey;
    END IF;
END $$;

-- Add correct foreign key constraint to user_stats
ALTER TABLE leaderboard_summary 
ADD CONSTRAINT fk_leaderboard_player 
FOREIGN KEY (player_id) REFERENCES user_stats(player_id);

-- Step 5: Ensure proper indexes exist
DROP INDEX IF EXISTS idx_leaderboard_summary_score;
CREATE INDEX IF NOT EXISTS idx_leaderboard_summary_best_time ON leaderboard_summary(best_time);
CREATE INDEX IF NOT EXISTS idx_leaderboard_summary_date ON leaderboard_summary(date);

-- Step 6: Update any remaining NULL rank values
UPDATE leaderboard_summary 
SET rank = 1 
WHERE rank IS NULL;

-- Step 7: Make rank NOT NULL since it should always have a value
ALTER TABLE leaderboard_summary 
ALTER COLUMN rank SET NOT NULL; 