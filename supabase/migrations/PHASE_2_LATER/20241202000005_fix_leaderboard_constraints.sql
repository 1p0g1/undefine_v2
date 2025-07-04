-- Migration: 20241202000005_fix_leaderboard_constraints.sql
-- Description: Fix leaderboard constraints and ensure proper dependency chain
-- Author: AI Assistant
-- Date: 2024-12-02

-- Step 1: Drop existing constraints that might conflict
DO $$ BEGIN
    -- Drop unique constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'leaderboard_summary_player_word_date_uq'
        AND conrelid = 'leaderboard_summary'::regclass
    ) THEN
        ALTER TABLE leaderboard_summary 
        DROP CONSTRAINT leaderboard_summary_player_word_date_uq;
    END IF;

    -- Drop foreign key if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_leaderboard_player'
        AND conrelid = 'leaderboard_summary'::regclass
    ) THEN
        ALTER TABLE leaderboard_summary 
        DROP CONSTRAINT fk_leaderboard_player;
    END IF;
END $$;

-- Step 2: Clean up duplicate entries by keeping only the best time for each player-word pair
WITH ranked_duplicates AS (
    SELECT 
        id,
        player_id,
        word_id,
        best_time,
        guesses_used,
        ROW_NUMBER() OVER (
            PARTITION BY player_id, word_id 
            ORDER BY best_time ASC, guesses_used ASC
        ) as rn
    FROM leaderboard_summary
),
duplicates_to_remove AS (
    SELECT id 
    FROM ranked_duplicates 
    WHERE rn > 1
)
DELETE FROM leaderboard_summary
WHERE id IN (SELECT id FROM duplicates_to_remove);

-- Step 3: Add the correct constraints
ALTER TABLE leaderboard_summary
ADD CONSTRAINT leaderboard_summary_player_word_key UNIQUE (player_id, word_id),
ADD CONSTRAINT fk_leaderboard_player FOREIGN KEY (player_id) REFERENCES user_stats(player_id) ON DELETE CASCADE;

-- Step 4: Update the trigger function to match the new constraint
CREATE OR REPLACE FUNCTION update_leaderboard_from_game()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    start_time TIMESTAMP;
    completion_time INTEGER;
BEGIN
    start_time := clock_timestamp();
    
    -- Log start of trigger execution
    INSERT INTO trigger_log (trigger_name, table_name, operation, old_data, new_data)
    VALUES (
        'update_leaderboard_from_game',
        TG_TABLE_NAME,
        TG_OP,
        row_to_json(OLD)::jsonb,
        row_to_json(NEW)::jsonb
    );

    -- Only process completed, winning games
    IF NEW.is_complete AND NEW.is_won THEN
        -- Calculate completion time
        completion_time := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))::INTEGER;
        
        -- Insert or update leaderboard entry
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
        ON CONFLICT (player_id, word_id) 
        DO UPDATE SET
            best_time = LEAST(leaderboard_summary.best_time, EXCLUDED.best_time),
            guesses_used = CASE 
                WHEN leaderboard_summary.best_time > EXCLUDED.best_time 
                THEN EXCLUDED.guesses_used 
                ELSE leaderboard_summary.guesses_used 
            END,
            date = CURRENT_DATE;
            
        -- Update execution time
        UPDATE trigger_log 
        SET execution_time = clock_timestamp() - start_time
        WHERE trigger_name = 'update_leaderboard_from_game'
        AND executed_at = start_time;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Step 5: Ensure proper indexes exist
DROP INDEX IF EXISTS idx_leaderboard_summary_player_word_date;
CREATE INDEX IF NOT EXISTS idx_leaderboard_summary_player_word ON leaderboard_summary(player_id, word_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_summary_best_time ON leaderboard_summary(best_time);

COMMENT ON CONSTRAINT leaderboard_summary_player_word_key ON leaderboard_summary IS 'Ensures a player can only have one entry per word';
COMMENT ON CONSTRAINT fk_leaderboard_player ON leaderboard_summary IS 'Ensures player_id exists in user_stats table'; 