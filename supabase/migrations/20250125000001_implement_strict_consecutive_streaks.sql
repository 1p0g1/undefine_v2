-- Implement Strict Consecutive Daily Streak System
-- Date: January 25, 2025
-- Purpose: Enforce consecutive daily play requirements for streaks (no gap tolerance)
-- Breaking Change: Replaces forgiving 7-day gap system with strict daily requirements

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_update_streaks ON leaderboard_summary;
DROP FUNCTION IF EXISTS update_player_streaks();

-- Create new STRICT consecutive daily streak function
CREATE OR REPLACE FUNCTION update_player_streaks()
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

-- Create trigger with strict consecutive logic
CREATE TRIGGER trigger_update_streaks
AFTER INSERT OR UPDATE ON leaderboard_summary
FOR EACH ROW EXECUTE FUNCTION update_player_streaks();

-- Recalculate all player streaks with STRICT consecutive logic
CREATE OR REPLACE FUNCTION recalculate_all_streaks_strict()
RETURNS TEXT AS $$
DECLARE
  player_record RECORD;
  game_record RECORD;
  current_streak INTEGER;
  highest_streak INTEGER;
  streak_start DATE;
  last_win DATE;
  processed_count INTEGER := 0;
BEGIN
  -- Preserve highest_streak values but recalculate current_streak with strict rules
  -- This keeps users' personal bests while applying new consecutive requirements
  
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
    
    -- Process games in chronological order
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
    
    -- Insert/update final streak data for this player
    INSERT INTO player_streaks (
      player_id, 
      current_streak, 
      highest_streak, 
      streak_start_date, 
      last_win_date,
      updated_at
    ) VALUES (
      player_record.player_id,
      current_streak,
      highest_streak,
      streak_start,
      last_win,
      NOW()
    )
    ON CONFLICT (player_id) DO UPDATE SET
      current_streak = EXCLUDED.current_streak,
      highest_streak = GREATEST(player_streaks.highest_streak, EXCLUDED.highest_streak), -- Preserve old personal bests
      streak_start_date = EXCLUDED.streak_start_date,
      last_win_date = EXCLUDED.last_win_date,
      updated_at = NOW();
    
    processed_count := processed_count + 1;
  END LOOP;
  
  RETURN 'Recalculated streaks for ' || processed_count || ' players with STRICT consecutive daily logic. Preserved existing highest_streak values.';
END;
$$ LANGUAGE plpgsql;

-- Execute recalculation to apply strict logic
SELECT recalculate_all_streaks_strict();

-- Add comments explaining the new system
COMMENT ON FUNCTION update_player_streaks() IS 'STRICT consecutive daily streak system - ANY gap breaks current streak, but preserves highest_streak achievements';
COMMENT ON COLUMN player_streaks.current_streak IS 'Current consecutive daily wins (STRICT: must play every day)';
COMMENT ON COLUMN player_streaks.highest_streak IS 'Best consecutive daily streak ever achieved (preserved from old system)';

-- Log the change
DO $$
BEGIN
  RAISE NOTICE 'STREAK SYSTEM UPDATED: Now requires strict consecutive daily play. Existing highest_streak values preserved, but current_streak recalculated with no gap tolerance.';
END $$; 