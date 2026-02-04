-- Fix ranking algorithm: prioritize fewer guesses over faster time
-- This ensures players who solve in fewer guesses rank higher

-- Drop existing ranking function and trigger
DROP TRIGGER IF EXISTS update_rankings_on_leaderboard_change ON leaderboard_summary;
DROP TRIGGER IF EXISTS update_rankings_after_leaderboard_change ON leaderboard_summary;
DROP FUNCTION IF EXISTS update_leaderboard_rankings() CASCADE;

-- Create new ranking function with correct priority:
-- 1. Fewer guesses (primary)
-- 2. Faster time (secondary)
-- 3. More fuzzy matches (tertiary - optional)
CREATE OR REPLACE FUNCTION update_leaderboard_rankings()
RETURNS TRIGGER AS $$
BEGIN
  -- Update rankings for the affected word
  UPDATE leaderboard_summary 
  SET rank = subquery.new_rank,
      was_top_10 = subquery.new_rank <= 10
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY word_id
        ORDER BY 
          guesses_used ASC,           -- PRIMARY: fewer guesses rank better
          best_time ASC,              -- SECONDARY: faster time breaks ties
          COALESCE(fuzzy_bonus, 0) DESC  -- TERTIARY: more fuzzy matches (if exists)
      ) as new_rank
    FROM leaderboard_summary 
    WHERE word_id = COALESCE(NEW.word_id, OLD.word_id)
  ) subquery
  WHERE leaderboard_summary.id = subquery.id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic ranking updates
CREATE TRIGGER update_rankings_after_leaderboard_change
  AFTER INSERT OR UPDATE OR DELETE ON leaderboard_summary
  FOR EACH ROW
  EXECUTE FUNCTION update_leaderboard_rankings();

-- Recalculate ALL existing rankings with correct algorithm
UPDATE leaderboard_summary 
SET rank = subquery.new_rank,
    was_top_10 = subquery.new_rank <= 10
FROM (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY word_id
      ORDER BY 
        guesses_used ASC,           -- PRIMARY: fewer guesses rank better
        best_time ASC,              -- SECONDARY: faster time breaks ties
        COALESCE(fuzzy_bonus, 0) DESC  -- TERTIARY: more fuzzy matches
    ) as new_rank
  FROM leaderboard_summary 
) subquery
WHERE leaderboard_summary.id = subquery.id;

-- Add comment for documentation
COMMENT ON FUNCTION update_leaderboard_rankings() IS 
  'Updates rankings prioritizing: 1) fewer guesses, 2) faster time, 3) more fuzzy matches';
