-- Simple Strict Consecutive Daily Streak System - FIXED VARIABLES
-- Date: January 25, 2025
-- Fixed: Variable name ambiguity with column names

-- Step 1: Create new STRICT consecutive function
CREATE OR REPLACE FUNCTION update_player_streaks_strict_v2()
RETURNS TRIGGER AS $$
BEGIN
  -- Process wins (rank = 1) to build/continue streaks
  IF NEW.rank = 1 THEN
    INSERT INTO player_streaks (player_id, current_streak, highest_streak, streak_start_date, last_win_date)
    VALUES (NEW.player_id, 1, 1, NEW.date, NEW.date)
    ON CONFLICT (player_id) DO UPDATE SET
      current_streak = CASE 
        -- STRICT: Only consecutive calendar days (exactly 1 day apart)
        WHEN player_streaks.last_win_date = NEW.date - INTERVAL '1 day' 
        THEN player_streaks.current_streak + 1
        -- ANY gap breaks streak, start new streak at 1
        ELSE 1
      END,
      highest_streak = GREATEST(
        player_streaks.highest_streak,
        CASE 
          WHEN player_streaks.last_win_date = NEW.date - INTERVAL '1 day'
          THEN player_streaks.current_streak + 1
          ELSE 1
        END
      ),
      streak_start_date = CASE
        -- Keep start date if consecutive, reset if new streak
        WHEN player_streaks.last_win_date = NEW.date - INTERVAL '1 day'
        THEN player_streaks.streak_start_date
        ELSE NEW.date
      END,
      last_win_date = NEW.date,
      updated_at = NOW();
      
  ELSE
    -- Loss (rank > 1): breaks current streak completely
    INSERT INTO player_streaks (player_id, current_streak, highest_streak, last_win_date)
    VALUES (NEW.player_id, 0, 0, NEW.date)
    ON CONFLICT (player_id) DO UPDATE SET
      current_streak = 0,  -- Loss breaks streak completely
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Simple recalculation function - FIXED VARIABLE NAMES
CREATE OR REPLACE FUNCTION recalculate_streaks_strict_simple()
RETURNS TEXT AS $$
DECLARE
  player_record RECORD;
  game_record RECORD;
  calc_current_streak INTEGER;  -- RENAMED: was current_streak
  calc_highest_streak INTEGER;  -- RENAMED: was highest_streak  
  calc_streak_start DATE;       -- RENAMED: was streak_start
  calc_last_win DATE;           -- RENAMED: was last_win
  processed_count INTEGER := 0;
BEGIN
  -- Process each player's historical data
  FOR player_record IN 
    SELECT DISTINCT player_id FROM leaderboard_summary ORDER BY player_id
  LOOP
    calc_current_streak := 0;
    calc_highest_streak := 0;
    calc_streak_start := NULL;
    calc_last_win := NULL;
    
    -- Get existing highest streak to preserve it
    SELECT COALESCE(ps.highest_streak, 0) INTO calc_highest_streak 
    FROM player_streaks ps 
    WHERE ps.player_id = player_record.player_id;
    
    -- Process games in chronological order with STRICT consecutive logic
    FOR game_record IN 
      SELECT rank, date 
      FROM leaderboard_summary 
      WHERE player_id = player_record.player_id 
      ORDER BY date ASC
    LOOP
      IF game_record.rank = 1 THEN
        -- Win: check for STRICT consecutive requirement (exactly 1 day)
        IF calc_last_win IS NOT NULL AND game_record.date = calc_last_win + INTERVAL '1 day' THEN
          -- Consecutive win (exactly 1 day apart)
          calc_current_streak := calc_current_streak + 1;
        ELSE
          -- New streak starts (any gap breaks it)
          calc_current_streak := 1;
          calc_streak_start := game_record.date;
        END IF;
        
        -- Update highest streak (keep max of old value and new calculations)
        calc_highest_streak := GREATEST(calc_highest_streak, calc_current_streak);
        calc_last_win := game_record.date;
      ELSE
        -- Loss: reset current streak to 0
        calc_current_streak := 0;
      END IF;
    END LOOP;
    
    -- Update final streak data for this player (NOW NO AMBIGUITY)
    UPDATE player_streaks SET
      current_streak = calc_current_streak,
      highest_streak = GREATEST(player_streaks.highest_streak, calc_highest_streak),
      streak_start_date = calc_streak_start,
      last_win_date = calc_last_win,
      updated_at = NOW()
    WHERE player_id = player_record.player_id;
    
    processed_count := processed_count + 1;
  END LOOP;
  
  RETURN 'Recalculated streaks for ' || processed_count || ' players';
END;
$$ LANGUAGE plpgsql;

-- Step 3: Replace the old function atomically
DROP TRIGGER IF EXISTS trigger_update_streaks ON leaderboard_summary;
DROP FUNCTION IF EXISTS update_player_streaks();
ALTER FUNCTION update_player_streaks_strict_v2() RENAME TO update_player_streaks;

-- Step 4: Create new trigger
CREATE TRIGGER trigger_update_streaks
AFTER INSERT OR UPDATE ON leaderboard_summary
FOR EACH ROW EXECUTE FUNCTION update_player_streaks();

-- Step 5: Apply the recalculation
SELECT recalculate_streaks_strict_simple(); 