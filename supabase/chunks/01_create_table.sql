-- CHUNK 1: Create the daily snapshots table
CREATE TABLE IF NOT EXISTS daily_leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word_id UUID NOT NULL,
  date DATE NOT NULL,
  final_rankings JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_players INTEGER NOT NULL DEFAULT 0,
  is_finalized BOOLEAN NOT NULL DEFAULT FALSE,
  finalized_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(word_id, date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_date ON daily_leaderboard_snapshots(date);
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_word_id ON daily_leaderboard_snapshots(word_id);
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_finalized ON daily_leaderboard_snapshots(is_finalized);
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_finalized_at ON daily_leaderboard_snapshots(finalized_at); 