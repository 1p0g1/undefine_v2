# ⚠️ **DEPRECATED DOCUMENT - ARCHIVED JULY 2, 2025** ⚠️

**Date Deprecated**: July 2, 2025  
**Reason**: Contains outdated schema references and wrong column names  
**Replacement**: See `docs/ACTUAL_DATABASE_SCHEMA.md` for verified schema

## **🚨 CRITICAL ISSUES WITH THIS DOCUMENT:**

1. **WRONG COLUMN NAMES**: Uses `best_streak` vs actual `highest_streak`  
   - **IMPACT**: SQL queries fail with "column does not exist" errors

2. **OUTDATED REFERENCES**: Claims `user_stats` is actively populated  
   - **REALITY**: `user_stats` is FK-only until rebuild (July 2025 strategic decision)

3. **SCHEMA MISMATCHES**: References non-existent relationships  
   - **IMPACT**: Database operations fail

## **✅ USE THESE DOCUMENTS INSTEAD:**
- `docs/ACTUAL_DATABASE_SCHEMA.md` - Verified table structures  
- `docs/CRITICAL_DATABASE_ANALYSIS_JULY_2025.md` - Screenshot-verified facts
- `docs/DOCUMENTATION_CONSOLIDATION_RULES.md` - Verification system

---

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

## 📝 Supabase Join Syntax

When selecting related data through foreign key relationships, use the following pattern:

```typescript
// ✅ Correct: Using table name with explicit field selection
.select(`
  word_id,
  revealed_clues,
  words (
    word,
    definition,
    etymology,
    first_letter,
    in_a_sentence,
    number_of_letters,
    equivalents,
    difficulty,
    date
  )
`)

// ❌ Incorrect: Using column name or wrong syntax
.select(`
  word_id,
  revealed_clues,
  words!inner (
    word
  )
`)
```

Key points:
- Use the table name (`words`) not the column name (`word`)
- List all required fields from the joined table explicitly
- Avoid using `!inner` unless specifically needed for inner joins
- Match table names exactly as defined in Supabase

## 🔁 Current Architecture State

### ⚠️ Player Table Implementation Status
- Player table has not been implemented yet
- Foreign key checks on `game_sessions.player_id` are temporarily disabled to support MVP user testing
- This will be reinstated post-Phase 3 when proper player management is implemented
- Current player IDs are generated client-side and stored in localStorage

### 🔄 Player Migration Plan (Phase 3)

#### Phase 1: Database Setup
- Create `players` table with minimal required fields
- Add database functions for player management:
  - `ensure_player_exists()`: Creates or updates player
  - `update_player_activity()`: Tracks player activity
- Migrate existing player IDs from game sessions

#### Phase 2: Backend Integration
- Add player management utilities:
  - Player type definitions
  - CRUD operations
  - Activity tracking
- Update API routes to use player management:
  - Ensure player exists before game creation
  - Track player activity
  - Handle anonymous players gracefully

#### Phase 3: Frontend Updates
- Update player ID generation to use new system
- Add player metadata management
- Improve error handling for player-related operations

#### Phase 4: Security & Validation
- Re-enable foreign key constraint on `game_sessions.player_id`
- Add proper player validation in all API routes
- Implement RLS policies for player data
- Add rate limiting for player creation

### ✅ Recent Changes (May 2024)
- Fixed incorrect word handling in game sessions:
  - Removed direct `word` field from game_sessions inserts
  - Updated GameSession type to remove incorrect `word` field
  - Verified correct join syntax in /api/guess.ts
  - Impact: Fixes "Could not find the 'word' column" error
  - Files modified:
    - pages/api/word.ts
    - src/types/guess.ts
    - pages/api/guess.ts (verified)
  - Date: May 21, 2024

### 🔄 Next Steps
1. Deploy database migration for players table
2. Test player creation and validation
3. Monitor error rates and performance
4. Plan frontend improvements for player management

---
## Completion Status (May 2025)
Reference: cursor_project_rules/completion_criteria.md
✅ Schema validation complete
✅ Core game logic implemented
⚠️ RLS implementation pending
🚧 Leaderboard functionality in progress
