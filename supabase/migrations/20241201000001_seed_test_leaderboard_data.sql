-- Migration: 20241201000001_seed_test_leaderboard_data
-- Description: Seed test data in leaderboard_summary for today's word to verify functionality
-- Author: Project Team
-- Date: 2024-12-01

-- First, ensure test players exist
INSERT INTO players (id, is_anonymous, display_name)
SELECT 'test-player-001', true, 'Testy McTestson'
WHERE NOT EXISTS (SELECT 1 FROM players WHERE id = 'test-player-001')
UNION ALL
SELECT 'test-player-002', true, 'Word Smith'
WHERE NOT EXISTS (SELECT 1 FROM players WHERE id = 'test-player-002')
UNION ALL
SELECT 'test-player-003', true, 'Doctor Verbose'
WHERE NOT EXISTS (SELECT 1 FROM players WHERE id = 'test-player-003')
UNION ALL
SELECT 'test-player-004', true, 'Seed McData'
WHERE NOT EXISTS (SELECT 1 FROM players WHERE id = 'test-player-004')
UNION ALL
SELECT 'test-player-005', true, 'Paul Al-Hempo'
WHERE NOT EXISTS (SELECT 1 FROM players WHERE id = 'test-player-005');

-- Ensure user_stats entries exist (required for leaderboard_summary foreign key)
INSERT INTO user_stats (player_id, current_streak, longest_streak, best_rank, top_10_count)
SELECT 'test-player-001', 1, 1, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM user_stats WHERE player_id = 'test-player-001')
UNION ALL
SELECT 'test-player-002', 1, 1, 2, 1
WHERE NOT EXISTS (SELECT 1 FROM user_stats WHERE player_id = 'test-player-002')
UNION ALL
SELECT 'test-player-003', 1, 1, 3, 1
WHERE NOT EXISTS (SELECT 1 FROM user_stats WHERE player_id = 'test-player-003')
UNION ALL
SELECT 'test-player-004', 1, 1, 4, 1
WHERE NOT EXISTS (SELECT 1 FROM user_stats WHERE player_id = 'test-player-004')
UNION ALL
SELECT 'test-player-005', 1, 1, 5, 1
WHERE NOT EXISTS (SELECT 1 FROM user_stats WHERE player_id = 'test-player-005');

-- Insert test leaderboard entries using CORRECT schema (no score column, use best_time)
INSERT INTO leaderboard_summary (player_id, word_id, rank, was_top_10, best_time, guesses_used, date)
SELECT 'test-player-001', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid, 1, true, 45, 2, CURRENT_DATE
WHERE NOT EXISTS (SELECT 1 FROM leaderboard_summary WHERE player_id = 'test-player-001' AND word_id = 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid)
UNION ALL
SELECT 'test-player-002', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid, 2, true, 52, 2, CURRENT_DATE
WHERE NOT EXISTS (SELECT 1 FROM leaderboard_summary WHERE player_id = 'test-player-002' AND word_id = 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid)
UNION ALL
SELECT 'test-player-003', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid, 3, true, 38, 3, CURRENT_DATE
WHERE NOT EXISTS (SELECT 1 FROM leaderboard_summary WHERE player_id = 'test-player-003' AND word_id = 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid)
UNION ALL
SELECT 'test-player-004', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid, 4, true, 67, 3, CURRENT_DATE
WHERE NOT EXISTS (SELECT 1 FROM leaderboard_summary WHERE player_id = 'test-player-004' AND word_id = 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid)
UNION ALL
SELECT 'test-player-005', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid, 5, true, 89, 4, CURRENT_DATE
WHERE NOT EXISTS (SELECT 1 FROM leaderboard_summary WHERE player_id = 'test-player-005' AND word_id = 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid);

-- Also add corresponding scores entries for consistency
INSERT INTO scores (player_id, word_id, guesses_used, completion_time_seconds, correct, score, base_score, guess_penalty, time_penalty, hint_penalty)
SELECT 'test-player-001', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid, 2, 45, true, 950, 1000, 100, 50, 0
WHERE NOT EXISTS (SELECT 1 FROM scores WHERE player_id = 'test-player-001' AND word_id = 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid)
UNION ALL
SELECT 'test-player-002', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid, 2, 52, true, 920, 1000, 100, 80, 0
WHERE NOT EXISTS (SELECT 1 FROM scores WHERE player_id = 'test-player-002' AND word_id = 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid)
UNION ALL
SELECT 'test-player-003', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid, 3, 38, true, 890, 1000, 150, 60, 0
WHERE NOT EXISTS (SELECT 1 FROM scores WHERE player_id = 'test-player-003' AND word_id = 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid)
UNION ALL
SELECT 'test-player-004', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid, 3, 67, true, 850, 1000, 150, 100, 0
WHERE NOT EXISTS (SELECT 1 FROM scores WHERE player_id = 'test-player-004' AND word_id = 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid)
UNION ALL
SELECT 'test-player-005', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid, 4, 89, true, 820, 1000, 200, 130, 0
WHERE NOT EXISTS (SELECT 1 FROM scores WHERE player_id = 'test-player-005' AND word_id = 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid); 