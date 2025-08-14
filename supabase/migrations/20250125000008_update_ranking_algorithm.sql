-- Update ranking algorithm to prioritize: guesses ASC → time ASC → fuzzy DESC
-- This migration updates the ranking logic to match the new product requirements

-- Drop the existing ranking function if it exists
DROP FUNCTION IF EXISTS update_leaderboard_rankings();

-- Create new ranking function with updated logic
CREATE OR REPLACE FUNCTION update_leaderboard_rankings()
RETURNS TRIGGER AS $$
BEGIN
  -- Update rankings for the affected date
  UPDATE leaderboard_summary 
  SET rank = subquery.new_rank
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        ORDER BY 
          guesses_used ASC,           -- Primary: fewer guesses rank better
          best_time ASC,              -- Secondary: faster time breaks ties
          fuzzy_bonus DESC            -- Tertiary: more fuzzy matches break time ties
      ) as new_rank
    FROM leaderboard_summary 
    WHERE date_key = COALESCE(NEW.date_key, OLD.date_key)
      AND is_won = true
  ) subquery
  WHERE leaderboard_summary.id = subquery.id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_rankings_on_leaderboard_change ON leaderboard_summary;

-- Create new trigger
CREATE TRIGGER update_rankings_on_leaderboard_change
  AFTER INSERT OR UPDATE OR DELETE ON leaderboard_summary
  FOR EACH ROW
  EXECUTE FUNCTION update_leaderboard_rankings();

-- Recalculate all existing rankings with new algorithm
UPDATE leaderboard_summary 
SET rank = subquery.new_rank
FROM (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY date_key
      ORDER BY 
        guesses_used ASC,           -- Primary: fewer guesses rank better
        best_time ASC,              -- Secondary: faster time breaks ties
        fuzzy_bonus DESC            -- Tertiary: more fuzzy matches break time ties
    ) as new_rank
  FROM leaderboard_summary 
  WHERE is_won = true
) subquery
WHERE leaderboard_summary.id = subquery.id;

-- Log the migration
INSERT INTO migration_log (migration_name, applied_at, description)
VALUES (
  '20250125000008_update_ranking_algorithm',
  NOW(),
  'Updated ranking algorithm to prioritize: guesses ASC → time ASC → fuzzy DESC'
);
