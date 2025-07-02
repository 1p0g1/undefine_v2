# Actual Database Schema Documentation
*Generated: July 2, 2025*
*Source: Verified from supabase/types.ts and migration files*

## 🎯 **VERIFIED SCHEMA STRUCTURE**

This document reflects the **actual** database structure as it exists in production, not assumptions or outdated documentation.

### **✅ CORE TABLES (Confirmed in supabase/types.ts)**

#### **1. `players`**
```sql
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW(),
  is_anonymous BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb
);
```

#### **2. `words`**
```sql
CREATE TABLE words (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  word TEXT,
  definition TEXT,
  etymology TEXT,
  first_letter TEXT,
  in_a_sentence TEXT,
  number_of_letters INTEGER,
  equivalents TEXT,
  difficulty TEXT,
  date DATE,
  theme TEXT  -- Added for Theme of the Week feature
);
```

#### **3. `game_sessions`**
```sql
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id TEXT REFERENCES players(id),
  word_id UUID REFERENCES words(id),
  state TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  guesses TEXT[],
  guesses_used INTEGER,
  revealed_clues TEXT[],
  is_complete BOOLEAN DEFAULT FALSE,
  is_won BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  clue_status JSONB DEFAULT '{"definition": false, "equivalents": false, "first_letter": false, "in_a_sentence": false, "number_of_letters": false, "etymology": false}'::jsonb,
  theme_guess TEXT,  -- Player's theme guess for this session
  score INTEGER,     -- Final calculated score
  time_taken INTEGER -- Completion time in seconds
);
```

#### **4. `user_stats`**
```sql
CREATE TABLE user_stats (
  player_id TEXT PRIMARY KEY REFERENCES players(id),
  games_played INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,      -- ⚠️ NOT in player_streaks!
  longest_streak INTEGER DEFAULT 0,      -- ⚠️ Called longest_streak, NOT best_streak!
  best_rank INTEGER,
  top_10_count INTEGER DEFAULT 0,
  average_completion_time FLOAT,
  last_played_word TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  games_won INTEGER DEFAULT 0  -- Added in migration
);
```

#### **5. `scores`**
```sql
CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id TEXT REFERENCES players(id),
  word_id UUID REFERENCES words(id),
  game_session_id UUID REFERENCES game_sessions(id),
  nickname TEXT,
  score INTEGER NOT NULL,
  base_score INTEGER NOT NULL,
  guess_penalty INTEGER NOT NULL,
  time_penalty INTEGER NOT NULL,
  hint_penalty INTEGER NOT NULL,
  correct BOOLEAN DEFAULT FALSE,
  guesses_used INTEGER NOT NULL,
  used_hint BOOLEAN DEFAULT FALSE,
  completion_time_seconds INTEGER,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **6. `leaderboard_summary`**
```sql
CREATE TABLE leaderboard_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id TEXT NOT NULL REFERENCES user_stats(player_id),  -- ⚠️ References user_stats, NOT players!
  word_id UUID REFERENCES words(id),
  rank INTEGER,
  was_top_10 BOOLEAN DEFAULT FALSE,
  best_time INTEGER,
  guesses_used INTEGER,
  date DATE DEFAULT CURRENT_DATE
);
```

### **✅ ADDITIONAL TABLES (Confirmed in migrations)**

#### **7. `player_streaks`** ⚠️ **MISSING FROM types.ts**
```sql
CREATE TABLE player_streaks (
  player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  highest_streak INTEGER NOT NULL DEFAULT 0,  -- ⚠️ Called highest_streak, NOT best_streak!
  streak_start_date DATE,
  last_win_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **8. `theme_attempts`** ⚠️ **MISSING FROM types.ts**
```sql
CREATE TABLE theme_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id TEXT NOT NULL REFERENCES user_stats(player_id) ON DELETE CASCADE,
  theme TEXT NOT NULL,
  guess TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  attempt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  words_completed_when_guessed INTEGER DEFAULT 0,
  total_word_guesses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, theme, attempt_date)
);
```

#### **9. `schema_migrations`** ✅ **System table**
```sql
CREATE TABLE schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **❓ TABLES MENTIONED IN DOCS BUT NOT CONFIRMED**

These tables are referenced in documentation but NOT found in types.ts:

- `daily_leaderboard_snapshots` - May not exist or be deprecated
- `trigger_log` - May not exist or be deprecated

### **🔍 CRITICAL FINDINGS**

#### **Schema Inconsistencies Found:**

1. **`player_streaks` table exists but missing from types.ts**
   - Created in migration `20241202000000_create_player_streaks.sql`
   - Has columns: `current_streak`, `highest_streak` (NOT `best_streak`)
   - May explain why Beth's streak investigation failed

2. **`theme_attempts` table exists but missing from types.ts**
   - Created in migration `20241213000002_create_theme_attempts_table.sql`
   - This is why theme feature works but types are incomplete

3. **Duplicate streak tracking:**
   - `user_stats` has: `current_streak`, `longest_streak`
   - `player_streaks` has: `current_streak`, `highest_streak`
   - **Potential conflict**: Which table is the source of truth?

4. **Foreign key confusion:**
   - `leaderboard_summary.player_id` references `user_stats.player_id`
   - `theme_attempts.player_id` references `user_stats.player_id`
   - But `player_streaks.player_id` references `players.id`

### **🚨 BETH'S STREAK ISSUE ROOT CAUSE**

The investigation script failed because:
1. **Wrong table**: Script looked for `best_streak` in `player_streaks`
2. **Wrong column**: Column is called `highest_streak`, not `best_streak`
3. **Missing types**: `player_streaks` not in Supabase types so queries may fail

### **📋 CORRECTED BETH'S STREAK INVESTIGATION**

```sql
-- ✅ CORRECTED: Check Beth's streak in BOTH tables
-- Check player_streaks table (if it exists)
SELECT 
  'player_streaks' as source,
  current_streak,
  highest_streak,  -- NOT best_streak!
  last_win_date,
  updated_at
FROM player_streaks 
WHERE player_id = '277b7094-7c6c-4644-bddf-5dd33e2fec9e';

-- Check user_stats table (confirmed to exist)
SELECT 
  'user_stats' as source,
  current_streak,
  longest_streak,  -- NOT best_streak!
  games_played,
  games_won
FROM user_stats 
WHERE player_id = '277b7094-7c6c-4644-bddf-5dd33e2fec9e';
```

### **🔧 IMMEDIATE ACTION ITEMS**

1. **Update Supabase types** to include missing tables
2. **Fix investigation scripts** with correct column names
3. **Determine streak source of truth** - which table should be authoritative?
4. **Audit foreign key relationships** for consistency

### **💡 RECOMMENDED FIXES**

1. **Regenerate Supabase types:**
   ```bash
   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > supabase/types.ts
   ```

2. **Standardize streak tracking:**
   - Choose ONE table as source of truth (`user_stats` vs `player_streaks`)
   - Remove or deprecate the redundant one
   - Update all leaderboard APIs accordingly

3. **Fix investigation scripts:**
   - Use correct table and column names
   - Handle missing tables gracefully
   - Test against actual schema 