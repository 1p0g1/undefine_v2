-- Migration: 20241202000006_fix_duplicate_constraints.sql
-- Description: Remove duplicate constraints and triggers from leaderboard_summary
-- Author: AI Assistant
-- Date: 2024-12-02

-- Step 1: Drop duplicate foreign key constraint
ALTER TABLE leaderboard_summary
DROP CONSTRAINT IF EXISTS fk_leaderboard_summary_player_id_to_user_stats;

-- Step 2: Drop legacy trigger
DROP TRIGGER IF EXISTS update_rankings_after_leaderboard_change_legacy ON leaderboard_summary;
DROP FUNCTION IF EXISTS trigger_update_leaderboard_rankings_legacy;

-- Step 3: Ensure the remaining trigger function is correct
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

-- Step 4: Ensure proper trigger exists
DROP TRIGGER IF EXISTS update_rankings_after_leaderboard_change ON leaderboard_summary;
CREATE TRIGGER update_rankings_after_leaderboard_change
    AFTER INSERT OR UPDATE OF best_time, guesses_used ON leaderboard_summary
    FOR EACH ROW
    EXECUTE FUNCTION update_leaderboard_rankings();

-- Step 5: Add comment explaining the trigger
COMMENT ON FUNCTION update_leaderboard_rankings() IS 'Updates rankings for all entries of a word when any entry changes';
COMMENT ON TRIGGER update_rankings_after_leaderboard_change ON leaderboard_summary IS 'Automatically updates rankings when leaderboard entries change'; 