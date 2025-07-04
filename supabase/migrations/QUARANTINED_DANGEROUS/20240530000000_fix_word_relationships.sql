-- Migration: 20240530000000_fix_word_relationships
-- Description: Fix word relationships and add proper foreign key constraints
-- Author: Project Team
-- Date: 2024-05-30

-- Up migration

-- 1. Ensure word_id exists and is properly typed
ALTER TABLE game_sessions
ALTER COLUMN word_id SET DATA TYPE UUID USING word_id::UUID;

-- 2. Add foreign key constraint if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_game_sessions_word_id'
  ) THEN
    ALTER TABLE game_sessions
    ADD CONSTRAINT fk_game_sessions_word_id 
    FOREIGN KEY (word_id) 
    REFERENCES words(id);
  END IF;
END $$;

-- 3. Create index for better join performance
CREATE INDEX IF NOT EXISTS idx_game_sessions_word_id 
ON game_sessions(word_id);

-- Down migration
DROP INDEX IF EXISTS idx_game_sessions_word_id;
ALTER TABLE game_sessions DROP CONSTRAINT IF EXISTS fk_game_sessions_word_id; 