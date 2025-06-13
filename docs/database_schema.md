# Database Schema

This document defines the database schema for the Un-Define v2 project. The project uses Supabase as the database provider.

**⚠️ IMPORTANT: This documentation is based on the actual ERD and production database structure as of May 2025.**

**🔄 UPDATED: May 2025 - Fixed leaderboard_summary schema alignment and API functions**

## Entity Relationship Diagram (ERD)

**[USER TO EMBED ERD IMAGE HERE - `erd.png`]**

*(The ERD above visually represents the table structures and their relationships as described below and used throughout the project. Refer to it for a quick overview of how tables are connected.)*

# ⚡️ Leaderboard Data Flow & Best Practice (June 2025)

**This project is now striving for a lean, scalable, and robust leaderboard system.**

- Real game completions flow: `game_sessions` → `scores` → `user_stats` → `leaderboard_summary`
- All upserts and updates are handled in `/api/guess.ts` (see implementation-plan.mdc Phase 7)
- Foreign key chain: `players` → `user_stats` → `leaderboard_summary`
- Leaderboard is always populated from real game completions, not test data
- All documentation and troubleshooting will be updated as part of the Phase 7 audit

## Tables

### players

Stores player information for anonymous player tracking.

```sql
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_anonymous BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_players_last_active ON players(last_active);
```

**Key Features:**
- Anonymous player support with optional display names
- Activity tracking for engagement metrics
- Flexible metadata storage for future features

### words

Stores the words that can be used in the game.

```sql
CREATE TABLE words (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE,
word TEXT NOT NULL UNIQUE,
definition TEXT NOT NULL,
  etymology TEXT,
first_letter TEXT,
in_a_sentence TEXT,
  number_of_letters INTEGER,
  equivalents TEXT,
difficulty TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_words_word ON words(word);
CREATE INDEX idx_words_date ON words(date);
```

### game_sessions

Stores information about each game session.

```sql
CREATE TABLE game_sessions (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  state TEXT,
  player_id TEXT NOT NULL REFERENCES players(id),
word_id UUID NOT NULL REFERENCES words(id),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
guesses TEXT[] DEFAULT '{}',
  guesses_used INTEGER,
  revealed_clues TEXT[] DEFAULT '{}',
is_complete BOOLEAN DEFAULT FALSE,
is_won BOOLEAN DEFAULT FALSE,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  clue_status JSONB DEFAULT '{"definition": false, "equivalents": false, "first_letter": false, "in_a_sentence": false, "number_of_letters": false, "etymology": false}'::jsonb,
  theme_guess TEXT -- Nullable, stores player's guess for the weekly theme
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
current_streak INTEGER DEFAULT 0,
longest_streak INTEGER DEFAULT 0,
  best_rank INTEGER,
  top_10_count INTEGER DEFAULT 0,
  average_completion_time FLOAT,
last_played_word TEXT,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_stats_current_streak ON user_stats(current_streak);
CREATE INDEX idx_user_stats_longest_streak ON user_stats(longest_streak);
CREATE INDEX idx_user_stats_best_rank ON user_stats(best_rank);
```

**Key Metrics:**
- **current_streak**: Current consecutive wins
- **longest_streak**: Best streak ever achieved  
- **best_rank**: Highest leaderboard position (lowest number)
- **top_10_count**: Number of times in top 10
- **average_completion_time**: Performance metric

### scores

Stores scores for each game session.

```sql
CREATE TABLE scores (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
word_id UUID NOT NULL REFERENCES words(id),
  game_session_id UUID REFERENCES game_sessions(id),
  player_id TEXT NOT NULL REFERENCES players(id),
  nickname TEXT,
score INTEGER NOT NULL,
base_score INTEGER NOT NULL,
guess_penalty INTEGER NOT NULL,
time_penalty INTEGER NOT NULL,
hint_penalty INTEGER NOT NULL,
  correct BOOLEAN DEFAULT FALSE,
  guesses_used INTEGER NOT NULL,
  used_hint BOOLEAN DEFAULT FALSE,
  completion_time_seconds INTEGER NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_scores_player_id ON scores(player_id);
CREATE INDEX idx_scores_word_id ON scores(word_id);
CREATE INDEX idx_scores_submitted_at ON scores(submitted_at);
CREATE INDEX idx_scores_score ON scores(score DESC);
CREATE INDEX idx_scores_correct ON scores(correct);
```

