-- Quick Leaderboard System Health Check
-- Run these queries one by one in Supabase SQL Editor

-- 1. Check if core tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('game_sessions', 'leaderboard_summary', 'players', 'scores') THEN '✅ REQUIRED'
        ELSE '📊 OPTIONAL'
    END as importance
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'game_sessions', 
    'leaderboard_summary', 
    'players', 
    'scores', 
    'daily_leaderboard_snapshots',
    'player_streaks',
    'trigger_log'
)
ORDER BY table_name;

-- 2. Check if triggers exist
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation,
    CASE 
        WHEN trigger_name = 'update_leaderboard_on_game_complete' THEN '✅ GAME TRIGGER'
        WHEN trigger_name = 'update_rankings_after_leaderboard_change' THEN '✅ RANKING TRIGGER'
        ELSE '❓ OTHER'
    END as trigger_type
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%leaderboard%'
ORDER BY trigger_name;

-- 3. Check recent game activity
SELECT 
    COUNT(*) as total_games,
    COUNT(CASE WHEN is_won THEN 1 END) as won_games,
    COUNT(CASE WHEN is_complete AND is_won THEN 1 END) as completed_wins,
    MAX(created_at) as most_recent_game
FROM game_sessions
WHERE created_at > NOW() - INTERVAL '7 days';

-- 4. Check leaderboard population
SELECT 
    COUNT(DISTINCT player_id) as unique_players,
    COUNT(DISTINCT word_id) as unique_words,
    COUNT(*) as total_leaderboard_entries,
    MAX(date) as most_recent_entry
FROM leaderboard_summary;

-- 5. Test ranking algorithm on recent word
WITH recent_word AS (
    SELECT word_id
    FROM leaderboard_summary
    ORDER BY date DESC
    LIMIT 1
)
SELECT 
    rank,
    best_time,
    guesses_used,
    was_top_10,
    CASE 
        WHEN rank <= 10 AND was_top_10 THEN '✅ CORRECT'
        WHEN rank > 10 AND NOT was_top_10 THEN '✅ CORRECT'
        ELSE '❌ MISMATCH'
    END as top_10_status
FROM leaderboard_summary
WHERE word_id = (SELECT word_id FROM recent_word)
ORDER BY rank
LIMIT 15;

-- 6. Check for missing leaderboard entries
SELECT 
    COUNT(CASE WHEN ls.player_id IS NULL THEN 1 END) as missing_entries,
    COUNT(CASE WHEN ls.player_id IS NOT NULL THEN 1 END) as found_entries,
    ROUND(
        COUNT(CASE WHEN ls.player_id IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2
    ) as success_rate_percent
FROM game_sessions gs
LEFT JOIN leaderboard_summary ls ON gs.player_id = ls.player_id AND gs.word_id = ls.word_id
WHERE gs.is_complete = true
AND gs.is_won = true
AND gs.end_time > NOW() - INTERVAL '7 days';

-- 7. Check trigger activity (if trigger_log exists)
SELECT 
    trigger_name,
    COUNT(*) as executions,
    MAX(executed_at) as last_execution,
    AVG(EXTRACT(EPOCH FROM execution_time)) as avg_seconds
FROM trigger_log
WHERE trigger_name IN (
    'update_leaderboard_from_game',
    'update_leaderboard_rankings'
)
AND executed_at > NOW() - INTERVAL '7 days'
GROUP BY trigger_name
ORDER BY trigger_name; 