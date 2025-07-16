-- Un•Define Leaderboard System Verification Script
-- Run these queries in Supabase SQL Editor to verify system architecture

-- =============================================================================
-- PART 1: TABLE STRUCTURE VERIFICATION
-- =============================================================================

-- Check if all expected tables exist
SELECT 
    table_name,
    table_type
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

-- Verify leaderboard_summary table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'leaderboard_summary'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check foreign key constraints
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'leaderboard_summary'
AND tc.constraint_type = 'FOREIGN KEY';

-- =============================================================================
-- PART 2: TRIGGER VERIFICATION
-- =============================================================================

-- Check if triggers exist
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    trigger_schema,
    action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name IN (
    'update_leaderboard_on_game_complete',
    'update_rankings_after_leaderboard_change'
)
ORDER BY trigger_name;

-- Check trigger functions exist
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'update_leaderboard_from_game',
    'update_leaderboard_rankings',
    'finalize_daily_leaderboard'
)
ORDER BY routine_name;

-- =============================================================================
-- PART 3: DATA FLOW VERIFICATION
-- =============================================================================

-- Check recent game completions
SELECT 
    player_id,
    word_id,
    is_complete,
    is_won,
    start_time,
    end_time,
    guesses_used,
    created_at
FROM game_sessions
WHERE is_complete = true
AND is_won = true
ORDER BY created_at DESC
LIMIT 10;

-- Check corresponding leaderboard entries
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
    SELECT DISTINCT word_id
    FROM game_sessions
    WHERE is_complete = true
    AND is_won = true
    ORDER BY created_at DESC
    LIMIT 5
)
ORDER BY ls.word_id, ls.rank;

-- =============================================================================
-- PART 4: RANKING ALGORITHM VERIFICATION
-- =============================================================================

-- Test ranking logic for a specific word
WITH word_to_check AS (
    SELECT word_id
    FROM leaderboard_summary
    GROUP BY word_id
    HAVING COUNT(*) > 1
    LIMIT 1
),
manual_rankings AS (
    SELECT 
        player_id,
        word_id,
        best_time,
        guesses_used,
        ROW_NUMBER() OVER (ORDER BY best_time ASC, guesses_used ASC) as calculated_rank
    FROM leaderboard_summary
    WHERE word_id = (SELECT word_id FROM word_to_check)
)
SELECT 
    mr.player_id,
    mr.calculated_rank,
    ls.rank as stored_rank,
    mr.best_time,
    mr.guesses_used,
    ls.was_top_10,
    CASE 
        WHEN mr.calculated_rank = ls.rank THEN '✅ CORRECT'
        ELSE '❌ MISMATCH'
    END as rank_status
FROM manual_rankings mr
JOIN leaderboard_summary ls ON mr.player_id = ls.player_id AND mr.word_id = ls.word_id
ORDER BY mr.calculated_rank;

-- =============================================================================
-- PART 5: TRIGGER ACTIVITY VERIFICATION
-- =============================================================================

-- Check recent trigger executions
SELECT 
    trigger_name,
    table_name,
    operation,
    executed_at,
    execution_time
FROM trigger_log
WHERE trigger_name IN (
    'update_leaderboard_from_game',
    'update_leaderboard_rankings'
)
ORDER BY executed_at DESC
LIMIT 20;

-- Check trigger performance
SELECT 
    trigger_name,
    COUNT(*) as execution_count,
    AVG(EXTRACT(EPOCH FROM execution_time)) as avg_execution_seconds,
    MAX(EXTRACT(EPOCH FROM execution_time)) as max_execution_seconds,
    MAX(executed_at) as last_execution
FROM trigger_log
WHERE trigger_name IN (
    'update_leaderboard_from_game',
    'update_leaderboard_rankings'
)
GROUP BY trigger_name
ORDER BY avg_execution_seconds DESC;

-- =============================================================================
-- PART 6: DAILY SNAPSHOTS VERIFICATION
-- =============================================================================

-- Check if daily snapshots exist
SELECT 
    word_id,
    date,
    total_players,
    is_finalized,
    finalized_at,
    created_at
FROM daily_leaderboard_snapshots
ORDER BY date DESC, created_at DESC
LIMIT 10;

-- Check snapshot content structure
SELECT 
    word_id,
    date,
    jsonb_array_length(final_rankings) as ranking_count,
    jsonb_path_query_first(final_rankings, '$[0]') as first_place_data
FROM daily_leaderboard_snapshots
WHERE is_finalized = true
ORDER BY date DESC
LIMIT 3;

-- =============================================================================
-- PART 7: DATA CONSISTENCY CHECKS
-- =============================================================================

-- Find game completions that should have leaderboard entries but don't
SELECT 
    gs.player_id,
    gs.word_id,
    gs.end_time,
    gs.guesses_used,
    CASE 
        WHEN ls.player_id IS NULL THEN '❌ MISSING FROM LEADERBOARD'
        ELSE '✅ FOUND IN LEADERBOARD'
    END as status
FROM game_sessions gs
LEFT JOIN leaderboard_summary ls ON gs.player_id = ls.player_id AND gs.word_id = ls.word_id
WHERE gs.is_complete = true
AND gs.is_won = true
AND gs.end_time > NOW() - INTERVAL '7 days'
ORDER BY gs.end_time DESC
LIMIT 20;

-- Check for duplicate entries (should be none)
SELECT 
    player_id,
    word_id,
    COUNT(*) as entry_count
FROM leaderboard_summary
GROUP BY player_id, word_id
HAVING COUNT(*) > 1
ORDER BY entry_count DESC;

-- =============================================================================
-- PART 8: PERFORMANCE METRICS
-- =============================================================================

-- Table sizes and performance
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
AND tablename IN ('game_sessions', 'leaderboard_summary', 'players', 'scores')
AND attname IN ('player_id', 'word_id', 'rank', 'best_time')
ORDER BY tablename, attname;

-- Index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND tablename IN ('leaderboard_summary', 'daily_leaderboard_snapshots', 'game_sessions')
ORDER BY tablename, idx_scan DESC;

-- =============================================================================
-- SUMMARY REPORT
-- =============================================================================

-- Generate summary report
SELECT 
    'SYSTEM HEALTH CHECK' as report_section,
    COUNT(DISTINCT gs.player_id) as total_players,
    COUNT(DISTINCT gs.word_id) as total_words,
    COUNT(*) as total_completed_games,
    COUNT(CASE WHEN gs.is_won THEN 1 END) as total_wins,
    COUNT(DISTINCT ls.player_id) as players_in_leaderboard,
    COUNT(DISTINCT ls.word_id) as words_in_leaderboard,
    COUNT(DISTINCT ds.word_id) as words_with_snapshots
FROM game_sessions gs
LEFT JOIN leaderboard_summary ls ON gs.player_id = ls.player_id AND gs.word_id = ls.word_id
LEFT JOIN daily_leaderboard_snapshots ds ON gs.word_id = ds.word_id
WHERE gs.is_complete = true
AND gs.end_time > NOW() - INTERVAL '30 days'; 