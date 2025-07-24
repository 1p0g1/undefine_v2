-- ROLLBACK SCRIPT: Restore Forgiving 7-Day Gap Streak System
-- Date: January 25, 2025
-- Purpose: Emergency rollback if strict consecutive system causes issues
-- Usage: Only apply if strict system needs to be reverted

-- WARNING: Only apply this if you need to rollback to the forgiving system

-- Restore the forgiving 7-day gap function
CREATE OR REPLACE FUNCTION update_player_streaks_forgiving()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process rank 1 (wins) in leaderboard_summary
  IF NEW.rank = 1 THEN
    INSERT INTO player_streaks (player_id, current_streak, highest_streak, streak_start_date, last_win_date)
    VALUES (NEW.player_id, 1, 1, NEW.date, NEW.date)
    ON CONFLICT (player_id) DO UPDATE SET
      current_streak = CASE 
        -- FORGIVING: Allow up to 7 days between wins
        WHEN NEW.date - player_streaks.last_win_date <= 7 
        THEN player_streaks.current_streak + 1
        -- Gap too long: start new streak
        ELSE 1
      END,
      highest_streak = GREATEST(
        player_streaks.highest_streak,
        CASE 
          WHEN NEW.date - player_streaks.last_win_date <= 7
          THEN player_streaks.current_streak + 1
          ELSE 1
        END
      ),
      streak_start_date = CASE
        -- Keep start date if gap acceptable, reset if new streak
        WHEN NEW.date - player_streaks.last_win_date <= 7
        THEN player_streaks.streak_start_date
        ELSE NEW.date
      END,
      last_win_date = NEW.date,
      updated_at = NOW();
      
  ELSE
    -- Loss (rank > 1): keep current streak (forgiving for losses)
    INSERT INTO player_streaks (player_id, current_streak, highest_streak, last_win_date)
    VALUES (NEW.player_id, 0, 0, NEW.date)
    ON CONFLICT (player_id) DO UPDATE SET
      -- In forgiving system, we don't reset on losses, only on long gaps
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace the strict function with forgiving one (if needed)
-- UNCOMMENT THESE LINES ONLY IF YOU NEED TO ROLLBACK:

-- BEGIN;
--   DROP TRIGGER IF EXISTS trigger_update_streaks ON leaderboard_summary;
--   DROP FUNCTION IF EXISTS update_player_streaks();
--   ALTER FUNCTION update_player_streaks_forgiving() RENAME TO update_player_streaks;
--   CREATE TRIGGER trigger_update_streaks
--   AFTER INSERT OR UPDATE ON leaderboard_summary
--   FOR EACH ROW EXECUTE FUNCTION update_player_streaks();
--   RAISE NOTICE 'ROLLBACK COMPLETE: Restored forgiving 7-day gap system';
-- COMMIT;

-- Documentation
COMMENT ON FUNCTION update_player_streaks_forgiving() IS 'ROLLBACK FUNCTION: Forgiving 7-day gap streak system - only use if strict system needs to be reverted'; 