**Scoring System:**
- **base_score**: Starting score (typically 1000)
- **guess_penalty**: Points deducted for extra guesses
- **time_penalty**: Points deducted for slow completion
- **hint_penalty**: Points deducted for using hints
- **final score**: base_score - guess_penalty - time_penalty - hint_penalty

### leaderboard_summary

Stores optimized leaderboard data with auto-calculated rankings.

```sql
CREATE TABLE leaderboard_summary (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  word_id UUID REFERENCES words(id),
  player_id TEXT NOT NULL REFERENCES user_stats(player_id),
  rank INTEGER,
was_top_10 BOOLEAN DEFAULT FALSE,
  best_time INTEGER,
  guesses_used INTEGER,
  date DATE DEFAULT CURRENT_DATE
);

CREATE INDEX idx_leaderboard_summary_word_id ON leaderboard_summary(word_id);
CREATE INDEX idx_leaderboard_summary_player_id ON leaderboard_summary(player_id);
CREATE INDEX idx_leaderboard_summary_rank ON leaderboard_summary(rank);
CREATE INDEX idx_leaderboard_summary_date ON leaderboard_summary(date);
```

**Key Features:**
- **Daily leaderboards**: Filtered by date and word_id
- **Auto-ranking**: Ranks calculated by best_time and guesses_used
- **Top 10 tracking**: Boolean flag for top performers
- **Foreign Key**: References user_stats.player_id (not players.id directly)

**Best Practice Data Flow (June 2025):**
- On game win, `/api/guess.ts` updates `user_stats`, inserts into `scores`, and upserts into `leaderboard_summary`.
- Foreign key dependencies are always checked and maintained.
- Database triggers recalculate ranks automatically.
- Troubleshooting and audit tasks are tracked in `implementation-plan.mdc` Phase 7.

## May 2025 Schema Fixes

### Issue: Leaderboard Data Not Populating

**Problem**: Real game completions weren't appearing in leaderboard despite successful game sessions.

**Root Cause**: The `updateLeaderboardSummary()` function in `/api/guess.ts` was using incorrect column names that didn't match the actual ERD schema.

### Fixes Applied:

