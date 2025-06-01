-- Migration: 20241203000001_add_nickname_change_tracking.sql
-- Description: Add last_nickname_change column to players table for rate limiting
-- Author: AI Assistant  
-- Date: 2024-12-03

-- Add last_nickname_change column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'players' 
        AND column_name = 'last_nickname_change'
    ) THEN
        ALTER TABLE players 
        ADD COLUMN last_nickname_change TIMESTAMP WITH TIME ZONE;
        
        -- Add comment for documentation
        COMMENT ON COLUMN players.last_nickname_change IS 'Timestamp of last nickname change for rate limiting (1 change per hour)';
        
        RAISE NOTICE 'Added last_nickname_change column to players table';
    ELSE
        RAISE NOTICE 'last_nickname_change column already exists in players table';
    END IF;
END $$; 