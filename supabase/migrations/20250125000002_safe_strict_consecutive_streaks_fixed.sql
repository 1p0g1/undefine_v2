-- Safe Implementation of Strict Consecutive Daily Streak System - FIXED
-- Date: January 25, 2025
-- Purpose: Safely enforce consecutive daily play requirements without disrupting live system
-- Approach: Create new function first, then atomically replace trigger

-- Step 1: Create new STRICT consecutive function (with different name initially)
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

-- Step 2: Create the recalculation function (preserves highest_streak)
CREATE OR REPLACE FUNCTION recalculate_streaks_strict_safe()
RETURNS TEXT AS $$
DECLARE
  player_record RECORD;
  game_record RECORD;
  current_streak INTEGER;
  highest_streak INTEGER;
  streak_start DATE;
  last_win DATE;
  processed_count INTEGER := 0;
  backup_created BOOLEAN := FALSE;
BEGIN
  -- Create backup of current streak data before any changes
  CREATE TEMP TABLE player_streaks_backup AS 
  SELECT * FROM player_streaks;
  backup_created := TRUE;
  
  -- Process each player's historical data
  FOR player_record IN 
    SELECT DISTINCT player_id FROM leaderboard_summary ORDER BY player_id
  LOOP
    current_streak := 0;
    highest_streak := 0;
    streak_start := NULL;
    last_win := NULL;
    
    -- Get existing highest streak to preserve it
    SELECT COALESCE(ps.highest_streak, 0) INTO highest_streak 
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
        IF last_win IS NOT NULL AND game_record.date = last_win + INTERVAL '1 day' THEN
          -- Consecutive win (exactly 1 day apart)
          current_streak := current_streak + 1;
        ELSE
          -- New streak starts (any gap breaks it)
          current_streak := 1;
          streak_start := game_record.date;
        END IF;
        
        -- Update highest streak (keep max of old value and new calculations)
        highest_streak := GREATEST(highest_streak, current_streak);
        last_win := game_record.date;
      ELSE
        -- Loss: reset current streak to 0
        current_streak := 0;
      END IF;
    END LOOP;
    
    -- Update final streak data for this player
    UPDATE player_streaks SET
      current_streak = current_streak,
      highest_streak = GREATEST(player_streaks.highest_streak, highest_streak), -- Preserve old personal bests
      streak_start_date = streak_start,
      last_win_date = last_win,
      updated_at = NOW()
    WHERE player_id = player_record.player_id;
    
    processed_count := processed_count + 1;
  END LOOP;
  
  -- Drop the backup table (cleanup)
  DROP TABLE player_streaks_backup;
  
  RETURN 'SAFELY recalculated streaks for ' || processed_count || ' players with STRICT consecutive logic. Preserved all highest_streak values.';
  
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback on any error
    IF backup_created THEN
      -- Restore from backup
      DELETE FROM player_streaks;
      INSERT INTO player_streaks SELECT * FROM player_streaks_backup;
      DROP TABLE player_streaks_backup;
      RAISE EXCEPTION 'Migration failed, data restored from backup. Error: %', SQLERRM;
    ELSE
      RAISE EXCEPTION 'Migration failed before backup created. Error: %', SQLERRM;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Replace the old function atomically (single transaction)
-- This is the only potentially disruptive step, but it's atomic
DROP TRIGGER IF EXISTS trigger_update_streaks ON leaderboard_summary;
DROP FUNCTION IF EXISTS update_player_streaks();
ALTER FUNCTION update_player_streaks_strict_v2() RENAME TO update_player_streaks;

-- Step 4: Create new trigger
CREATE TRIGGER trigger_update_streaks
AFTER INSERT OR UPDATE ON leaderboard_summary
FOR EACH ROW EXECUTE FUNCTION update_player_streaks();

-- Step 5: Apply the recalculation (this is safe now)
SELECT recalculate_streaks_strict_safe();

-- Step 6: Add documentation
COMMENT ON FUNCTION update_player_streaks() IS 'STRICT consecutive daily streak system (v2) - Requires exactly 1 day between wins, preserves highest_streak values';
COMMENT ON FUNCTION recalculate_streaks_strict_safe() IS 'Safe recalculation with backup/restore on failure'; 