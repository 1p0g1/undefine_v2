-- Migration: 20241202000008_fix_trigger_foreign_key_issue.sql
-- Description: Fix trigger to ensure player exists in user_stats before leaderboard insert
-- Author: AI Assistant  
-- Date: 2024-12-02
-- Fixes: Foreign key constraint violation "fk_leaderboard_player"

-- Create or replace the trigger function with player existence check
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
        -- CRITICAL FIX: Ensure player exists in user_stats first
        -- This prevents foreign key constraint violation
        INSERT INTO user_stats (
            player_id, 
            games_played, 
            games_won, 
            current_streak, 
            longest_streak, 
            best_rank, 
            top_10_count
        )
        VALUES (NEW.player_id, 0, 0, 0, 0, NULL, 0)
        ON CONFLICT (player_id) DO NOTHING;
        
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

-- Add comment explaining the fix
COMMENT ON FUNCTION update_leaderboard_from_game() IS 'Updates leaderboard_summary when game completed. Fixed to ensure player exists in user_stats first to prevent FK violations.'; 