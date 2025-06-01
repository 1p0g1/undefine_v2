-- Migration: 20240601000002_add_trigger_logging
-- Description: Add logging to leaderboard trigger functions
-- Author: Project Team
-- Date: 2024-06-01

-- Create trigger_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS trigger_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trigger_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    execution_time INTERVAL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update the update_leaderboard_from_game function with logging
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

-- Update the update_leaderboard_rankings function with logging
CREATE OR REPLACE FUNCTION update_leaderboard_rankings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    start_time TIMESTAMP;
BEGIN
    start_time := clock_timestamp();
    
    -- Log start of trigger execution
    INSERT INTO trigger_log (trigger_name, table_name, operation, old_data, new_data)
    VALUES (
        'update_leaderboard_rankings',
        TG_TABLE_NAME,
        TG_OP,
        row_to_json(OLD)::jsonb,
        row_to_json(NEW)::jsonb
    );

    -- Recalculate rankings for the word
    WITH ranked_entries AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY word_id 
                ORDER BY best_time ASC, guesses_used ASC
            ) as new_rank
        FROM leaderboard_summary 
        WHERE word_id = NEW.word_id
    )
    UPDATE leaderboard_summary ls
    SET 
        rank = re.new_rank,
        was_top_10 = re.new_rank <= 10
    FROM ranked_entries re
    WHERE ls.id = re.id;
    
    -- Update execution time
    UPDATE trigger_log 
    SET execution_time = clock_timestamp() - start_time
    WHERE trigger_name = 'update_leaderboard_rankings'
    AND executed_at = start_time;
    
    RETURN NEW;
END;
$$;

-- Create an index on trigger_log for performance
CREATE INDEX IF NOT EXISTS idx_trigger_log_trigger_name 
ON trigger_log(trigger_name, executed_at DESC);

-- Create a view for easy monitoring
CREATE OR REPLACE VIEW v_trigger_performance AS
SELECT 
    trigger_name,
    table_name,
    COUNT(*) as execution_count,
    AVG(EXTRACT(EPOCH FROM execution_time)) as avg_execution_time_seconds,
    MAX(EXTRACT(EPOCH FROM execution_time)) as max_execution_time_seconds,
    MIN(EXTRACT(EPOCH FROM execution_time)) as min_execution_time_seconds,
    MAX(executed_at) as last_execution
FROM trigger_log
GROUP BY trigger_name, table_name
ORDER BY avg_execution_time_seconds DESC; 