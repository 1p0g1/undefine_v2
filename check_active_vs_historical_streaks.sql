-- Check Active vs Historical Streaks
-- Critical question: Is "current_streak" actually ACTIVE or just historical?

-- Step 1: Check what "current_streak" means with recent activity
SELECT 
  'CURRENT STREAK vs ACTIVITY CHECK' as test,
  p.display_name as player_name,
  ps.current_streak,
  ps.highest_streak,
  ps.last_win_date,
  ps.updated_at as streak_last_updated,
  CURRENT_DATE as today,
  CURRENT_DATE - ps.last_win_date as days_since_last_win,
  CASE 
    WHEN ps.current_streak > 0 AND (CURRENT_DATE - ps.last_win_date) <= 7 THEN 'ACTIVE STREAK'
    WHEN ps.current_streak > 0 AND (CURRENT_DATE - ps.last_win_date) > 7 THEN 'HISTORICAL STREAK'
    ELSE 'NO STREAK'
  END as streak_status
FROM players p
JOIN player_streaks ps ON p.id = ps.player_id
WHERE ps.current_streak > 0
ORDER BY ps.current_streak DESC, ps.last_win_date DESC
LIMIT 10;

-- Step 2: Beth's specific case - is her 11-streak active?
SELECT 
  'BETH STREAK ANALYSIS' as test,
  p.display_name,
  ps.current_streak,
  ps.last_win_date,
  CURRENT_DATE as today,
  CURRENT_DATE - ps.last_win_date as days_since_last_win,
  CASE 
    WHEN (CURRENT_DATE - ps.last_win_date) <= 1 THEN '✅ ACTIVE TODAY'
    WHEN (CURRENT_DATE - ps.last_win_date) <= 3 THEN '🟡 ACTIVE (Few days ago)'  
    WHEN (CURRENT_DATE - ps.last_win_date) <= 7 THEN '🟠 RECENT (This week)'
    ELSE '❌ HISTORICAL (Old streak)'
  END as active_status
FROM players p
JOIN player_streaks ps ON p.id = ps.player_id
WHERE p.id = '277b7094-7c6c-4644-bddf-5dd33e2fec9e';

-- Step 3: Check recent activity to see who's actually playing
SELECT 
  'RECENT GAME ACTIVITY' as test,
  DATE(ls.date) as game_date,
  COUNT(*) as games_completed,
  COUNT(CASE WHEN ls.rank = 1 THEN 1 END) as wins_today
FROM leaderboard_summary ls
WHERE ls.date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(ls.date)
ORDER BY DATE(ls.date) DESC;

-- Step 4: Proposed ACTIVE streak definition
SELECT 
  'PROPOSED ACTIVE STREAKS' as test,
  p.display_name as player_name,
  ps.current_streak as stored_streak,
  ps.last_win_date,
  CURRENT_DATE - ps.last_win_date as days_ago,
  CASE 
    WHEN ps.current_streak > 0 AND (CURRENT_DATE - ps.last_win_date) <= 3 THEN ps.current_streak
    ELSE 0
  END as active_streak,
  ps.highest_streak as personal_best
FROM players p
JOIN player_streaks ps ON p.id = ps.player_id
WHERE ps.current_streak > 0 OR ps.highest_streak > 0
ORDER BY 
  CASE WHEN ps.current_streak > 0 AND (CURRENT_DATE - ps.last_win_date) <= 3 THEN ps.current_streak ELSE 0 END DESC,
  ps.highest_streak DESC
LIMIT 15; 