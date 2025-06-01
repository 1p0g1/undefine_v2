-- Add start_time column to game_sessions table if it doesn't exist
ALTER TABLE game_sessions
ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE NOT NULL;

-- Add index on start_time for performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_game_sessions_start_time ON game_sessions(start_time);

-- Comment for start_time (will only apply if column is newly added, harmless otherwise)
-- The attempt to add 'word TEXT' has been removed to align with the ERD.
-- If denormalization of 'word' into 'game_sessions' is truly needed,
-- it should be added back with 'IF NOT EXISTS' and the ERD updated.
COMMENT ON COLUMN game_sessions.start_time IS 'When the game session started'; 