-- Migration: 20240601000001_fix_leaderboard_data_flow
-- Description: Fix leaderboard data flow and ensure proper constraints
-- Author: Project Team
-- Date: 2024-06-01

-- Step 1: Ensure proper foreign key constraints
ALTER TABLE leaderboard_summary
DROP CONSTRAINT IF EXISTS leaderboard_summary_player_id_fkey,
DROP CONSTRAINT IF EXISTS leaderboard_summary_word_id_fkey,
ADD CONSTRAINT leaderboard_summary_player_id_fkey 
    FOREIGN KEY (player_id) REFERENCES user_stats(player_id) ON DELETE CASCADE,
ADD CONSTRAINT leaderboard_summary_word_id_fkey 
    FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE;

-- Step 2: Create function to update leaderboard from game completion
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

-- Step 3: Create trigger to automatically update leaderboard on game completion
DROP TRIGGER IF EXISTS update_leaderboard_on_game_complete ON game_sessions;
CREATE TRIGGER update_leaderboard_on_game_complete
    AFTER UPDATE OF is_complete, is_won ON game_sessions
    FOR EACH ROW
    WHEN (OLD.is_complete = FALSE AND NEW.is_complete = TRUE AND NEW.is_won = TRUE)
    EXECUTE FUNCTION update_leaderboard_from_game();

-- Step 4: Create function to update rankings
CREATE OR REPLACE FUNCTION update_leaderboard_rankings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
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
    
    RETURN NEW;
END;
$$;

-- Step 5: Create trigger for automatic ranking updates
DROP TRIGGER IF EXISTS update_rankings_after_leaderboard_change ON leaderboard_summary;
CREATE TRIGGER update_rankings_after_leaderboard_change
    AFTER INSERT OR UPDATE OF best_time, guesses_used ON leaderboard_summary
    FOR EACH ROW
    EXECUTE FUNCTION update_leaderboard_rankings();

-- Step 6: Update existing rankings
WITH ranked_entries AS (
    SELECT 
        id,
        word_id,
        ROW_NUMBER() OVER (
            PARTITION BY word_id 
            ORDER BY best_time ASC, guesses_used ASC
        ) as new_rank
    FROM leaderboard_summary
)
UPDATE leaderboard_summary ls
SET 
    rank = re.new_rank,
    was_top_10 = re.new_rank <= 10
FROM ranked_entries re
WHERE ls.id = re.id; 