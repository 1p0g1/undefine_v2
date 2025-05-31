-- Migration: 20241201000001_seed_test_leaderboard_data
-- Description: Seed test data in leaderboard_summary for today's word to verify functionality
-- Author: Project Team
-- Date: 2024-12-01

-- First, ensure test players exist
INSERT INTO players (id, is_anonymous, display_name)
VALUES 
  ('test-player-001', true, 'Testy McTestson'),
  ('test-player-002', true, 'Word Smith'),
  ('test-player-003', true, 'Doctor Verbose'),
  ('test-player-004', true, 'Seed McData'),
  ('test-player-005', true, 'Paul Al-Hempo')
ON CONFLICT (id) DO NOTHING;

-- Get today's word ID (should be "clear")
-- Insert test leaderboard entries for today's word
INSERT INTO leaderboard_summary (
  player_id,
  word_id,
  rank,
  was_top_10,
  score,
  completion_time_seconds,
  guesses_used
)
VALUES 
  ('test-player-001', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6', 1, true, 950, 45, 2),
  ('test-player-002', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6', 2, true, 920, 52, 2), 
  ('test-player-003', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6', 3, true, 890, 38, 3),
  ('test-player-004', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6', 4, true, 850, 67, 3),
  ('test-player-005', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6', 5, true, 820, 89, 4)
ON CONFLICT (player_id, word_id) 
DO UPDATE SET
  rank = EXCLUDED.rank,
  was_top_10 = EXCLUDED.was_top_10,
  score = EXCLUDED.score,
  completion_time_seconds = EXCLUDED.completion_time_seconds,
  guesses_used = EXCLUDED.guesses_used;

-- Also add corresponding scores entries for consistency
INSERT INTO scores (
  player_id,
  word_id,
  guesses_used,
  completion_time_seconds,
  correct,
  score,
  base_score,
  guess_penalty,
  time_penalty,
  hint_penalty
)
VALUES 
  ('test-player-001', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6', 2, 45, true, 950, 1000, 100, 50, 0),
  ('test-player-002', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6', 2, 52, true, 920, 1000, 100, 80, 0),
  ('test-player-003', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6', 3, 38, true, 890, 1000, 150, 60, 0),
  ('test-player-004', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6', 3, 67, true, 850, 1000, 150, 100, 0),
  ('test-player-005', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6', 4, 89, true, 820, 1000, 200, 130, 0)
ON CONFLICT (player_id, word_id) 
DO UPDATE SET
  guesses_used = EXCLUDED.guesses_used,
  completion_time_seconds = EXCLUDED.completion_time_seconds,
  correct = EXCLUDED.correct,
  score = EXCLUDED.score,
  base_score = EXCLUDED.base_score,
  guess_penalty = EXCLUDED.guess_penalty,
  time_penalty = EXCLUDED.time_penalty,
  hint_penalty = EXCLUDED.hint_penalty; 