-- Migration: 20241201000003_fix_scores_conflict
-- Description: Fix scores insert without ON CONFLICT since no unique constraint exists
-- Author: Project Team
-- Date: 2024-12-01

-- Insert scores entries without ON CONFLICT (scores table has no unique constraint)
-- Use WHERE NOT EXISTS to avoid duplicates
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
SELECT 
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
FROM (VALUES 
  ('test-player-001', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6', 2, 45, true, 950, 1000, 100, 50, 0),
  ('test-player-002', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6', 2, 52, true, 920, 1000, 100, 80, 0),
  ('test-player-003', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6', 3, 38, true, 890, 1000, 150, 60, 0),
  ('test-player-004', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6', 3, 67, true, 850, 1000, 150, 100, 0),
  ('test-player-005', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6', 4, 89, true, 820, 1000, 200, 130, 0)
) AS new_scores(player_id, word_id, guesses_used, completion_time_seconds, correct, score, base_score, guess_penalty, time_penalty, hint_penalty)
WHERE NOT EXISTS (
  SELECT 1 FROM scores s 
  WHERE s.player_id = new_scores.player_id 
  AND s.word_id = new_scores.word_id::uuid
); 