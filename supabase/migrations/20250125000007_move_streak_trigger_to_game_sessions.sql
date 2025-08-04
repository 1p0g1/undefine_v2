-- Move Streak Trigger to Game Sessions Table (FINAL FIX)
-- Date: January 26, 2025
-- Problem: Trigger was on leaderboard_summary but is_won field exists on game_sessions
-- Solution: Move trigger to game_sessions where the actual game completion happens

-- ========================================
-- DOCUMENTATION: STREAK TRIGGER ARCHITECTURE
-- ========================================
-- 
-- BEFORE: Trigger on leaderboard_summary (BROKEN)
--  - Tried to use is_won field that doesn't exist there
--  - Relied on leaderboard ranking logic
--  - Failed for players with rank > 1 even if they won
--
-- AFTER: Trigger on game_sessions (CORRECT)
--  - Uses actual is_won field from game completion
--  - Fires when games are actually completed
--  - Independent of daily leaderboard rankings
--  - More reliable and sustainable
--
-- IMPACT ON EXISTING CODE: NONE
--  - APIs continue to read from player_streaks table
--  - Frontend continues to work unchanged
--  - Only the trigger timing/source changes
-- ========================================

-- Step 1: Remove the broken trigger from leaderboard_summary
DROP TRIGGER IF EXISTS update_streaks_on_leaderboard ON leaderboard_summary;

-- Step 2: Create the correct streak function for game_sessions
CREATE OR REPLACE FUNCTION update_player_streaks_on_game_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process completed games
  IF NEW.is_complete = true THEN
    
    -- Check if this is a WIN (game completed successfully)
    IF NEW.is_won = true THEN
      INSERT INTO player_streaks (player_id, current_streak, highest_streak, streak_start_date, last_win_date)
      VALUES (NEW.player_id, 1, 1, NEW.end_time::date, NEW.end_time::date)
      ON CONFLICT (player_id) DO UPDATE SET
        current_streak = CASE 
          -- STRICT: Only consecutive calendar days (exactly 1 day apart)
          WHEN player_streaks.last_win_date::date = NEW.end_time::date - INTERVAL '1 day' 
          THEN player_streaks.current_streak + 1
          -- If it's the same day, keep current streak (don't double-count)
          WHEN player_streaks.last_win_date::date = NEW.end_time::date
          THEN player_streaks.current_streak
          -- ANY gap breaks streak, start new streak at 1
          ELSE 1
        END,
        highest_streak = GREATEST(
          player_streaks.highest_streak,
          CASE 
            WHEN player_streaks.last_win_date::date = NEW.end_time::date - INTERVAL '1 day'
            THEN player_streaks.current_streak + 1
            WHEN player_streaks.last_win_date::date = NEW.end_time::date
            THEN player_streaks.current_streak
            ELSE 1
          END
        ),
        streak_start_date = CASE
          -- Keep start date if consecutive, reset if new streak
          WHEN player_streaks.last_win_date::date = NEW.end_time::date - INTERVAL '1 day'
          THEN player_streaks.streak_start_date
          WHEN player_streaks.last_win_date::date = NEW.end_time::date
          THEN player_streaks.streak_start_date  -- Same day, keep start
          ELSE NEW.end_time::date
        END,
        last_win_date = NEW.end_time::date,
        updated_at = NOW();
        
    ELSE
      -- Loss (is_won = false): breaks current streak completely
      INSERT INTO player_streaks (player_id, current_streak, highest_streak, last_win_date)
      VALUES (NEW.player_id, 0, 0, NEW.end_time::date)
      ON CONFLICT (player_id) DO UPDATE SET
        current_streak = 0,  -- Loss breaks streak completely
        updated_at = NOW();
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create the new trigger on game_sessions
CREATE TRIGGER update_streaks_on_game_completion
  AFTER INSERT OR UPDATE ON game_sessions
  FOR EACH ROW
  WHEN (NEW.is_complete = true)  -- Only fire for completed games
  EXECUTE FUNCTION update_player_streaks_on_game_completion();

-- Step 4: Ensure the trigger is enabled
ALTER TABLE game_sessions ENABLE TRIGGER update_streaks_on_game_completion;

-- ========================================
-- MIGRATION NOTES FOR FUTURE REFERENCE
-- ========================================
-- 
-- WHAT THIS FIXES:
-- ✅ Streaks now update on actual game completion (not leaderboard ranking)
-- ✅ Uses correct is_won field from game_sessions
-- ✅ Flames will appear immediately after winning games
-- ✅ Streaks are independent of daily leaderboard positions
--
-- BACKWARDS COMPATIBILITY:
-- ✅ All existing APIs continue to work
-- ✅ Frontend code requires no changes
-- ✅ player_streaks table structure unchanged
--
-- PERFORMANCE IMPACT:
-- ✅ Better performance (fires less frequently)
-- ✅ No complex joins required
-- ✅ Simpler trigger logic
--
-- FUTURE MAINTENANCE:
-- ✅ Streak logic is now in the right place (game completion)
-- ✅ Independent of leaderboard changes
-- ✅ Easier to debug and maintain
-- ======================================== 