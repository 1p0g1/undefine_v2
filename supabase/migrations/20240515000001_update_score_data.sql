-- Update existing scores with calculated values
UPDATE scores
SET score = 
  CASE 
    WHEN correct THEN 
      GREATEST(
        0,
        1000 - 
        ((guesses_used - 1) * 100) - 
        (FLOOR(completion_time_seconds / 10) * 10) -
        (CASE WHEN used_hint THEN 200 ELSE 0 END)
      )
    ELSE 0
  END,
  base_score = 1000,
  guess_penalty = CASE WHEN correct THEN (guesses_used - 1) * 100 ELSE 0 END,
  time_penalty = CASE WHEN correct THEN FLOOR(completion_time_seconds / 10) * 10 ELSE 0 END,
  hint_penalty = CASE WHEN correct AND used_hint THEN 200 ELSE 0 END;

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
WHERE s.correct = true
ON CONFLICT (player_id, word_id) 
DO UPDATE SET 
  score = EXCLUDED.score,
  completion_time_seconds = EXCLUDED.completion_time_seconds; 