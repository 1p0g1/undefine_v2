-- Migration: 20241201000005_align_leaderboard_schema
-- Description: Align leaderboard_summary table schema with API expectations
-- Author: Project Team
-- Date: 2024-12-01

-- Step 1: Add missing columns that the API expects
ALTER TABLE leaderboard_summary 
ADD COLUMN IF NOT EXISTS best_time INTEGER,
ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;

-- Step 2: Migrate data from old columns to new columns (if they exist)
DO $$ 
BEGIN
    -- Only migrate if completion_time_seconds column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'leaderboard_summary' 
               AND column_name = 'completion_time_seconds') THEN
        UPDATE leaderboard_summary 
        SET best_time = completion_time_seconds 
        WHERE best_time IS NULL AND completion_time_seconds IS NOT NULL;
    END IF;
END $$;

-- Step 3: Drop old columns that the API doesn't use (if they exist)
DO $$ 
BEGIN
    -- Drop score column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'leaderboard_summary' 
               AND column_name = 'score') THEN
        ALTER TABLE leaderboard_summary DROP COLUMN score;
    END IF;
    
    -- Drop completion_time_seconds column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'leaderboard_summary' 
               AND column_name = 'completion_time_seconds') THEN
        ALTER TABLE leaderboard_summary DROP COLUMN completion_time_seconds;
    END IF;
    
    -- Drop created_at column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'leaderboard_summary' 
               AND column_name = 'created_at') THEN
        ALTER TABLE leaderboard_summary DROP COLUMN created_at;
    END IF;
END $$;

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

-- Add correct foreign key constraint to user_stats (if it doesn't already exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_leaderboard_player' 
                   AND table_name = 'leaderboard_summary') THEN
        ALTER TABLE leaderboard_summary 
        ADD CONSTRAINT fk_leaderboard_player 
        FOREIGN KEY (player_id) REFERENCES user_stats(player_id);
    END IF;
END $$;

-- Step 5: Ensure proper indexes exist
DROP INDEX IF EXISTS idx_leaderboard_summary_score;
CREATE INDEX IF NOT EXISTS idx_leaderboard_summary_best_time ON leaderboard_summary(best_time);
CREATE INDEX IF NOT EXISTS idx_leaderboard_summary_date ON leaderboard_summary(date);

-- Step 6: Update any remaining NULL rank values
UPDATE leaderboard_summary 
SET rank = 1 
WHERE rank IS NULL;

-- Step 7: Make rank NOT NULL since it should always have a value (if not already)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'leaderboard_summary' 
               AND column_name = 'rank' 
               AND is_nullable = 'YES') THEN
        ALTER TABLE leaderboard_summary ALTER COLUMN rank SET NOT NULL;
    END IF;
END $$; 