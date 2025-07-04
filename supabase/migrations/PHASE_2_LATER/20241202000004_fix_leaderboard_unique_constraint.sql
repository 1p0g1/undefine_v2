-- Migration: 20241202000004_fix_leaderboard_unique_constraint.sql
-- Description: Fix the mismatch between trigger function and table unique constraints
-- Author: AI Assistant
-- Date: 2024-12-02

-- Step 1: Update the trigger function to use the correct unique constraint
CREATE OR REPLACE FUNCTION update_leaderboard_from_game()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only process completed, winning games
    IF NEW.is_complete AND NEW.is_won THEN
        -- Calculate completion time
        DECLARE
            completion_time INTEGER;
        BEGIN
            completion_time := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))::INTEGER;
            
            -- Insert or update leaderboard entry with correct unique constraint
            INSERT INTO leaderboard_summary (
                player_id,
                word_id,
                rank,
                was_top_10,
                best_time,
                guesses_used,
                date
            ) VALUES (
                NEW.player_id,
                NEW.word_id,
                1, -- Will be recalculated by ranking trigger
                true, -- Will be updated by ranking trigger
                completion_time,
                array_length(NEW.guesses, 1),
                CURRENT_DATE
            )
            ON CONFLICT (player_id, word_id, date) 
            DO UPDATE SET
                best_time = LEAST(leaderboard_summary.best_time, EXCLUDED.best_time),
                guesses_used = CASE 
                    WHEN leaderboard_summary.best_time > EXCLUDED.best_time 
                    THEN EXCLUDED.guesses_used 
                    ELSE leaderboard_summary.guesses_used 
                END;
        END;
    END IF;
    RETURN NEW;
END;
$$;

-- Step 2: Ensure the unique constraint exists and is properly named
DO $$ BEGIN
    -- Drop any existing constraints that might conflict
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'leaderboard_summary_player_id_word_id_key'
        AND conrelid = 'leaderboard_summary'::regclass
    ) THEN
        ALTER TABLE leaderboard_summary 
        DROP CONSTRAINT leaderboard_summary_player_id_word_id_key;
    END IF;

    -- Add the correct unique constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'leaderboard_summary_player_word_date_uq'
        AND conrelid = 'leaderboard_summary'::regclass
    ) THEN
        ALTER TABLE leaderboard_summary 
        ADD CONSTRAINT leaderboard_summary_player_word_date_uq 
        UNIQUE (player_id, word_id, date);
    END IF;
END $$;

-- Step 3: Add an index to support the unique constraint if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_leaderboard_summary_player_word_date 
ON leaderboard_summary(player_id, word_id, date);

COMMENT ON FUNCTION update_leaderboard_from_game() IS 'Trigger function to update leaderboard_summary when a game is completed. Uses (player_id, word_id, date) for conflict resolution.'; 