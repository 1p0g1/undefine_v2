-- Migration: 20260214000002_fix_ranking_trigger_depth.sql
-- Description: Fix pg_trigger_depth() guard from > 1 to > 2.
--
-- BUG: The ranking trigger is called from within update_leaderboard_from_game
-- (which fires on game_sessions at depth=1). By the time the ranking trigger
-- fires on leaderboard_summary, it's already at depth=2. The old guard (> 1)
-- caused it to bail out immediately, so rankings were NEVER recalculated
-- on game completion.
--
-- FIX: Change guard to > 2 so:
--   depth=1 → direct API update on leaderboard_summary → runs ✓
--   depth=2 → called via game_sessions trigger → runs ✓
--   depth=3 → self-recursion from own UPDATE → bails out ✓
--
-- Date: 2026-02-14

-- Step 1: Replace the function with corrected depth guard
CREATE OR REPLACE FUNCTION update_leaderboard_rankings()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent self-recursion only. depth=2 is legitimate (called from
  -- update_leaderboard_from_game on game_sessions). depth=3+ means
  -- our own UPDATE fired this trigger again → bail out.
  IF pg_trigger_depth() > 2 THEN
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

-- Step 2: Recalculate ALL rankings (trigger disabled to avoid interference)
ALTER TABLE leaderboard_summary DISABLE TRIGGER update_rankings_after_leaderboard_change;

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

ALTER TABLE leaderboard_summary ENABLE TRIGGER update_rankings_after_leaderboard_change;

-- Step 3: Update documentation comment
COMMENT ON FUNCTION update_leaderboard_rankings() IS 
  'Ranking priority: 1) fewer guesses, 2) faster time, 3) higher bonus round score, 4) more fuzzy matches. Uses pg_trigger_depth() > 2 to prevent self-recursion while allowing calls from game_sessions trigger chain.';
