-- Migration: 20241202000007_ensure_game_completion_trigger.sql
-- Description: Ensure the game completion trigger is in place to update leaderboard
-- Author: AI Assistant
-- Date: 2024-12-02

-- Step 1: Create or replace the trigger function
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
        END;
    END IF;
    RETURN NEW;
END;
$$;

-- Step 2: Drop the trigger if it exists
DROP TRIGGER IF EXISTS update_leaderboard_on_game_complete ON game_sessions;

-- Step 3: Create the trigger
CREATE TRIGGER update_leaderboard_on_game_complete
    AFTER UPDATE OF is_complete, is_won ON game_sessions
    FOR EACH ROW
    WHEN (OLD.is_complete = FALSE AND NEW.is_complete = TRUE AND NEW.is_won = TRUE)
    EXECUTE FUNCTION update_leaderboard_from_game();

-- Step 4: Add comments
COMMENT ON FUNCTION update_leaderboard_from_game() IS 'Updates leaderboard_summary when a game is completed successfully';
COMMENT ON TRIGGER update_leaderboard_on_game_complete ON game_sessions IS 'Automatically updates leaderboard when a game is completed'; 