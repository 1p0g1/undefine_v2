# UnDEFINE Database Architecture

> **SINGLE SOURCE OF TRUTH** - This document supersedes all other database references.
> Last Updated: 2024-12-19

## Overview

UnDEFINE uses **Supabase** (PostgreSQL) as its primary database. All game state, player data, and leaderboard information is stored here.

---

## Tables

### 1. `players`
**Purpose**: Core player identity table. Every player has one record.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | text | NO | - | **PRIMARY KEY** - UUID string |
| `created_at` | timestamp with time zone | YES | CURRENT_TIMESTAMP | When player first played |
| `updated_at` | timestamp with time zone | YES | CURRENT_TIMESTAMP | Last activity |
| `nickname` | text | YES | NULL | Optional display name |

**Indexes**: Primary key on `id`

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
| `created_at` | timestamp with time zone | YES | CURRENT_TIMESTAMP | - |

**Indexes**: Primary key on `id`, index on `date`

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
| `start_time` | timestamp with time zone | YES | NULL | When game started |
| `end_time` | timestamp with time zone | YES | NULL | When game ended |
| `created_at` | timestamp with time zone | YES | CURRENT_TIMESTAMP | - |
| `updated_at` | timestamp with time zone | YES | CURRENT_TIMESTAMP | - |
| `state` | text | YES | 'active' | Game state |
| `theme_guess` | text | YES | NULL | Player's theme guess |
| `clue_status` | jsonb | YES | (default jsonb) | Which clues revealed |
| `used_hint` | boolean | YES | false | Hint used? |
| `is_archive_play` | boolean | YES | false | **Archive vs live game** |
| `game_date` | date | YES | NULL | **Date of word played** |

**Indexes**: Primary key on `id`, indexes on `player_id`, `word_id`, `is_archive_play`, `game_date`

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
| `created_at` | timestamp with time zone | YES | CURRENT_TIMESTAMP | - |
| `updated_at` | timestamp with time zone | YES | CURRENT_TIMESTAMP | - |

**Indexes**: Primary key on `player_id`

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

**Indexes**: Primary key on `id`, unique constraint on (`player_id`, `word_id`)

**Note**: Only contains WINNING games. Updated by trigger on `game_sessions`.

---

### 6. `scores`
**Purpose**: Detailed scoring breakdown for completed games.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | - | **PRIMARY KEY** |
| `player_id` | text | YES | NULL | FK to players.id |
| `word_id` | uuid | YES | NULL | FK to words.id |
| `guesses_used` | integer | YES | NULL | Number of guesses |
| `completion_time_seconds` | integer | YES | NULL | Time to complete |
| `correct` | boolean | YES | NULL | Won? |
| `score` | integer | YES | NULL | Final calculated score |
| `base_score` | integer | YES | NULL | Score before penalties |
| `guess_penalty` | integer | YES | 0 | (Deprecated) |
| `fuzzy_bonus` | integer | YES | 0 | Bonus for fuzzy matches |
| `time_penalty` | integer | YES | 0 | Penalty for slow completion |
| `hint_penalty` | integer | YES | 0 | Penalty for using hints |
| `submitted_at` | timestamp with time zone | YES | NULL | - |

**Indexes**: Primary key on `id`

---

### 7. `theme_attempts`
**Purpose**: Track weekly theme guesses.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | - | **PRIMARY KEY** |
| `player_id` | text | YES | NULL | FK to players.id |
| `theme_guess` | text | YES | NULL | Player's guess |
| `actual_theme` | text | YES | NULL | Correct theme |
| `is_correct` | boolean | YES | NULL | Exact match? |
| `confidence_percentage` | numeric | YES | NULL | AI similarity score |
| `week_start` | date | YES | NULL | Start of theme week |
| `created_at` | timestamp with time zone | YES | CURRENT_TIMESTAMP | - |

**Indexes**: Primary key on `id`, unique constraint on (`player_id`, `week_start`)

---

### 8. `daily_leaderboard_snapshots`
**Purpose**: Historical snapshots of daily leaderboards.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | - | **PRIMARY KEY** |
| `date` | date | YES | NULL | Date of snapshot |
| `snapshot_data` | jsonb | YES | NULL | Full leaderboard data |
| `created_at` | timestamp with time zone | YES | CURRENT_TIMESTAMP | - |

**Indexes**: Primary key on `id`

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
| `created_at` | timestamp with time zone | YES | CURRENT_TIMESTAMP | - |

**Indexes**: Primary key on `id`

---

### 10. `schema_migrations`
**Purpose**: Track applied database migrations.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `version` | text | NO | - | **PRIMARY KEY** - Migration version |
| `applied_at` | timestamp with time zone | YES | CURRENT_TIMESTAMP | When applied |

---

## Key Relationships

```
players (id)
    ├── game_sessions (player_id)
    ├── player_streaks (player_id) 
    ├── leaderboard_summary (player_id)
    ├── scores (player_id)
    └── theme_attempts (player_id)

words (id)
    ├── game_sessions (word_id)
    ├── leaderboard_summary (word_id)
    └── scores (word_id)
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

### Data Flow
1. Player starts game → `game_sessions` INSERT
2. Player guesses → `game_sessions` UPDATE (guesses array)
3. Game completes → `game_sessions` UPDATE (is_complete, is_won)
4. Trigger fires → Updates `leaderboard_summary` and `player_streaks` (live only)
5. Score calculated → `scores` INSERT

### Theme Guessing
1. Player guesses theme → `theme_attempts` INSERT
2. AI calculates similarity → `confidence_percentage` stored
3. Frontend uses confidence to show UN diamond color

---

## Supabase Configuration

- **Project**: UnDEFINE v2
- **Region**: (check Supabase dashboard)
- **API URL**: Set in `SUPABASE_URL` env var
- **Anon Key**: Set in `SUPABASE_ANON_KEY` env var  
- **Service Role Key**: Set in `SUPABASE_SERVICE_ROLE_KEY` env var (backend only)

---

## Migration History

See `supabase/migrations/` folder for full history. Key migrations:
- Initial schema setup
- Added theme support
- Added archive play columns
- Implemented streak triggers
- RLS policies

---

*This document is the authoritative reference for UnDEFINE's database structure.*

