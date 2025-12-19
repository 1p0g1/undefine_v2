# UnDEFINE Database Architecture

> **🔴 SINGLE SOURCE OF TRUTH** - This document supersedes all other database references.  
> Last Updated: 2024-12-19  
> Source: Supabase Dashboard exports

---

## Overview

UnDEFINE uses **Supabase** (PostgreSQL) as its primary database. All game state, player data, and leaderboard information is stored here.

---

## Tables

### 1. `players`
**Purpose**: Core player identity table. Every player has one record.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | text | NO | - | **PRIMARY KEY** - UUID string |
| `created_at` | timestamptz | YES | CURRENT_TIMESTAMP | When player first played |
| `updated_at` | timestamptz | YES | CURRENT_TIMESTAMP | Last activity |
| `nickname` | text | YES | NULL | Optional display name |

**Primary Key**: `players_pkey` on `(id)`

---

### 2. `words`
**Purpose**: Dictionary of all playable words with their clues.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | - | **PRIMARY KEY** |
| `word` | text | NO | - | The word to guess |
| `definition` | text | NO | - | D clue |
| `etymology` | text | YES | NULL | E clue |
| `first_letter` | text | YES | NULL | F clue |
| `in_a_sentence` | text | YES | NULL | I clue |
| `number_of_letters` | integer | YES | NULL | N clue |
| `equivalents` | text[] | YES | NULL | E clue (synonyms) |
| `difficulty` | text | YES | NULL | Word difficulty rating |
| `date` | date | YES | NULL | Scheduled play date |
| `theme` | text | YES | NULL | Weekly theme connection |
| `created_at` | timestamptz | YES | CURRENT_TIMESTAMP | - |

**Primary Key**: `words_pkey` on `(id)`  
**Unique Constraints**:
- `unique_word_text` on `(word)` - No duplicate words
- `words_date_unique` on `(date)` - One word per day

---

### 3. `game_sessions`
**Purpose**: Individual game play sessions. One record per game attempt.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | - | **PRIMARY KEY** |
| `player_id` | text | YES | NULL | FK to players.id |
| `word_id` | uuid | YES | NULL | FK to words.id |
| `guesses` | text[] | YES | NULL | Array of guesses made |
| `revealed_clues` | text[] | YES | NULL | Clues shown to player |
| `is_complete` | boolean | YES | false | Game finished? |
| `is_won` | boolean | YES | false | Player won? |
| `start_time` | timestamptz | YES | NULL | When game started |
| `end_time` | timestamptz | YES | NULL | When game ended |
| `created_at` | timestamptz | YES | CURRENT_TIMESTAMP | - |
| `updated_at` | timestamptz | YES | CURRENT_TIMESTAMP | - |
| `state` | text | YES | 'active' | Game state |
| `theme_guess` | text | YES | NULL | Player's theme guess |
| `clue_status` | jsonb | YES | (default jsonb) | Which clues revealed |
| `used_hint` | boolean | YES | false | Hint used? |
| `is_archive_play` | boolean | YES | false | **Archive vs live game** |
| `game_date` | date | YES | NULL | **Date of word played** |

**Primary Key**: `game_sessions_pkey` on `(id)`  
**Foreign Keys**:
- `fk_game_sessions_word` → `words(id)` ON DELETE NO ACTION
- `fk_word_id` → `words(id)` ON DELETE CASCADE ⚠️ *DUPLICATE FK*

**Check Constraints**:
- `valid_game_state`: `state IN ('active', 'completed')`

**Key Logic**:
- `is_archive_play = false` → Live daily game (affects streaks, leaderboard)
- `is_archive_play = true` → Archive game (does NOT affect streaks/leaderboard)

---

### 4. `player_streaks`
**Purpose**: Track player win streaks.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `player_id` | text | NO | - | **PRIMARY KEY** - FK to players.id |
| `current_streak` | integer | YES | 0 | Current consecutive wins |
| `highest_streak` | integer | YES | 0 | All-time best streak |
| `last_win_date` | date | YES | NULL | Date of last win |
| `created_at` | timestamptz | YES | CURRENT_TIMESTAMP | - |
| `updated_at` | timestamptz | YES | CURRENT_TIMESTAMP | - |

**Primary Key**: `player_streaks_pkey` on `(player_id)`  
**Foreign Keys**:
- `player_streaks_player_id_fkey` → `players(id)` ON DELETE CASCADE

**Trigger**: Updated automatically when `game_sessions` is completed (live plays only)

