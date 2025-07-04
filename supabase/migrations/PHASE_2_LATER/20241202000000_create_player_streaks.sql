-- Create player_streaks table for tracking win streaks
-- This supports the simplified all-time leaderboard system

CREATE TABLE IF NOT EXISTS player_streaks (
  player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  highest_streak INTEGER NOT NULL DEFAULT 0,
  streak_start_date DATE,
  last_win_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient leaderboard queries
CREATE INDEX IF NOT EXISTS idx_player_streaks_highest ON player_streaks(highest_streak DESC);
CREATE INDEX IF NOT EXISTS idx_player_streaks_current ON player_streaks(current_streak DESC);
CREATE INDEX IF NOT EXISTS idx_player_streaks_last_win ON player_streaks(last_win_date DESC);

-- Function to update player streaks when leaderboard_summary changes
CREATE OR REPLACE FUNCTION update_player_streaks()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process wins (rank = 1)
  IF NEW.rank = 1 THEN
    -- Handle consecutive wins and new streaks
    INSERT INTO player_streaks (player_id, current_streak, highest_streak, streak_start_date, last_win_date)
    VALUES (NEW.player_id, 1, 1, NEW.date, NEW.date)
    ON CONFLICT (player_id) DO UPDATE SET
      current_streak = CASE 
        -- Consecutive win: increment streak if last win was yesterday
        WHEN player_streaks.last_win_date = NEW.date - INTERVAL '1 day' 
        THEN player_streaks.current_streak + 1
        -- New streak: reset to 1 if there was a gap
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
    -- Loss: reset current streak to 0, keep highest_streak
    INSERT INTO player_streaks (player_id, current_streak, highest_streak, last_win_date)
    VALUES (NEW.player_id, 0, 0, NEW.date)
    ON CONFLICT (player_id) DO UPDATE SET
      current_streak = 0,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on leaderboard_summary to automatically update streaks
DROP TRIGGER IF EXISTS trigger_update_streaks ON leaderboard_summary;
CREATE TRIGGER trigger_update_streaks
AFTER INSERT OR UPDATE ON leaderboard_summary
FOR EACH ROW EXECUTE FUNCTION update_player_streaks();

-- Function to backfill historical streaks from existing leaderboard_summary data
CREATE OR REPLACE FUNCTION backfill_player_streaks()
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
  -- Clear existing streak data
  DELETE FROM player_streaks;
  
  -- Process each player's historical data
  FOR player_record IN 
    SELECT DISTINCT player_id FROM leaderboard_summary ORDER BY player_id
  LOOP
    current_streak := 0;
    highest_streak := 0;
    streak_start := NULL;
    last_win := NULL;
    
    -- Process games in chronological order
    FOR game_record IN 
      SELECT rank, date 
      FROM leaderboard_summary 
      WHERE player_id = player_record.player_id 
      ORDER BY date ASC
    LOOP
      IF game_record.rank = 1 THEN
        -- Win: increment or start new streak
        IF last_win IS NOT NULL AND game_record.date = last_win + INTERVAL '1 day' THEN
          -- Consecutive win
          current_streak := current_streak + 1;
        ELSE
          -- New streak
          current_streak := 1;
          streak_start := game_record.date;
        END IF;
        
        -- Update highest streak
        highest_streak := GREATEST(highest_streak, current_streak);
        last_win := game_record.date;
      ELSE
        -- Loss: reset current streak
        current_streak := 0;
      END IF;
    END LOOP;
    
    -- Insert final streak data for this player
    IF last_win IS NOT NULL THEN
      INSERT INTO player_streaks (
        player_id, 
        current_streak, 
        highest_streak, 
        streak_start_date, 
        last_win_date
      ) VALUES (
        player_record.player_id,
        current_streak,
        highest_streak,
        streak_start,
        last_win
      );
      
      processed_count := processed_count + 1;
    END IF;
  END LOOP;
  
  RETURN 'Backfilled streaks for ' || processed_count || ' players';
END;
$$ LANGUAGE plpgsql;

-- Execute backfill function to populate historical data
SELECT backfill_player_streaks();

-- Add helpful comments
COMMENT ON TABLE player_streaks IS 'Tracks win streaks for all-time leaderboard system';
COMMENT ON COLUMN player_streaks.current_streak IS 'Current consecutive wins (0 if last game was not a win)';
COMMENT ON COLUMN player_streaks.highest_streak IS 'Best streak ever achieved by this player';
COMMENT ON COLUMN player_streaks.streak_start_date IS 'Date the current streak started';
COMMENT ON COLUMN player_streaks.last_win_date IS 'Most recent win date'; 