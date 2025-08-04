-- Let's check what's actually happening in the database
-- Run this in Supabase SQL Editor to see the recent game data

-- Check recent game_sessions to see if is_won is true
SELECT 
    player_id,
    start_time::date as date,
    is_complete,
    is_won,
    end_time
FROM game_sessions 
WHERE start_time >= CURRENT_DATE - INTERVAL '1 day'
AND player_id = '22aa973c-2506-4e08-825f-6546d7353ff'
ORDER BY start_time DESC 
LIMIT 5;

-- Check what the trigger created in player_streaks
SELECT 
    player_id,
    current_streak,
    highest_streak,  
    last_win_date,
    updated_at
FROM player_streaks
WHERE player_id = '22aa973c-2506-4e08-825f-6546d7353ff';
