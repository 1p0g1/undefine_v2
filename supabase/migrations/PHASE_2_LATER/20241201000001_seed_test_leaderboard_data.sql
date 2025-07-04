-- Migration: 20241201000001_seed_test_leaderboard_data
-- Description: Seed test data in leaderboard_summary for today's word to verify functionality
-- Author: Project Team
-- Date: 2024-12-01

-- First, ensure test players exist using ON CONFLICT for better idempotency
INSERT INTO players (id, is_anonymous, display_name)
VALUES
    ('test-player-001', true, 'Testy McTestson'),
    ('test-player-002', true, 'Word Smith'),
    ('test-player-003', true, 'Doctor Verbose'),
    ('test-player-004', true, 'Seed McData'),
    ('test-player-005', true, 'Paul Al-Hempo')
ON CONFLICT (id) DO NOTHING;

-- Ensure user_stats entries exist (required for leaderboard_summary foreign key)
-- Initialize all relevant fields as per ERD defaults for newly created test users
INSERT INTO user_stats (
    player_id, games_played, current_streak, longest_streak, 
    best_rank, top_10_count
    -- average_completion_time and last_played_word can be left to default or set to NULL if needed
)
VALUES
    ('test-player-001', 1, 1, 1, 1, 1),
    ('test-player-002', 1, 1, 1, 2, 1),
    ('test-player-003', 1, 1, 1, 3, 1),
    ('test-player-004', 1, 1, 1, 4, 1),
    ('test-player-005', 1, 1, 1, 5, 1)
ON CONFLICT (player_id) DO NOTHING;

-- Ensure the unique constraint for leaderboard_summary exists before inserting
-- This is to support the ON CONFLICT clause below. 
-- The 20241201000005_align_leaderboard_schema.sql migration will formally set this as the PK.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'leaderboard_summary_player_word_date_uq' 
    AND conrelid = 'leaderboard_summary'::regclass
  ) THEN
    ALTER TABLE leaderboard_summary 
    ADD CONSTRAINT leaderboard_summary_player_word_date_uq UNIQUE (player_id, word_id, date);
  END IF;
END $$;

-- Insert test leaderboard entries using CORRECT schema (no score column, use best_time)
INSERT INTO leaderboard_summary (player_id, word_id, rank, was_top_10, best_time, guesses_used, date)
VALUES
    ('test-player-001', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid, 1, true, 45, 2, CURRENT_DATE),
    ('test-player-002', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid, 2, true, 52, 2, CURRENT_DATE),
    ('test-player-003', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid, 3, true, 38, 3, CURRENT_DATE),
    ('test-player-004', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid, 4, true, 67, 3, CURRENT_DATE),
    ('test-player-005', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid, 5, true, 89, 4, CURRENT_DATE)
ON CONFLICT (player_id, word_id, date) DO NOTHING;

-- Ensure the unique constraint for scores exists before inserting
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'scores_player_word_uq' 
    AND conrelid = 'scores'::regclass
  ) THEN
    ALTER TABLE scores 
    ADD CONSTRAINT scores_player_word_uq UNIQUE (player_id, word_id);
  END IF;
END $$;

-- Also add corresponding scores entries for consistency
INSERT INTO scores (player_id, word_id, guesses_used, completion_time_seconds, correct, score, base_score, guess_penalty, time_penalty, hint_penalty, submitted_at)
VALUES
    ('test-player-001', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid, 2, 45, true, 950, 1000, 100, 50, 0, NOW()),
    ('test-player-002', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid, 2, 52, true, 920, 1000, 100, 80, 0, NOW()),
    ('test-player-003', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid, 3, 38, true, 890, 1000, 150, 60, 0, NOW()),
    ('test-player-004', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid, 3, 67, true, 850, 1000, 150, 100, 0, NOW()),
    ('test-player-005', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'::uuid, 4, 89, true, 820, 1000, 200, 130, 0, NOW())
ON CONFLICT (player_id, word_id) DO NOTHING; 