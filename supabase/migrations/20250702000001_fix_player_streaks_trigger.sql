-- Fix Player Streaks Trigger Logic
-- Issue: Current trigger only counts daily consecutive wins, missing weekly game patterns
-- Solution: Allow 7-day gaps between wins for weekly players

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_update_streaks ON leaderboard_summary;
DROP FUNCTION IF EXISTS update_player_streaks();

-- Create improved trigger function that handles weekly game patterns
CREATE OR REPLACE FUNCTION update_player_streaks()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process rank 1 (wins) in leaderboard_summary
  IF NEW.rank = 1 THEN
    -- Calculate current streak by counting consecutive wins from leaderboard_summary
    WITH recent_wins AS (
      SELECT 
        date,
        ROW_NUMBER() OVER (ORDER BY date DESC) as row_num
      FROM leaderboard_summary 
      WHERE player_id = NEW.player_id 
        AND rank = 1 
        AND date <= NEW.date
      ORDER BY date DESC
    ),
    consecutive_count AS (
      SELECT COUNT(*) as current_streak
      FROM recent_wins
      WHERE row_num <= (
        -- Find first significant date gap (more than 7 days)
        SELECT COALESCE(MIN(row_num), 999)
        FROM (
          SELECT 
            row_num,
            date,
            LAG(date) OVER (ORDER BY row_num) as prev_date,
            CASE 
              WHEN LAG(date) OVER (ORDER BY row_num) IS NULL THEN 0
              WHEN date - LAG(date) OVER (ORDER BY row_num) <= 7 THEN 0  -- Allow weekly gaps
              ELSE 1 
            END as is_break
          FROM recent_wins
        ) gaps
        WHERE is_break = 1
      )
    )
    INSERT INTO player_streaks (player_id, current_streak, highest_streak, streak_start_date, last_win_date)
    SELECT 
      NEW.player_id,
      cc.current_streak,
      cc.current_streak,
      (SELECT MIN(date) FROM recent_wins WHERE row_num <= cc.current_streak),
      NEW.date
    FROM consecutive_count cc
    ON CONFLICT (player_id) DO UPDATE SET
      current_streak = EXCLUDED.current_streak,
      highest_streak = GREATEST(player_streaks.highest_streak, EXCLUDED.current_streak),
      streak_start_date = CASE 
        WHEN EXCLUDED.current_streak = 1 THEN NEW.date
        ELSE EXCLUDED.streak_start_date
      END,
      last_win_date = NEW.date,
      updated_at = NOW();
      
  ELSE
    -- Non-win: recalculate streak (may still have wins from other days)
    WITH recent_wins AS (
      SELECT 
        date,
        ROW_NUMBER() OVER (ORDER BY date DESC) as row_num
      FROM leaderboard_summary 
      WHERE player_id = NEW.player_id 
        AND rank = 1 
        AND date <= NEW.date
      ORDER BY date DESC
    ),
    consecutive_count AS (
      SELECT 
        COALESCE(COUNT(*), 0) as current_streak,
        MAX(date) as last_win
      FROM recent_wins
      WHERE row_num <= (
        SELECT COALESCE(MIN(row_num), 999)
        FROM (
          SELECT 
            row_num,
            date,
            LAG(date) OVER (ORDER BY row_num) as prev_date,
            CASE 
              WHEN LAG(date) OVER (ORDER BY row_num) IS NULL THEN 0
              WHEN date - LAG(date) OVER (ORDER BY row_num) <= 7 THEN 0
              ELSE 1 
            END as is_break
          FROM recent_wins
        ) gaps
        WHERE is_break = 1
      )
    )
    INSERT INTO player_streaks (player_id, current_streak, highest_streak, last_win_date)
    SELECT 
      NEW.player_id,
      cc.current_streak,
      cc.current_streak,
      cc.last_win
    FROM consecutive_count cc
    ON CONFLICT (player_id) DO UPDATE SET
      current_streak = EXCLUDED.current_streak,
      last_win_date = EXCLUDED.last_win_date,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger
CREATE TRIGGER trigger_update_streaks
AFTER INSERT OR UPDATE ON leaderboard_summary
FOR EACH ROW EXECUTE FUNCTION update_player_streaks();

-- Recalculate all player streaks with improved logic
CREATE OR REPLACE FUNCTION recalculate_all_streaks()
RETURNS TEXT AS $$
DECLARE
  player_record RECORD;
  game_record RECORD;
  current_streak INTEGER;
  highest_streak INTEGER;
  streak_start DATE;
  last_win DATE;
  last_game_date DATE;
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
    last_game_date := NULL;
    
    -- Process games in chronological order
    FOR game_record IN 
      SELECT rank, date 
      FROM leaderboard_summary 
      WHERE player_id = player_record.player_id 
      ORDER BY date ASC
    LOOP
      IF game_record.rank = 1 THEN
        -- Win: check if it continues a streak
        IF last_win IS NOT NULL AND game_record.date - last_win <= 7 THEN
          -- Consecutive win (within 7 days)
          current_streak := current_streak + 1;
        ELSE
          -- New streak starts
          current_streak := 1;
          streak_start := game_record.date;
        END IF;
        
        -- Update highest streak
        highest_streak := GREATEST(highest_streak, current_streak);
        last_win := game_record.date;
      ELSE
        -- Non-win: check if it breaks current streak
        IF last_game_date IS NOT NULL AND game_record.date - last_game_date > 7 THEN
          -- Significant gap, reset streak
          current_streak := 0;
        END IF;
      END IF;
      
      last_game_date := game_record.date;
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
  
  RETURN 'Recalculated streaks for ' || processed_count || ' players with improved logic';
END;
$$ LANGUAGE plpgsql;

-- Execute recalculation to fix all historical data
SELECT recalculate_all_streaks(); 