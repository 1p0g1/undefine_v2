-- Add word and start_time columns to game_sessions table
ALTER TABLE game_sessions
ADD COLUMN word TEXT NOT NULL,
ADD COLUMN start_time TIMESTAMP WITH TIME ZONE NOT NULL;

-- Add index on start_time for performance
CREATE INDEX idx_game_sessions_start_time ON game_sessions(start_time);

-- Update schema documentation
COMMENT ON COLUMN game_sessions.word IS 'The actual word being guessed (denormalized for performance)';
COMMENT ON COLUMN game_sessions.start_time IS 'When the game session started'; 