---

### 5. `leaderboard_summary`
**Purpose**: Daily leaderboard rankings for winning players.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | - | **PRIMARY KEY** |
| `player_id` | text | YES | NULL | FK to players.id |
| `word_id` | uuid | YES | NULL | FK to words.id |
| `rank` | integer | YES | NULL | Player's rank for that day |
| `was_top_10` | boolean | YES | NULL | In top 10? |
| `best_time` | integer | YES | NULL | Completion time (seconds) |
| `guesses_used` | integer | YES | NULL | Number of guesses |
| `date` | date | YES | NULL | Date of play |
| `fuzzy_matches` | integer | YES | 0 | Count of fuzzy matches |

**Primary Key**: `leaderboard_summary_pkey` on `(id)`  
**Unique Constraints**:
- `leaderboard_summary_player_word_key` on `(player_id, word_id)` - One entry per player per word

**Foreign Keys**:
- `fk_leaderboard_player_to_players` → `players(id)` ON DELETE NO ACTION
- `fk_leaderboard_summary_player_id_to_players` → `players(id)` ON DELETE NO ACTION ⚠️ *DUPLICATE*
- `leaderboard_summary_player_id_fkey_temp` → `players(id)` ON DELETE SET NULL ⚠️ *DUPLICATE*
- `leaderboard_summary_player_id_to_players` → `players(id)` ON DELETE NO ACTION ⚠️ *DUPLICATE*
- `leaderboard_summary_word_id_fkey` → `words(id)` ON DELETE CASCADE

**Note**: Only contains WINNING games. Updated by trigger on `game_sessions`.

---

### 6. `scores`
**Purpose**: Detailed scoring breakdown for completed games.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | - | **PRIMARY KEY** |
| `player_id` | text | YES | NULL | FK to players.id |
| `word_id` | uuid | YES | NULL | FK to words.id |
| `game_session_id` | uuid | YES | NULL | FK to game_sessions.id |
| `guesses_used` | integer | YES | NULL | Number of guesses |
| `completion_time_seconds` | integer | YES | NULL | Time to complete |
| `correct` | boolean | YES | NULL | Won? |
| `score` | integer | YES | NULL | Final calculated score |
| `base_score` | integer | YES | NULL | Score before penalties |
| `guess_penalty` | integer | YES | 0 | (Deprecated) |
| `fuzzy_bonus` | integer | YES | 0 | Bonus for fuzzy matches |
| `time_penalty` | integer | YES | 0 | Penalty for slow completion |
| `hint_penalty` | integer | YES | 0 | Penalty for using hints |
| `submitted_at` | timestamptz | YES | NULL | - |

**Primary Key**: `scores_pkey` on `(id)`  
**Unique Constraints**:
- `scores_player_word_uq` on `(player_id, word_id)` - One score per player per word

**Foreign Keys**:
- `fk_scores_game_session` → `game_sessions(id)` ON DELETE NO ACTION
- `fk_scores_player_to_players` → `players(id)` ON DELETE NO ACTION

---

### 7. `theme_attempts`
**Purpose**: Track weekly theme guesses.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | - | **PRIMARY KEY** |
| `player_id` | text | YES | NULL | FK to players.id |
| `theme_guess` | text | YES | NULL | Player's guess |
| `theme` | text | YES | NULL | Actual theme (alias: actual_theme) |
| `is_correct` | boolean | YES | NULL | Exact match? |
| `confidence_percentage` | numeric | YES | NULL | AI similarity score (0-100) |
| `similarity_score` | numeric | YES | NULL | Raw similarity (0-1) |
| `matching_method` | text | YES | NULL | How match was determined |
| `attempt_date` | date | YES | NULL | Date of attempt |
| `is_archive_attempt` | boolean | YES | false | Archive vs live theme guess |
| `week_start` | date | YES | NULL | Start of theme week |
| `created_at` | timestamptz | YES | CURRENT_TIMESTAMP | - |

**Primary Key**: `theme_attempts_pkey` on `(id)`  
**Unique Constraints**:
- `theme_attempts_unique_per_context` on `(player_id, theme, attempt_date, is_archive_attempt)`

**Foreign Keys**:
- `theme_attempts_player_id_to_players` → `players(id)` ON DELETE NO ACTION

**Check Constraints**:
- `check_confidence_percentage_range`: `confidence_percentage IS NULL OR (0 <= confidence_percentage <= 100)`
- `check_similarity_score_range`: `similarity_score IS NULL OR (0 <= similarity_score <= 1)`
- `check_matching_method_values`: `matching_method IN ('exact', 'synonym', 'semantic', 'error') OR NULL`

