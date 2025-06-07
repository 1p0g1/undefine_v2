-- Migration: 20241202000008_create_daily_snapshots.sql
-- Description: Create daily leaderboard snapshots system for immutable historical records
-- Author: AI Assistant  
-- Date: 2024-12-02

-- Create daily_leaderboard_snapshots table for immutable historical records
CREATE TABLE daily_leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  final_rankings JSONB NOT NULL, -- Complete leaderboard with final was_top_10 values
  total_players INTEGER NOT NULL DEFAULT 0,
  is_finalized BOOLEAN NOT NULL DEFAULT FALSE,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint to ensure one snapshot per word per date
ALTER TABLE daily_leaderboard_snapshots 
ADD CONSTRAINT daily_leaderboard_snapshots_word_date_key UNIQUE (word_id, date);

-- Create indexes for efficient querying
CREATE INDEX idx_daily_snapshots_date ON daily_leaderboard_snapshots(date);
CREATE INDEX idx_daily_snapshots_word_id ON daily_leaderboard_snapshots(word_id);
CREATE INDEX idx_daily_snapshots_finalized ON daily_leaderboard_snapshots(is_finalized);
CREATE INDEX idx_daily_snapshots_finalized_at ON daily_leaderboard_snapshots(finalized_at);

-- Create function to finalize a daily leaderboard
CREATE OR REPLACE FUNCTION finalize_daily_leaderboard(
  target_word_id UUID,
  target_date DATE DEFAULT CURRENT_DATE
) 
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  total_players INTEGER,
  top_10_count INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  snapshot_exists BOOLEAN;
  final_rankings_json JSONB;
  player_count INTEGER;
  top_10_count_result INTEGER;
BEGIN
  -- Check if snapshot already exists and is finalized
  SELECT is_finalized INTO snapshot_exists
  FROM daily_leaderboard_snapshots
  WHERE word_id = target_word_id AND date = target_date;

  IF snapshot_exists = TRUE THEN
    RETURN QUERY SELECT 
      FALSE as success, 
      'Snapshot already finalized for this word and date' as message,
      0 as total_players,
      0 as top_10_count;
    RETURN;
  END IF;

  -- Build final rankings from current leaderboard_summary
  WITH ranked_players AS (
    SELECT 
      ls.player_id,
      ls.word_id,
      ls.best_time,
      ls.guesses_used,
      ls.date,
      p.display_name,
      ROW_NUMBER() OVER (
        ORDER BY ls.best_time ASC, ls.guesses_used ASC
      ) as final_rank
    FROM leaderboard_summary ls
    JOIN players p ON p.id = ls.player_id
    WHERE ls.word_id = target_word_id
  ),
  final_leaderboard AS (
    SELECT 
      json_agg(
        json_build_object(
          'player_id', player_id,
          'player_name', COALESCE(display_name, 'Player ' || RIGHT(player_id, 4)),
          'rank', final_rank,
          'best_time', best_time,
          'guesses_used', guesses_used,
          'was_top_10', final_rank <= 10,
          'date', date
        )
        ORDER BY final_rank
      ) as rankings
    FROM ranked_players
  )
  SELECT rankings INTO final_rankings_json FROM final_leaderboard;

  -- Get counts
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE rank <= 10)
  INTO player_count, top_10_count_result
  FROM (
    SELECT ROW_NUMBER() OVER (ORDER BY best_time ASC, guesses_used ASC) as rank
    FROM leaderboard_summary
    WHERE word_id = target_word_id
  ) ranked;

  -- Insert or update snapshot
  INSERT INTO daily_leaderboard_snapshots (
    word_id,
    date,
    final_rankings,
    total_players,
    is_finalized,
    finalized_at
  ) VALUES (
    target_word_id,
    target_date,
    COALESCE(final_rankings_json, '[]'::jsonb),
    player_count,
    TRUE,
    NOW()
  )
  ON CONFLICT (word_id, date) 
  DO UPDATE SET
    final_rankings = EXCLUDED.final_rankings,
    total_players = EXCLUDED.total_players,
    is_finalized = TRUE,
    finalized_at = NOW(),
    updated_at = NOW();

  -- Return success
  RETURN QUERY SELECT 
    TRUE as success,
    FORMAT('Successfully finalized leaderboard for word %s with %s players (%s in top 10)', 
           target_word_id, player_count, top_10_count_result) as message,
    player_count as total_players,
    top_10_count_result as top_10_count;
