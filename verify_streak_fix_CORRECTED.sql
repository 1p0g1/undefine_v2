-- Verify Streak System is Working Correctly
-- Updated with ACTUAL schema column names from database screenshots

-- Step 1: Check Beth's current streak status (should show ~11-12 now)
SELECT 
  '1. BETH CURRENT STATUS' as test_section,
  p.display_name as player_name,
  ps.current_streak as current_streak,
  ps.highest_streak as highest_streak,
  ps.last_win_date,
  ps.streak_start_date,
  ps.updated_at as last_updated
FROM players p
JOIN player_streaks ps ON p.id = ps.player_id
WHERE p.id = '277b7094-7c6c-4644-bddf-5dd33e2fec9e';

-- Step 2: Beth's recent wins from leaderboard_summary (showing the data behind the streak)
SELECT 
  '2. BETH RECENT WINS' as test_section,
  date as win_date,
  rank,
  best_time as completion_time,
  guesses_used,
  -- Calculate gap between wins
  LAG(date) OVER (ORDER BY date) as previous_win,
  date - LAG(date) OVER (ORDER BY date) as days_since_last_win
FROM leaderboard_summary 
WHERE player_id = '277b7094-7c6c-4644-bddf-5dd33e2fec9e'
  AND rank = 1  -- Only wins
  AND date >= '2025-06-01'  -- Recent wins
ORDER BY date DESC
LIMIT 15;

-- Step 3: All players with active streaks (validate system is working broadly)
SELECT 
  '3. CURRENT STREAK LEADERS' as test_section,
  p.display_name as player_name,
  ps.current_streak,
  ps.highest_streak,
  ps.last_win_date,
  ps.streak_start_date
FROM players p
JOIN player_streaks ps ON p.id = ps.player_id
WHERE ps.current_streak > 0
ORDER BY ps.current_streak DESC, ps.highest_streak DESC
LIMIT 10;

-- Step 4: Recent streak updates (verify trigger is active)
SELECT 
  '4. RECENT TRIGGER ACTIVITY' as test_section,
  p.display_name as player_name,
  ps.current_streak,
  ps.highest_streak,
  ps.updated_at,
  CASE 
    WHEN ps.updated_at >= CURRENT_DATE - INTERVAL '7 days' THEN '✅ Recently Active'
    ELSE '⚠️ Older Update'
  END as activity_status
FROM players p
JOIN player_streaks ps ON p.id = ps.player_id
WHERE ps.updated_at IS NOT NULL
ORDER BY ps.updated_at DESC
LIMIT 10;

-- Step 5: Cross-validate Beth's data (manual calculation vs recorded)
WITH beth_recent_wins AS (
  SELECT 
    date,
    rank,
    ROW_NUMBER() OVER (ORDER BY date DESC) as win_sequence
  FROM leaderboard_summary 
  WHERE player_id = '277b7094-7c6c-4644-bddf-5dd33e2fec9e'
    AND rank = 1
    AND date >= '2025-06-01'
  ORDER BY date DESC
),
streak_gaps AS (
  SELECT 
    date,
    win_sequence,
    LAG(date) OVER (ORDER BY date DESC) as next_win_date,
    CASE 
      WHEN LAG(date) OVER (ORDER BY date DESC) IS NULL THEN 0
      WHEN LAG(date) OVER (ORDER BY date DESC) - date <= 7 THEN 0  -- Within 7 days = consecutive
      ELSE 1 
    END as is_streak_break
  FROM beth_recent_wins
),
calculated_streak AS (
  SELECT 
    COUNT(*) as manual_current_streak
  FROM streak_gaps
  WHERE win_sequence <= (
    SELECT COALESCE(MIN(win_sequence), 999)
    FROM streak_gaps 
    WHERE is_streak_break = 1
  )
)
SELECT 
  '5. BETH VALIDATION' as test_section,
  cs.manual_current_streak as calculated_streak,
  (SELECT ps.current_streak FROM player_streaks ps WHERE ps.player_id = '277b7094-7c6c-4644-bddf-5dd33e2fec9e') as recorded_streak,
  CASE 
    WHEN cs.manual_current_streak = (SELECT ps.current_streak FROM player_streaks ps WHERE ps.player_id = '277b7094-7c6c-4644-bddf-5dd33e2fec9e') 
    THEN '✅ MATCH - System Working Correctly'
    ELSE '❌ MISMATCH - Needs Investigation'
  END as validation_result
FROM calculated_streak cs;

-- Step 6: Check trigger exists and is enabled
SELECT 
  '6. TRIGGER STATUS CHECK' as test_section,
  t.tgname as trigger_name,
  c.relname as table_name,
  CASE t.tgtype & 66
    WHEN 2 THEN 'BEFORE'
    ELSE 'AFTER'
  END as timing,
  t.tgenabled as enabled,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'leaderboard_summary'
  AND t.tgname ILIKE '%streak%'
  AND NOT t.tgisinternal;

-- Step 7: Summary of system health
SELECT 
  '7. SYSTEM HEALTH SUMMARY' as test_section,
  'Beth streak: Was 1, now should be ~11-12' as beth_status,
  'Trigger should be active on leaderboard_summary' as trigger_status,
  'All streaks should reflect 7-day gap tolerance' as gap_logic,
  'Recent updates should show trigger firing on new games' as activity_check; 