---

### 8. `daily_leaderboard_snapshots`
**Purpose**: Historical snapshots of daily leaderboards.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | - | **PRIMARY KEY** |
| `word_id` | uuid | YES | NULL | FK to words.id |
| `date` | date | YES | NULL | Date of snapshot |
| `snapshot_data` | jsonb | YES | NULL | Full leaderboard data |
| `created_at` | timestamptz | YES | CURRENT_TIMESTAMP | - |

**Primary Key**: `daily_leaderboard_snapshots_pkey` on `(id)`  
**Unique Constraints**:
- `daily_leaderboard_snapshots_word_date_key` on `(word_id, date)` - One snapshot per word per day

**Foreign Keys**:
- `daily_leaderboard_snapshots_word_id_fkey` → `words(id)` ON DELETE CASCADE

---

### 9. `trigger_log`
**Purpose**: Debug logging for database triggers.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | - | **PRIMARY KEY** |
| `trigger_name` | text | YES | NULL | Which trigger fired |
| `operation` | text | YES | NULL | INSERT/UPDATE/DELETE |
| `table_name` | text | YES | NULL | Affected table |
| `old_data` | jsonb | YES | NULL | Previous row data |
| `new_data` | jsonb | YES | NULL | New row data |
| `created_at` | timestamptz | YES | CURRENT_TIMESTAMP | - |

**Primary Key**: `trigger_log_pkey` on `(id)`

---

### 10. `schema_migrations`
**Purpose**: Track applied database migrations.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `version` | text | NO | - | **PRIMARY KEY** - Migration version |
| `applied_at` | timestamptz | YES | CURRENT_TIMESTAMP | When applied |

**Primary Key**: `schema_migrations_pkey` on `(version)`

---

## Constraints Summary

### Primary Keys
| Table | Constraint Name | Column(s) |
|-------|-----------------|-----------|
| `daily_leaderboard_snapshots` | `daily_leaderboard_snapshots_pkey` | `id` |
| `game_sessions` | `game_sessions_pkey` | `id` |
| `leaderboard_summary` | `leaderboard_summary_pkey` | `id` |
| `player_streaks` | `player_streaks_pkey` | `player_id` |
| `players` | `players_pkey` | `id` |
| `schema_migrations` | `schema_migrations_pkey` | `version` |
| `scores` | `scores_pkey` | `id` |
| `theme_attempts` | `theme_attempts_pkey` | `id` |
| `trigger_log` | `trigger_log_pkey` | `id` |
| `words` | `words_pkey` | `id` |

### Unique Constraints
| Table | Constraint Name | Column(s) |
|-------|-----------------|-----------|
| `daily_leaderboard_snapshots` | `daily_leaderboard_snapshots_word_date_key` | `(word_id, date)` |
| `leaderboard_summary` | `leaderboard_summary_player_word_key` | `(player_id, word_id)` |
| `scores` | `scores_player_word_uq` | `(player_id, word_id)` |
| `theme_attempts` | `theme_attempts_unique_per_context` | `(player_id, theme, attempt_date, is_archive_attempt)` |
| `words` | `unique_word_text` | `(word)` |
| `words` | `words_date_unique` | `(date)` |

### Foreign Keys
| Table | FK Name | Column | References | On Delete |
|-------|---------|--------|------------|-----------|
| `daily_leaderboard_snapshots` | `daily_leaderboard_snapshots_word_id_fkey` | `word_id` | `words(id)` | CASCADE |
| `game_sessions` | `fk_game_sessions_word` | `word_id` | `words(id)` | NO ACTION |
| `game_sessions` | `fk_word_id` | `word_id` | `words(id)` | CASCADE |
| `leaderboard_summary` | `fk_leaderboard_player_to_players` | `player_id` | `players(id)` | NO ACTION |
| `leaderboard_summary` | `fk_leaderboard_summary_player_id_to_players` | `player_id` | `players(id)` | NO ACTION |
| `leaderboard_summary` | `leaderboard_summary_player_id_fkey_temp` | `player_id` | `players(id)` | SET NULL |
| `leaderboard_summary` | `leaderboard_summary_player_id_to_players` | `player_id` | `players(id)` | NO ACTION |
| `leaderboard_summary` | `leaderboard_summary_word_id_fkey` | `word_id` | `words(id)` | CASCADE |
| `player_streaks` | `player_streaks_player_id_fkey` | `player_id` | `players(id)` | CASCADE |
| `scores` | `fk_scores_game_session` | `game_session_id` | `game_sessions(id)` | NO ACTION |
| `scores` | `fk_scores_player_to_players` | `player_id` | `players(id)` | NO ACTION |
| `theme_attempts` | `theme_attempts_player_id_to_players` | `player_id` | `players(id)` | NO ACTION |

