-- CHUNK 2: Create the finalize daily leaderboard function
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