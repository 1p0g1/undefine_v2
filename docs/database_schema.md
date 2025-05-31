Database Schema

This document defines the database schema for the Un-Define v2 project. The project uses Supabase as the database provider.

## Tables

### players

Stores player information for anonymous player tracking.

```sql
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  display_name TEXT,
  is_anonymous BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Database functions for player management
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

-- Trigger to update player activity on game session creation
CREATE TRIGGER update_player_activity_on_game
AFTER INSERT OR UPDATE ON game_sessions
FOR EACH ROW
EXECUTE FUNCTION update_player_activity();
```

### words

Stores the words that can be used in the game.

```sql
CREATE TABLE words (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  word TEXT NOT NULL UNIQUE,
  definition TEXT NOT NULL,
  equivalents TEXT,
  first_letter TEXT,
  in_a_sentence TEXT,
  number_of_letters INT,
  etymology TEXT,
  difficulty TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_word_of_day BOOLEAN DEFAULT FALSE,
  word_of_day_date DATE
);

CREATE INDEX idx_words_word ON words(word);
CREATE INDEX idx_words_word_of_day_date ON words(word_of_day_date);
```

### game_sessions

Stores information about each game session.

```sql
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id TEXT NOT NULL REFERENCES players(id),
  word_id UUID NOT NULL REFERENCES words(id),
  guesses TEXT[] DEFAULT '{}',
  revealed_clues TEXT[] DEFAULT '{}',
  clue_status JSONB DEFAULT '{"definition": false, "equivalents": false, "first_letter": false, "in_a_sentence": false, "number_of_letters": false, "etymology": false}'::jsonb,
  is_complete BOOLEAN DEFAULT FALSE,
  is_won BOOLEAN DEFAULT FALSE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, word_id)
);

CREATE INDEX idx_game_sessions_player_id ON game_sessions(player_id);
CREATE INDEX idx_game_sessions_word_id ON game_sessions(word_id);
CREATE INDEX idx_game_sessions_start_time ON game_sessions(start_time);
```

### user_stats

Stores statistics for each player.

```sql
CREATE TABLE user_stats (
  player_id TEXT PRIMARY KEY REFERENCES players(id),
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_guesses INTEGER DEFAULT 0,
  average_guesses_per_game FLOAT DEFAULT 0,
  total_play_time_seconds INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_stats_games_played ON user_stats(games_played);
```

### scores

Stores scores for each game session.

```sql
CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id TEXT NOT NULL REFERENCES players(id),
  word_id UUID NOT NULL REFERENCES words(id),
  guesses_used INTEGER NOT NULL,
  completion_time_seconds INTEGER NOT NULL,
  correct BOOLEAN DEFAULT FALSE,
  score INTEGER NOT NULL,
  base_score INTEGER NOT NULL,
  guess_penalty INTEGER NOT NULL,
  time_penalty INTEGER NOT NULL,
  hint_penalty INTEGER NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, word_id)
);

CREATE INDEX idx_scores_player_id ON scores(player_id);
CREATE INDEX idx_scores_word_id ON scores(word_id);
CREATE INDEX idx_scores_submitted_at ON scores(submitted_at);
CREATE INDEX idx_scores_score ON scores(score DESC);
```

### leaderboard_summary

Stores summary information for the leaderboard with auto-calculated rankings.

```sql
CREATE TABLE leaderboard_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id TEXT NOT NULL REFERENCES players(id),
  word_id UUID NOT NULL REFERENCES words(id),
  rank INTEGER NOT NULL,
  was_top_10 BOOLEAN DEFAULT FALSE,
  score INTEGER NOT NULL,
  completion_time_seconds INTEGER NOT NULL,
  guesses_used INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, word_id)
);

CREATE INDEX idx_leaderboard_summary_player_id ON leaderboard_summary(player_id);
CREATE INDEX idx_leaderboard_summary_word_id ON leaderboard_summary(word_id);
CREATE INDEX idx_leaderboard_summary_rank ON leaderboard_summary(rank);
CREATE INDEX idx_leaderboard_summary_score ON leaderboard_summary(score DESC);

-- Auto-ranking functions and triggers
CREATE OR REPLACE FUNCTION update_leaderboard_rankings(target_word_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  WITH ranked_scores AS (
    SELECT 
      player_id,
      word_id,
      score,
      completion_time_seconds,
      guesses_used,
      ROW_NUMBER() OVER (
        PARTITION BY word_id
        ORDER BY score DESC, completion_time_seconds ASC
      ) as new_rank
    FROM leaderboard_summary
    WHERE word_id = target_word_id
  )
  UPDATE leaderboard_summary ls
  SET 
    rank = rs.new_rank,
    was_top_10 = rs.new_rank <= 10
  FROM ranked_scores rs
  WHERE ls.player_id = rs.player_id 
    AND ls.word_id = rs.word_id;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_update_leaderboard_rankings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM update_leaderboard_rankings(NEW.word_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_rankings_after_leaderboard_change
AFTER INSERT OR UPDATE ON leaderboard_summary
FOR EACH ROW
EXECUTE FUNCTION trigger_update_leaderboard_rankings();
```

## TypeScript Types

```typescript
interface PlayerEntry {
  id: string;
  created_at: string;
  last_active: string;
  display_name: string | null;
  is_anonymous: boolean;
  metadata: Record<string, unknown>;
}

interface WordEntry {
  id: string;
  word: string;
  definition: string;
  equivalents?: string | null;
  first_letter?: string | null;
  in_a_sentence?: string | null;
  number_of_letters?: number | null;
  etymology?: string | null;
  difficulty?: string | null;
  created_at: string;
  is_word_of_day: boolean;
  word_of_day_date?: string | null;
}

interface GameSessionEntry {
  id: string;
  player_id: string;
  word_id: string;
  guesses: string[];
  revealed_clues: string[];
  clue_status: Record<string, boolean>;
  is_complete: boolean;
  is_won: boolean;
  start_time: string;
  end_time?: string | null;
  created_at: string;
  updated_at: string;
}

interface UserStatsEntry {
  player_id: string;
  games_played: number;
  games_won: number;
  current_streak: number;
  longest_streak: number;
  total_guesses: number;
  average_guesses_per_game: number;
  total_play_time_seconds: number;
  total_score: number;
  created_at: string;
  updated_at: string;
}

interface ScoreEntry {
  id: string;
  player_id: string;
  word_id: string;
  guesses_used: number;
  completion_time_seconds: number;
  correct: boolean;
  score: number;
  base_score: number;
  guess_penalty: number;
  time_penalty: number;
  hint_penalty: number;
  submitted_at: string;
}

interface LeaderboardSummaryEntry {
  id: string;
  player_id: string;
  word_id: string;
  rank: number;
  was_top_10: boolean;
  score: number;
  completion_time_seconds: number;
  guesses_used: number;
  created_at: string;
}
```

## Key Relationships

1. **`players`** → Central table for all player data
2. **`game_sessions`** → References `players.id` and `words.id`
3. **`user_stats`** → References `players.id` for aggregate statistics
4. **`scores`** → References `players.id` and `words.id` for individual game results
5. **`leaderboard_summary`** → References `players.id` and `words.id` with auto-calculated rankings

## Data Flow

1. **Player Creation**: Auto-created via `ensure_player_exists()` function on first game
2. **Game Session**: Created when player starts a new word
3. **Score Recording**: Created when game completes (win or loss)
4. **Stats Update**: Player stats updated on every game completion
5. **Leaderboard**: Auto-populated from winning scores with automatic ranking
