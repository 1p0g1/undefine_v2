-- Seed test leaderboard data for today's word "clear"

-- First, ensure test players exist
INSERT INTO players (id, is_anonymous, display_name)
VALUES 
  ('test-player-001', true, 'Testy McTestson'),
  ('test-player-002', true, 'Word Smith'),
  ('test-player-003', true, 'Doctor Verbose'),
  ('test-player-004', true, 'Seed McData'),
  ('test-player-005', true, 'Paul Al-Hempo')
ON CONFLICT (id) DO NOTHING;

-- Second, create user_stats entries (using correct column names from ERD)
INSERT INTO user_stats (player_id, current_streak, longest_streak, best_rank, top_10_count)
VALUES 
  ('test-player-001', 1, 1, 1, 1),
  ('test-player-002', 1, 1, 2, 1),
  ('test-player-003', 1, 1, 3, 1),
  ('test-player-004', 1, 1, 4, 1),
  ('test-player-005', 1, 1, 5, 1)
ON CONFLICT (player_id) DO NOTHING;

-- Insert test leaderboard entries for today's word (simple INSERT)
INSERT INTO leaderboard_summary (
  id,
  player_id,
  word_id,
  rank,
  was_top_10,
  best_time,
  guesses_used,
  date
)
VALUES 
  (gen_random_uuid(), 'test-player-001', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6', 1, true, 45, 2, CURRENT_DATE),
  (gen_random_uuid(), 'test-player-002', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6', 2, true, 52, 2, CURRENT_DATE), 
  (gen_random_uuid(), 'test-player-003', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6', 3, true, 38, 3, CURRENT_DATE),
  (gen_random_uuid(), 'test-player-004', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6', 4, true, 67, 3, CURRENT_DATE),
  (gen_random_uuid(), 'test-player-005', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6', 5, true, 89, 4, CURRENT_DATE); 