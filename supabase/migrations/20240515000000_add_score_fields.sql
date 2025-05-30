-- Add score fields to scores table
ALTER TABLE scores
ADD COLUMN score INTEGER NOT NULL DEFAULT 0,
ADD COLUMN base_score INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN guess_penalty INTEGER NOT NULL DEFAULT 0,
ADD COLUMN time_penalty INTEGER NOT NULL DEFAULT 0,
ADD COLUMN hint_penalty INTEGER NOT NULL DEFAULT 0;

-- Add index for score ordering
CREATE INDEX idx_scores_score ON scores(score DESC);

-- Update leaderboard_summary table
ALTER TABLE leaderboard_summary
DROP COLUMN best_time_seconds,
ADD COLUMN score INTEGER NOT NULL DEFAULT 0,
ADD COLUMN completion_time_seconds INTEGER NOT NULL DEFAULT 0;

-- Add index for score ordering
CREATE INDEX idx_leaderboard_summary_score ON leaderboard_summary(score DESC);

-- Update existing scores with calculated values
UPDATE scores
SET score = 
  CASE 
    WHEN was_correct THEN 
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
  guess_penalty = CASE WHEN was_correct THEN (guesses_used - 1) * 100 ELSE 0 END,
  time_penalty = CASE WHEN was_correct THEN FLOOR(completion_time_seconds / 10) * 10 ELSE 0 END,
  hint_penalty = CASE WHEN was_correct AND used_hint THEN 200 ELSE 0 END;

-- Update leaderboard summary with scores
UPDATE leaderboard_summary ls
SET score = s.score
FROM scores s
WHERE ls.player_id = s.player_id
AND ls.word_id = s.word_id; 