END;
$$;

-- Create function to get historical leaderboard (from snapshots)
CREATE OR REPLACE FUNCTION get_historical_leaderboard(
  target_word_id UUID,
  target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  player_id TEXT,
  player_name TEXT,
  rank INTEGER,
  best_time INTEGER,
  guesses_used INTEGER,
  was_top_10 BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  snapshot_data JSONB;
BEGIN
  -- Get the finalized snapshot
  SELECT final_rankings INTO snapshot_data
  FROM daily_leaderboard_snapshots
  WHERE word_id = target_word_id 
    AND date = target_date 
    AND is_finalized = TRUE;

  -- If no finalized snapshot exists, return empty
  IF snapshot_data IS NULL THEN
    RETURN;
  END IF;

  -- Return the rankings from the snapshot
  RETURN QUERY
  SELECT 
    (entry->>'player_id')::TEXT,
    (entry->>'player_name')::TEXT,
    (entry->>'rank')::INTEGER,
    (entry->>'best_time')::INTEGER,
    (entry->>'guesses_used')::INTEGER,
    (entry->>'was_top_10')::BOOLEAN
  FROM jsonb_array_elements(snapshot_data) as entry
  ORDER BY (entry->>'rank')::INTEGER;
END;
$$;

-- Create function to check if a date should be finalized (past midnight UTC)
CREATE OR REPLACE FUNCTION should_finalize_date(check_date DATE DEFAULT CURRENT_DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- A date should be finalized if it's before today (UTC)
  RETURN check_date < CURRENT_DATE;
END;
$$;

-- Create function to auto-finalize old unfinalized snapshots
CREATE OR REPLACE FUNCTION auto_finalize_old_snapshots()
RETURNS TABLE (
  word_id UUID,
  date DATE,
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  old_snapshot RECORD;
  finalize_result RECORD;
BEGIN
  -- Find all unfinalized snapshots for dates that should be finalized
  FOR old_snapshot IN 
    SELECT DISTINCT ls.word_id, ls.date
    FROM leaderboard_summary ls
    LEFT JOIN daily_leaderboard_snapshots dls 
      ON dls.word_id = ls.word_id AND dls.date = ls.date
    WHERE should_finalize_date(ls.date::DATE)
      AND (dls.is_finalized IS NULL OR dls.is_finalized = FALSE)
  LOOP
    -- Finalize each snapshot
    SELECT * INTO finalize_result 
    FROM finalize_daily_leaderboard(old_snapshot.word_id, old_snapshot.date);
    
    -- Return the result
    RETURN QUERY SELECT 
      old_snapshot.word_id,
      old_snapshot.date,
      finalize_result.success,
      finalize_result.message;
  END LOOP;
END;
$$;

-- Add comments for documentation
COMMENT ON TABLE daily_leaderboard_snapshots IS 'Immutable daily leaderboard snapshots with final was_top_10 values';
COMMENT ON FUNCTION finalize_daily_leaderboard IS 'Finalizes a daily leaderboard creating an immutable snapshot';
COMMENT ON FUNCTION get_historical_leaderboard IS 'Gets historical leaderboard from finalized snapshots';
COMMENT ON FUNCTION should_finalize_date IS 'Checks if a date should be finalized (past midnight UTC)';
COMMENT ON FUNCTION auto_finalize_old_snapshots IS 'Auto-finalizes all old unfinalized snapshots'; 