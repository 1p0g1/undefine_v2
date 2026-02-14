-- Migration: 20260214000001_add_bonus_score_to_leaderboard_ranking.sql
-- Description: Add bonus_score and fuzzy_matches columns to leaderboard_summary,
--              update ranking algorithm to: guesses → time → bonus_score → fuzzy_matches
-- Date: 2026-02-14
--
-- SAFE: Uses IF NOT EXISTS, pg_trigger_depth() guard, and disables trigger during backfill.

-- Step 1: Add missing columns to leaderboard_summary
ALTER TABLE leaderboard_summary
  ADD COLUMN IF NOT EXISTS bonus_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fuzzy_matches INTEGER DEFAULT 0;

-- Step 2: Drop existing ranking function and trigger FIRST (before creating new ones)
DROP TRIGGER IF EXISTS update_rankings_on_leaderboard_change ON leaderboard_summary;
DROP TRIGGER IF EXISTS update_rankings_after_leaderboard_change ON leaderboard_summary;
DROP FUNCTION IF EXISTS update_leaderboard_rankings() CASCADE;

-- Step 3: Create new ranking function with recursion guard
-- pg_trigger_depth() prevents infinite loop: trigger → UPDATE → trigger → UPDATE → ...
CREATE OR REPLACE FUNCTION update_leaderboard_rankings()
RETURNS TRIGGER AS $$
BEGIN
  -- CRITICAL: Prevent infinite recursion. When this trigger fires and UPDATEs
  -- leaderboard_summary, that UPDATE would fire this trigger again. 
  -- pg_trigger_depth() = 1 means we're in the original trigger call.
  -- Any depth > 1 means we're in a recursive call and should bail out.
  IF pg_trigger_depth() > 1 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

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
          guesses_used ASC,                    -- 1st: fewer guesses rank better
          best_time ASC,                       -- 2nd: faster time breaks ties
          COALESCE(bonus_score, 0) DESC,       -- 3rd: higher bonus score breaks ties
          COALESCE(fuzzy_matches, 0) DESC      -- 4th: more fuzzy matches as final tiebreaker
      ) as new_rank
    FROM leaderboard_summary 
    WHERE word_id = COALESCE(NEW.word_id, OLD.word_id)
  ) subquery
  WHERE leaderboard_summary.id = subquery.id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger for automatic ranking updates
CREATE TRIGGER update_rankings_after_leaderboard_change
  AFTER INSERT OR UPDATE OR DELETE ON leaderboard_summary
  FOR EACH ROW
  EXECUTE FUNCTION update_leaderboard_rankings();

-- Step 5: Disable trigger during bulk backfill to avoid unnecessary re-ranking per row
ALTER TABLE leaderboard_summary DISABLE TRIGGER update_rankings_after_leaderboard_change;

-- Step 6: Backfill bonus_score from scores table
UPDATE leaderboard_summary ls
SET bonus_score = COALESCE(s.bonus_score, 0)
FROM scores s
WHERE ls.player_id = s.player_id
  AND ls.word_id = s.word_id
  AND s.bonus_score IS NOT NULL
  AND s.bonus_score > 0;

-- Step 7: Backfill fuzzy_matches from scores table (fuzzy_bonus / 50 = match count)
UPDATE leaderboard_summary ls
SET fuzzy_matches = FLOOR(COALESCE(s.fuzzy_bonus, 0) / 50)
FROM scores s
WHERE ls.player_id = s.player_id
  AND ls.word_id = s.word_id
  AND s.fuzzy_bonus IS NOT NULL
  AND s.fuzzy_bonus > 0;

-- Step 8: Re-enable trigger
ALTER TABLE leaderboard_summary ENABLE TRIGGER update_rankings_after_leaderboard_change;

-- Step 9: One-time bulk recalculation of ALL existing rankings with new algorithm
-- Trigger is re-enabled but we use a direct UPDATE that will trigger depth=1 only once
-- We do this as a single statement so the trigger fires once per row (with guard)
UPDATE leaderboard_summary 
SET rank = subquery.new_rank,
    was_top_10 = subquery.new_rank <= 10
FROM (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY word_id
      ORDER BY 
        guesses_used ASC,
        best_time ASC,
        COALESCE(bonus_score, 0) DESC,
        COALESCE(fuzzy_matches, 0) DESC
    ) as new_rank
  FROM leaderboard_summary 
) subquery
WHERE leaderboard_summary.id = subquery.id;

-- Step 10: Add documentation comments
COMMENT ON FUNCTION update_leaderboard_rankings() IS 
  'Ranking priority: 1) fewer guesses, 2) faster time, 3) higher bonus round score, 4) more fuzzy matches. Uses pg_trigger_depth() to prevent infinite recursion.';

COMMENT ON COLUMN leaderboard_summary.bonus_score IS 'Aggregated bonus round score (perfect=100, good=50, average=25 per guess)';
COMMENT ON COLUMN leaderboard_summary.fuzzy_matches IS 'Count of fuzzy (near-miss) guesses during the daily game';