### Check Constraints
| Table | Constraint Name | Rule |
|-------|-----------------|------|
| `game_sessions` | `valid_game_state` | `state IN ('active', 'completed')` |
| `theme_attempts` | `check_confidence_percentage_range` | `0 <= confidence_percentage <= 100` |
| `theme_attempts` | `check_similarity_score_range` | `0 <= similarity_score <= 1` |
| `theme_attempts` | `check_matching_method_values` | `matching_method IN ('exact', 'synonym', 'semantic', 'error')` |

---

## ⚠️ Issues to Clean Up

### Duplicate Foreign Keys
These tables have multiple FKs pointing to the same column - should be consolidated:

1. **`game_sessions.word_id`**: 2 FKs with different ON DELETE behavior
   - `fk_game_sessions_word` → NO ACTION
   - `fk_word_id` → CASCADE
   - **Recommend**: Keep CASCADE, drop NO ACTION

2. **`leaderboard_summary.player_id`**: 4 FKs!
   - `fk_leaderboard_player_to_players` → NO ACTION
   - `fk_leaderboard_summary_player_id_to_players` → NO ACTION  
   - `leaderboard_summary_player_id_fkey_temp` → SET NULL
   - `leaderboard_summary_player_id_to_players` → NO ACTION
   - **Recommend**: Keep one with NO ACTION, drop the rest

---

## Key Relationships

```
players (id)
    ├── game_sessions (player_id)
    ├── player_streaks (player_id) [CASCADE]
    ├── leaderboard_summary (player_id)
    ├── scores (player_id)
    └── theme_attempts (player_id)

words (id)
    ├── game_sessions (word_id) [CASCADE]
    ├── leaderboard_summary (word_id) [CASCADE]
    ├── scores (word_id)
    └── daily_leaderboard_snapshots (word_id) [CASCADE]

game_sessions (id)
    └── scores (game_session_id)
```

---

## Database Triggers

### 1. `update_leaderboard_from_game`
**Table**: `game_sessions`  
**When**: After INSERT/UPDATE  
**Logic**:
- Skips if `is_archive_play = true`
- Only processes completed, winning games
- Inserts/updates `leaderboard_summary`

### 2. `update_player_streaks_on_game_completion`
**Table**: `game_sessions`  
**When**: After INSERT/UPDATE  
**Logic**:
- Skips if `is_archive_play = true`
- Updates `player_streaks` based on win/loss
- Strict consecutive day requirement for streaks

---

## Row Level Security (RLS)

All tables have RLS enabled with policies:
- **Public read**: Anonymous users can read (for leaderboards)
- **Service role write**: Only backend can write

---

## Important Notes

### Archive Play vs Live Play
- **Live Play** (`is_archive_play = false`): Today's word, affects streaks and leaderboard
- **Archive Play** (`is_archive_play = true`): Historical word, does NOT affect streaks/leaderboard
- **Theme attempts** also track `is_archive_attempt` separately

### Data Flow
1. Player starts game → `game_sessions` INSERT
2. Player guesses → `game_sessions` UPDATE (guesses array)
3. Game completes → `game_sessions` UPDATE (is_complete, is_won)
4. Trigger fires → Updates `leaderboard_summary` and `player_streaks` (live only)
5. Score calculated → `scores` INSERT

### Theme Guessing
1. Player guesses theme → `theme_attempts` INSERT
2. AI calculates similarity → `confidence_percentage` and `similarity_score` stored
3. Frontend uses confidence to show UN diamond color
4. `matching_method` records how match was determined ('exact', 'synonym', 'semantic')

---

## Supabase Configuration

- **Project**: UnDEFINE v2
- **API URL**: Set in `SUPABASE_URL` env var
- **Anon Key**: Set in `SUPABASE_ANON_KEY` env var  
- **Service Role Key**: Set in `SUPABASE_SERVICE_ROLE_KEY` env var (backend only)

---

## Migration History

See `supabase/migrations/` folder for full history.

---

*This document is the authoritative reference for UnDEFINE's database structure.*

