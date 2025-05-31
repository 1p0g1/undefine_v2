-- Drop existing leaderboard_summary table and its dependencies
DROP TABLE IF EXISTS leaderboard_summary CASCADE;

-- Recreate leaderboard_summary table with correct structure
CREATE TABLE leaderboard_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id TEXT NOT NULL REFERENCES players(id),
  word_id UUID NOT NULL REFERENCES words(id),
  rank INTEGER NOT NULL,
  was_top_10 BOOLEAN DEFAULT FALSE,
  score INTEGER NOT NULL,
  completion_time_seconds INTEGER NOT NULL,
  guesses_used INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, word_id)
);

-- Create indices for performance
CREATE INDEX idx_leaderboard_summary_player_id ON leaderboard_summary(player_id);
CREATE INDEX idx_leaderboard_summary_word_id ON leaderboard_summary(word_id);
CREATE INDEX idx_leaderboard_summary_rank ON leaderboard_summary(rank);
CREATE INDEX idx_leaderboard_summary_score ON leaderboard_summary(score DESC);

-- Populate leaderboard_summary from scores table
WITH ranked_scores AS (
  SELECT 
    s.player_id,
    s.word_id,
    s.guesses_used,
    s.completion_time_seconds,
    s.score,
    ROW_NUMBER() OVER (
      PARTITION BY s.word_id
      ORDER BY s.score DESC, s.completion_time_seconds ASC
    ) as rank
  FROM scores s
  WHERE s.was_correct = true
)
INSERT INTO leaderboard_summary (
  player_id,
  word_id,
  rank,
  was_top_10,
  score,
  completion_time_seconds,
  guesses_used
)
SELECT 
  player_id,
  word_id,
  rank,
  rank <= 10 as was_top_10,
  score,
  completion_time_seconds,
  guesses_used
FROM ranked_scores
ON CONFLICT (player_id, word_id) 
DO UPDATE SET
  rank = EXCLUDED.rank,
  was_top_10 = EXCLUDED.was_top_10,
  score = EXCLUDED.score,
  completion_time_seconds = EXCLUDED.completion_time_seconds,
  guesses_used = EXCLUDED.guesses_used;

-- Create function to update leaderboard rankings
CREATE OR REPLACE FUNCTION update_leaderboard_rankings(target_word_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Recalculate rankings for the specified word
  WITH ranked_scores AS (
    SELECT 
      player_id,
      word_id,
      score,
      completion_time_seconds,
      guesses_used,
      ROW_NUMBER() OVER (
        PARTITION BY word_id
        ORDER BY score DESC, completion_time_seconds ASC
      ) as new_rank
    FROM leaderboard_summary
    WHERE word_id = target_word_id
  )
  UPDATE leaderboard_summary ls
  SET 
    rank = rs.new_rank,
    was_top_10 = rs.new_rank <= 10
  FROM ranked_scores rs
  WHERE ls.player_id = rs.player_id 
    AND ls.word_id = rs.word_id;
END;
$$;

-- Create trigger to automatically update rankings when leaderboard changes
CREATE OR REPLACE FUNCTION trigger_update_leaderboard_rankings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM update_leaderboard_rankings(NEW.word_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_rankings_after_leaderboard_change
AFTER INSERT OR UPDATE ON leaderboard_summary
FOR EACH ROW
EXECUTE FUNCTION trigger_update_leaderboard_rankings(); 