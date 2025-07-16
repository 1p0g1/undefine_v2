-- FIXED VERSION: Continue from where you left off
-- Run these queries to complete the verification

-- =============================================================================
-- PART 3: DATA FLOW VERIFICATION (CONTINUED)
-- =============================================================================

-- Check corresponding leaderboard entries (FIXED VERSION)
SELECT 
    ls.player_id,
    ls.word_id,
    ls.rank,
    ls.best_time,
    ls.guesses_used,
    ls.was_top_10,
    ls.date,
    p.display_name
FROM leaderboard_summary ls
JOIN players p ON ls.player_id = p.id
WHERE ls.word_id IN (
    SELECT word_id
    FROM game_sessions
    WHERE is_complete = true
    AND is_won = true
    AND created_at >= CURRENT_DATE - INTERVAL '5 days'
)
ORDER BY ls.word_id, ls.rank;

-- =============================================================================
-- PART 4: LEADERBOARD RANKING VERIFICATION
-- =============================================================================

-- Check if rankings are properly ordered (should be sequential 1,2,3,...)
SELECT 
    word_id,
    rank,
    best_time,
    guesses_used,
    player_id,
    LAG(rank) OVER (PARTITION BY word_id ORDER BY rank) as prev_rank,
    rank - LAG(rank) OVER (PARTITION BY word_id ORDER BY rank) as rank_gap
FROM leaderboard_summary
WHERE date >= CURRENT_DATE - INTERVAL '3 days'
ORDER BY word_id, rank;

-- Check for any ranking gaps or duplicates
SELECT 
    word_id,
    rank,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 1 THEN '❌ DUPLICATE RANK'
        ELSE '✅ UNIQUE RANK'
    END as status
FROM leaderboard_summary
WHERE date >= CURRENT_DATE - INTERVAL '3 days'
GROUP BY word_id, rank
HAVING COUNT(*) > 1
ORDER BY word_id, rank;

-- =============================================================================
-- PART 5: REAL-TIME LEADERBOARD API VERIFICATION
-- =============================================================================

-- Simulate what /api/leaderboard returns (most recent word)
WITH latest_word AS (
    SELECT word_id, MAX(created_at) as latest_game
    FROM game_sessions
    WHERE is_complete = true
    GROUP BY word_id
    ORDER BY latest_game DESC
    LIMIT 1
)
SELECT 
    ls.rank,
    p.display_name,
    ls.best_time,
    ls.guesses_used,
    ls.was_top_10,
    '✅ API DATA' as verification_status
FROM leaderboard_summary ls
JOIN players p ON ls.player_id = p.id
JOIN latest_word lw ON ls.word_id = lw.word_id
ORDER BY ls.rank
LIMIT 20;

-- =============================================================================
-- PART 6: TRIGGER VERIFICATION
-- =============================================================================

-- Check if triggers are actually firing (look for recent trigger activity)
SELECT 
    COUNT(*) as total_completions,
    COUNT(CASE WHEN is_won = true THEN 1 END) as won_games,
    MAX(created_at) as latest_completion
FROM game_sessions
WHERE is_complete = true
AND created_at >= CURRENT_DATE - INTERVAL '2 days';

-- Check corresponding leaderboard entries for same timeframe
SELECT 
    COUNT(*) as leaderboard_entries,
    MAX(date) as latest_leaderboard_date,
    COUNT(DISTINCT word_id) as unique_words
FROM leaderboard_summary
WHERE date >= CURRENT_DATE - INTERVAL '2 days';

-- =============================================================================
-- PART 7: SYSTEM HEALTH CHECK
-- =============================================================================

-- Final health check: Are triggers keeping data in sync?
SELECT 
    'game_sessions' as table_name,
    COUNT(CASE WHEN is_complete = true AND is_won = true THEN 1 END) as won_games_count,
    MAX(created_at) as latest_activity
FROM game_sessions
WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'

UNION ALL

SELECT 
    'leaderboard_summary' as table_name,
    COUNT(*) as leaderboard_entries_count,
    MAX(date::timestamp) as latest_activity
FROM leaderboard_summary
WHERE date >= CURRENT_DATE - INTERVAL '1 day';

-- =============================================================================
-- VERIFICATION SUMMARY
-- =============================================================================

-- Final verification summary
SELECT 
    '🎯 LEADERBOARD SYSTEM STATUS' as status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM game_sessions 
            WHERE is_complete = true 
            AND created_at >= CURRENT_DATE - INTERVAL '1 day'
        ) 
        AND EXISTS (
            SELECT 1 FROM leaderboard_summary 
            WHERE date >= CURRENT_DATE - INTERVAL '1 day'
        )
        THEN '✅ SYSTEM OPERATIONAL'
        ELSE '❌ SYSTEM ISSUES DETECTED'
    END as verification_result; 