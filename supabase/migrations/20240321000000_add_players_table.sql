-- Create players table
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  display_name TEXT,
  is_anonymous BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create function to ensure player exists
CREATE OR REPLACE FUNCTION ensure_player_exists(p_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO players (id)
  VALUES (p_id)
  ON CONFLICT (id) DO UPDATE
  SET last_active = NOW();
  
  RETURN p_id;
END;
$$;

-- Create function to update player activity
CREATE OR REPLACE FUNCTION update_player_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE players
  SET last_active = NOW()
  WHERE id = NEW.player_id;
  RETURN NEW;
END;
$$;

-- Create trigger to update player activity on game session creation
CREATE TRIGGER update_player_activity_on_game
AFTER INSERT OR UPDATE ON game_sessions
FOR EACH ROW
EXECUTE FUNCTION update_player_activity();

-- Migrate existing player IDs
INSERT INTO players (id, created_at, is_anonymous)
SELECT player_id, MIN(created_at), TRUE
FROM game_sessions
WHERE player_id IS NOT NULL
GROUP BY player_id
ON CONFLICT (id) DO NOTHING; 