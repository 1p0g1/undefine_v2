-- Fix Streak Trigger: Focus on Wins/Losses, Not Rankings
-- Date: January 26, 2025
-- Problem: Current trigger breaks streaks for rank > 1, but completed games should count as wins

-- Create improved streak function that focuses on game completion/wins
CREATE OR REPLACE FUNCTION update_player_streaks_wins_focused()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if we have a completed game (not just leaderboard entries)
  -- Check if this is a WIN (game completed successfully)
  IF NEW.is_won = true THEN
    INSERT INTO player_streaks (player_id, current_streak, highest_streak, streak_start_date, last_win_date)
    VALUES (NEW.player_id, 1, 1, NEW.date, NEW.date)
    ON CONFLICT (player_id) DO UPDATE SET
      current_streak = CASE 
        -- STRICT: Only consecutive calendar days (exactly 1 day apart)
        WHEN player_streaks.last_win_date::date = NEW.date::date - INTERVAL '1 day' 
        THEN player_streaks.current_streak + 1
        -- If it's the same day, keep current streak (don't double-count)
        WHEN player_streaks.last_win_date::date = NEW.date::date
        THEN player_streaks.current_streak
        -- ANY gap breaks streak, start new streak at 1
        ELSE 1
      END,
      highest_streak = GREATEST(
        player_streaks.highest_streak,
        CASE 
          WHEN player_streaks.last_win_date::date = NEW.date::date - INTERVAL '1 day'
          THEN player_streaks.current_streak + 1
          WHEN player_streaks.last_win_date::date = NEW.date::date
          THEN player_streaks.current_streak
          ELSE 1
        END
      ),
      streak_start_date = CASE
        -- Keep start date if consecutive, reset if new streak
        WHEN player_streaks.last_win_date::date = NEW.date::date - INTERVAL '1 day'
        THEN player_streaks.streak_start_date
        WHEN player_streaks.last_win_date::date = NEW.date::date
        THEN player_streaks.streak_start_date  -- Same day, keep start
        ELSE NEW.date
      END,
      last_win_date = NEW.date,
      updated_at = NOW();
      
  ELSE
    -- Loss (is_won = false): breaks current streak completely
    INSERT INTO player_streaks (player_id, current_streak, highest_streak, last_win_date)
    VALUES (NEW.player_id, 0, 0, NEW.date)
    ON CONFLICT (player_id) DO UPDATE SET
      current_streak = 0,  -- Loss breaks streak completely
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace the old trigger with the new wins-focused one
DROP TRIGGER IF EXISTS update_streaks_on_leaderboard ON leaderboard_summary;
CREATE TRIGGER update_streaks_on_leaderboard
  AFTER INSERT OR UPDATE ON leaderboard_summary
  FOR EACH ROW
  EXECUTE FUNCTION update_player_streaks_wins_focused();

-- Also ensure we enable the trigger
ALTER TABLE leaderboard_summary ENABLE TRIGGER update_streaks_on_leaderboard; 