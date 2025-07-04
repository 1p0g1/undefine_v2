-- Migration: 20241202000009_add_games_won_to_user_stats.sql
-- Description: Add games_won column to user_stats table
-- Author: AI Assistant
-- Date: 2024-12-02

-- Add games_won column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_stats' 
        AND column_name = 'games_won'
    ) THEN
        ALTER TABLE user_stats 
        ADD COLUMN games_won INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Add games_played column if it doesn't exist (since we reference it in trigger)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_stats' 
        AND column_name = 'games_played'
    ) THEN
        ALTER TABLE user_stats 
        ADD COLUMN games_played INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Add comment explaining the columns
COMMENT ON COLUMN user_stats.games_won IS 'Number of games won by the player';
COMMENT ON COLUMN user_stats.games_played IS 'Total number of games played by the player'; 