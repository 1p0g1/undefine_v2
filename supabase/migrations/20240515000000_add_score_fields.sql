-- Part 1: Add score fields to scores table
ALTER TABLE scores
ADD COLUMN score INTEGER NOT NULL DEFAULT 0,
ADD COLUMN base_score INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN guess_penalty INTEGER NOT NULL DEFAULT 0,
ADD COLUMN time_penalty INTEGER NOT NULL DEFAULT 0,
ADD COLUMN hint_penalty INTEGER NOT NULL DEFAULT 0,
ADD COLUMN correct BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for score ordering
CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);

-- Create or update leaderboard_summary table
CREATE TABLE IF NOT EXISTS leaderboard_summary (
  player_id TEXT NOT NULL,
  word_id UUID NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  completion_time_seconds INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (player_id, word_id)
);

-- Add index for score ordering
CREATE INDEX IF NOT EXISTS idx_leaderboard_summary_score ON leaderboard_summary(score DESC);

-- Insert or update leaderboard summary with scores
INSERT INTO leaderboard_summary (player_id, word_id, score, completion_time_seconds)
SELECT 
  s.player_id,
  s.word_id,
  s.score,
  s.completion_time_seconds
FROM scores s
WHERE s.was_correct = true
ON CONFLICT (player_id, word_id) 
DO UPDATE SET 
  score = EXCLUDED.score,
  completion_time_seconds = EXCLUDED.completion_time_seconds; 