1. **Column Name Alignment**:
   - ❌ **OLD**: `completion_time_seconds` (doesn't exist in leaderboard_summary)
   - ✅ **NEW**: `best_time` (actual column name)
   - ❌ **OLD**: `score` (doesn't exist in leaderboard_summary)
   - ✅ **NEW**: Removed score references

2. **Foreign Key Dependencies**:
   - ❌ **OLD**: Direct insert to leaderboard_summary without user_stats check
   - ✅ **NEW**: Ensures user_stats entry exists before leaderboard insert
   - **Chain**: `players` → `user_stats` → `leaderboard_summary`

3. **Date Filtering**:
   - ❌ **OLD**: No date field population
   - ✅ **NEW**: Populates `date` field with CURRENT_DATE for daily filtering

### API Function Updates:

```typescript
// BEFORE (May 2025):
const { error: insertError } = await supabase
  .from('leaderboard_summary')
  .upsert([{
    player_id: playerId,
    word_id: wordId,
    score: scoreResult.score,                    // ❌ Column doesn't exist
    completion_time_seconds: completionTimeSeconds, // ❌ Wrong column name
  }]);

// AFTER (May 2025):
const { error: insertError } = await supabase
  .from('leaderboard_summary')
  .upsert([{
    player_id: playerId,
    word_id: wordId,
    best_time: completionTimeSeconds,           // ✅ Correct column name
    guesses_used: guessesUsed,                  // ✅ Correct column
    date: new Date().toISOString().split('T')[0] // ✅ Add date for filtering
  }]);
```

### Result:
- New game completions now populate leaderboard_summary automatically
- Real player data appears immediately in leaderboards
- Proper foreign key relationships maintained
- Daily date filtering works correctly

## Test Data

### Seeded Test Players

For testing purposes, the following test data has been seeded:

```sql
-- Test players with fun names
INSERT INTO players (id, is_anonymous, display_name) VALUES
  ('test-player-001', true, 'Testy McTestson'),
  ('test-player-002', true, 'Word Smith'),
  ('test-player-003', true, 'Doctor Verbose'),
  ('test-player-004', true, 'Seed McData'),
  ('test-player-005', true, 'Paul Al-Hempo');

-- Corresponding user_stats entries
INSERT INTO user_stats (player_id, current_streak, longest_streak, best_rank, top_10_count) VALUES
  ('test-player-001', 1, 1, 1, 1),
  ('test-player-002', 1, 1, 2, 1),
  ('test-player-003', 1, 1, 3, 1),
  ('test-player-004', 1, 1, 4, 1),
  ('test-player-005', 1, 1, 5, 1);

-- Test leaderboard entries for current word
INSERT INTO leaderboard_summary (id, player_id, word_id, rank, was_top_10, best_time, guesses_used, date) VALUES
  (gen_random_uuid(), 'test-player-001', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6', 1, true, 45, 2, CURRENT_DATE),
  (gen_random_uuid(), 'test-player-002', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6', 2, true, 52, 2, CURRENT_DATE),
  (gen_random_uuid(), 'test-player-003', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6', 3, true, 38, 3, CURRENT_DATE),
  (gen_random_uuid(), 'test-player-004', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6', 4, true, 67, 3, CURRENT_DATE),
  (gen_random_uuid(), 'test-player-005', 'fef9bd6d-00de-4124-8784-cac5c36ac4c6', 5, true, 89, 4, CURRENT_DATE);
```

## Database Functions and Triggers

### Player Management

```sql
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
```

### Auto-Update Triggers

```sql
-- Update player activity on game session creation
CREATE OR REPLACE FUNCTION update_player_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE players
  SET last_active = NOW()
  WHERE id = NEW.player_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_player_activity_on_game
AFTER INSERT OR UPDATE ON game_sessions
FOR EACH ROW
EXECUTE FUNCTION update_player_activity();
```

## TypeScript Types

```typescript
interface PlayerEntry {
id: string;
  display_name: string | null;
created_at: string;
  last_active: string;
  is_anonymous: boolean;
  metadata: Record<string, unknown>;
}

interface UserStatsEntry {
player_id: string;
current_streak: number;
longest_streak: number;
  best_rank: number | null;
  top_10_count: number;
  average_completion_time: number | null;
  last_played_word: string | null;
created_at: string;
updated_at: string;
}

interface LeaderboardSummaryEntry {
id: string;
  word_id: string;
player_id: string;
  rank: number | null;
  was_top_10: boolean;
  best_time: number | null;
  guesses_used: number | null;
  date: string;
}

interface ScoreEntry {
  id: string;
word_id: string;
  game_session_id: string | null;
  player_id: string;
  nickname: string | null;
score: number;
  base_score: number;
  guess_penalty: number;
  time_penalty: number;
  hint_penalty: number;
  correct: boolean;
  guesses_used: number;
  used_hint: boolean;
completion_time_seconds: number;
  submitted_at: string;
}
```

## Migration History

- **May 2025**: Fixed leaderboard foreign key constraints and populated missing data
- **Test Data**: Seeded with 5 test players for leaderboard testing
- **Schema Validation**: Updated documentation to match actual ERD structure
- **May 2025 API Fixes**: Updated updateLeaderboardSummary() to use correct schema
