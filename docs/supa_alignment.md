# Supabase Schema Alignment & Backend Audit

Last Updated: May 2025
Reference: cursor_project_rules/schema_alignment.md

## Status Overview
✅ Backend and frontend deployment
✅ Supabase integration (per rules/db_integration.md)
⚠️ RLS disabled (development)
✅ Game logic validation
🚧 Leaderboard Implementation (rules/feature_roadmap.md):
  - ✅ Database schema
  - ⚠️ Backend integration pending
  - ❌ No active data collection

## Schema ↔ Backend Alignment Table
Reference: cursor_project_rules/db_schema.md

| Table | Backend Repository | Used In Routes | Status |
|-------|-------------------|----------------|---------|
| `words` | wordRepository.ts | `/api/word`, `/api/guess` | ✅ Complete |
| `game_sessions` | gameSessionRepository.ts | `/api/word`, `/api/guess` | ✅ Complete |
| `scores` | scoresRepository.ts | `/api/guess` | ✅ Complete |
| `user_stats` | userStatsRepository.ts | `/api/guess`, `/api/streak-status` | ✅ Complete |
| `leaderboard_summary` | ❌ Not implemented | `/api/leaderboard` (schema only) | 🚧 Pending |

## Current Schema Snapshot

### words 🔑
- `id` uuid PRIMARY KEY
- `word` text NOT NULL UNIQUE
- `definition` text NOT NULL
- `equivalents` text[]
- `first_letter` text NOT NULL
- `in_a_sentence` text NOT NULL
- `number_of_letters` integer NOT NULL
- `etymology` text
- `date` date UNIQUE
- `difficulty` integer

### game_sessions 🔑
- `id` uuid PRIMARY KEY
- `word_id` uuid NOT NULL REFERENCES words(id)
- `word` text NOT NULL
- `player_id` text NOT NULL REFERENCES user_stats(player_id)
- `start_time` timestamptz NOT NULL
- `end_time` timestamptz
- `guesses` text[]
- `state` jsonb
- `clue_status` jsonb

### scores 🔑
- `id` uuid PRIMARY KEY
- `word_id` uuid NOT NULL REFERENCES words(id)
- `word` text NOT NULL
- `player_id` text NOT NULL REFERENCES user_stats(player_id)
- `guesses_used` integer NOT NULL
- `completion_time_seconds` integer NOT NULL
- `created_at` timestamptz NOT NULL DEFAULT now()

### user_stats 🔑
- `player_id` text PRIMARY KEY
- `games_played` integer NOT NULL DEFAULT 0
- `games_won` integer NOT NULL DEFAULT 0
- `current_streak` integer NOT NULL DEFAULT 0
- `best_streak` integer NOT NULL DEFAULT 0
- `avg_guesses` numeric NOT NULL DEFAULT 0
- `last_played_at` timestamptz

### leaderboard_summary 🔑
- `id` uuid PRIMARY KEY
- `player_id` text NOT NULL REFERENCES user_stats(player_id)
- `word` text NOT NULL REFERENCES words(word)
- `rank` integer NOT NULL
- `score` numeric NOT NULL
- `updated_at` timestamptz NOT NULL DEFAULT now()

## Security & RLS Status

⚠️ **Current Status**: RLS is disabled during development and testing.

### Future RLS Implementation
- All repositories are written with RLS compatibility in mind
- Expected rule: `player_id = auth.uid()` or JWT match
- Will be enabled before production release
- Safe for development with RLS disabled

## DB_PROVIDER Configuration

Two valid modes:
- `supabase`: Production mode, uses live Supabase instance
- `mock`: Development mode, uses MockClient for testing

## Known Issues & Fixes
Reference: cursor_project_rules/known_issues.md

### Leaderboard Implementation
✅ Table schema validated
❌ Backend repository not implemented
⚠️ Routes defined but inactive
❌ No active data collection

### ✅ Time Field Standardization
- All time measurements use `completion_time_seconds`
- No millisecond fields in use
- Consistent across all tables and logic

## Foreign Key Constraints

All foreign key relationships are enforced at the database level:

```sql
ALTER TABLE game_sessions
  ADD CONSTRAINT fk_game_sessions_word_id
  FOREIGN KEY (word_id) REFERENCES words(id);

ALTER TABLE game_sessions
  ADD CONSTRAINT fk_game_sessions_player
  FOREIGN KEY (player_id) REFERENCES user_stats(player_id);

ALTER TABLE scores
  ADD CONSTRAINT fk_scores_word_id
  FOREIGN KEY (word_id) REFERENCES words(id);

ALTER TABLE scores
  ADD CONSTRAINT fk_scores_player
  FOREIGN KEY (player_id) REFERENCES user_stats(player_id);

ALTER TABLE leaderboard_summary
  ADD CONSTRAINT fk_leaderboard_player
  FOREIGN KEY (player_id) REFERENCES user_stats(player_id);

ALTER TABLE leaderboard_summary
  ADD CONSTRAINT fk_leaderboard_word
  FOREIGN KEY (word) REFERENCES words(word);
```

---
## Completion Status (May 2025)
Reference: cursor_project_rules/completion_criteria.md
✅ Schema validation complete
✅ Core game logic implemented
⚠️ RLS implementation pending
🚧 Leaderboard functionality in progress
