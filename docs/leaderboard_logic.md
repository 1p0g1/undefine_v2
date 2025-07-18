# Leaderboard Logic and Data Flow Documentation

This document outlines the logic, data flow, and historical migration decisions related to the leaderboard system. It serves as a core reference for understanding how player game completions are processed and reflected in the leaderboard.

## 1. Core Principle: ERD-Driven, Trigger-Based System

The primary goal is a robust, automated leaderboard system where data flows from game completion to leaderboard display primarily through database triggers, adhering to the schema defined in the Entity Relationship Diagram (ERD).

**Key Tables Involved (as per ERD):**

*   `players`: Stores player metadata.
*   `words`: Stores word definitions and IDs.
*   `game_sessions`: Records every game attempt, including start/end times, guesses, and completion status.
*   `user_stats`: ⚠️ **FK-ONLY TABLE** - Exists for foreign key constraints only. Does NOT contain actual data. **Crucially, `leaderboard_summary` has a foreign key to `user_stats.player_id`.**
*   `scores`: Stores detailed scoring information for completed games.
*   `leaderboard_summary`: Stores the actual leaderboard entries, ranked by `best_time` (ascending) and then `guesses_used` (ascending).

## 2. Data Flow on Game Completion

1.  **Game End (`/api/guess.ts`):**
    *   When a game ends, the API updates the corresponding row in `game_sessions`, setting `is_complete = true` and `is_won = true/false`, and records `end_time`, `guesses`, etc.
    *   **Critical Pre-computation:** Before this, the API calls `ensureUserStatsForFK()`. This function ensures a record for the `player_id` exists in `user_stats` (upserting if new) **only for FK constraint purposes**. This is vital because the `leaderboard_summary` table has a foreign key dependency on `user_stats(player_id)`.

2.  **Trigger 1: `update_leaderboard_from_game()` (on `game_sessions` table):**
    *   Defined in `supabase/migrations/20240601000001_fix_leaderboard_data_flow.sql`.
    *   Fires: `AFTER UPDATE OF is_complete, is_won ON game_sessions` specifically `WHEN (OLD.is_complete = FALSE AND NEW.is_complete = TRUE AND NEW.is_won = TRUE)`.
    *   Action:
        *   Calculates `completion_time` (as `best_time`) and `guesses_used` from the `NEW` `game_sessions` record.
        *   `INSERT`s a new entry into `leaderboard_summary` or `UPDATE`s an existing one (`ON CONFLICT (player_id, word_id) DO UPDATE`).
        *   Populates `leaderboard_summary` with `player_id`, `word_id`, `best_time`, `guesses_used`, and `date` (CURRENT_DATE).
        *   Initial `rank` and `was_top_10` are placeholders, as the next trigger handles actual ranking.
        *   The `UPDATE` logic ensures that if a player plays the same word again, their `leaderboard_summary` entry is updated only if their new `best_time` is better.

3.  **Trigger 2: `update_leaderboard_rankings()` (on `leaderboard_summary` table):**
    *   Defined in `supabase/migrations/20240601000001_fix_leaderboard_data_flow.sql`.
    *   Fires: `AFTER INSERT OR UPDATE OF best_time, guesses_used ON leaderboard_summary`.
    *   Action:
        *   For the `word_id` of the inserted/updated row (`NEW.word_id`):
            *   It re-queries all `leaderboard_summary` entries for that `word_id`.
            *   Ranks them using `ROW_NUMBER() OVER (PARTITION BY word_id ORDER BY best_time ASC, guesses_used ASC) as new_rank`.
            *   Updates the `rank` and `was_top_10` (true if `new_rank <= 10`) for all entries for that specific word.

## 3. User Flow Examples

**Scenario 1: Player A completes a word for the first time.**

1.  Player A submits final guess in the UI.
2.  `/api/guess.ts` receives the request.
3.  `updateUserStats` is called:
    *   If Player A is new to `user_stats`, a row is inserted with initial stats.
    *   Player A's aggregate stats (games played, won, etc.) are updated.
4.  The `game_sessions` row for Player A and this word is updated: `is_complete=true`, `is_won=true`, `end_time`, `guesses` are set.
5.  Trigger `update_leaderboard_on_game_complete` fires:
    *   Calculates `best_time` and `guesses_used`.
    *   Inserts a new row into `leaderboard_summary` for Player A / word.
6.  Trigger `update_leaderboard_rankings` fires:
    *   Ranks all entries for this word, including Player A's new entry.
    *   Updates Player A's `rank` and `was_top_10` in `leaderboard_summary`.
7.  Leaderboard UI (e.g., `/api/leaderboard`) querying `leaderboard_summary` now shows Player A's ranked entry.

**Scenario 2: Player B completes the same word, achieving a better time than an existing entry.**

1.  Steps 1-5 are similar to Player A's first completion.
2.  When `update_leaderboard_from_game` inserts/updates Player B's entry in `leaderboard_summary`, the `ON CONFLICT` clause ensures their `best_time` and `guesses_used` are recorded.
3.  Trigger `update_leaderboard_rankings` fires:
    *   Re-ranks all entries for this word. Player B's new score might change their rank and potentially affect others' ranks and `was_top_10` status.
4.  Leaderboard UI reflects the new rankings.

**Scenario 3: Player C replays a word they already completed, but with a slower time.**

1.  Steps 1-4 as above.
2.  Trigger `update_leaderboard_on_game_complete` fires.
3.  The `ON CONFLICT (player_id, word_id) DO UPDATE` clause in `update_leaderboard_from_game` compares the new (slower) `best_time` with the existing `leaderboard_summary.best_time`. Since the new time is not better, the `best_time` and `guesses_used` in `leaderboard_summary` are *not* updated.
4.  Because `best_time` and `guesses_used` did not change in `leaderboard_summary` for Player C, the `update_rankings_after_leaderboard_change` trigger might not fire for Player C's row (depending on exact `UPDATE` behavior if no columns actually change value). Even if it did, their rank wouldn't change relative to others based on this replay.
5.  Leaderboard UI shows Player C's original, better score.

## 4. Migration Audit & Schema Evolution Summary (Focus on `leaderboard_summary`)

The migration history for `leaderboard_summary` was complex, with older migrations attempting to define or populate it with schemas that deviated from the final ERD. The audit aimed to make these migrations idempotent and ensure they defer to later, more correct migrations.

*   **Early Attempts (e.g., `20240515000000_add_score_fields.sql`):**
    *   Created `leaderboard_summary` with `score`, `completion_time_seconds`, and a PK on `(player_id, word_id)`.
    *   **Audit Action:** Made `CREATE TABLE IF NOT EXISTS`. Warnings added about outdated schema. Its DML for `leaderboard_summary` is likely to fail or populate an incorrect structure if it runs before the table is ERD-aligned.

*   **Problematic "Fix" (`20240530000002_fix_leaderboard_summary.sql`):**
    *   Originally used `DROP TABLE CASCADE; CREATE TABLE ...` with a schema still not fully ERD-aligned (e.g., `score`, `completion_time_seconds`, FK to `players(id)`). Also defined ranking functions based on `score`.
    *   **Audit Action:**
        *   Removed `DROP TABLE CASCADE`.
        *   Changed `CREATE TABLE` to `IF NOT EXISTS` and made its non-ERD columns nullable to reduce immediate conflicts.
        *   Renamed its functions/triggers to `_legacy` to avoid conflict with correctly defined ones from `20240601000001_fix_leaderboard_data_flow.sql`.
        *   This migration now acts more as a conditional placeholder if the table doesn't exist, expecting `20241201000005_align_leaderboard_schema.sql` to perform the actual alignment.

*   **Definitive Trigger Logic (`20240601000001_fix_leaderboard_data_flow.sql`):**
    *   This is the **key migration** for the correct, ERD-aligned trigger-based data flow.
    *   Correctly sets FKs on `leaderboard_summary` (to `user_stats(player_id)` and `words(id)`).
    *   Defines `update_leaderboard_from_game()` and `update_leaderboard_rankings()` using `best_time` and `guesses_used` as per ERD.
    *   **Audit Action:** Verified as well-written and idempotent.

*   **Definitive Schema Alignment (`20241201000005_align_leaderboard_schema.sql`):**
    *   This migration is designed to take an *existing* `leaderboard_summary` table (potentially with an older, incorrect schema) and `ALTER` it to match the ERD.
    *   Drops incorrect columns (`score`, `completion_time_seconds`, `created_at`) if they exist.
    *   Migrates data from `completion_time_seconds` to `best_time`.
    *   Corrects the `player_id` FK to point to `user_stats`.
    *   Ensures correct indexes.
    *   Sets `rank` to `NOT NULL` (after a backfill).
    *   **Audit Action:** Verified as well-written, using conditional `ALTER` statements.

**Conclusion of Audit:** The migration chain, after audit and modifications, should now robustly establish the `leaderboard_summary` table according to the ERD and implement the correct trigger-based data flow. Older migrations are less likely to cause conflicts, and the definitive logic resides in the later, ERD-aligned migrations.

## 5. Post-Audit Re-Verification (June 2025)

Following initial `db push` attempts after the main audit, errors were identified related to:
1.  `CREATE TRIGGER IF NOT EXISTS ...`: This syntax is not universally supported (`20240321000000_add_players_table.sql`).
2.  `CREATE INDEX IF NOT EXISTS ... ON table(column)` where `column` did not exist on the already existing `table` on the remote database (`20240515000000_add_score_fields.sql`, `20240515000001_update_score_data.sql`, `20240530000002_fix_leaderboard_summary.sql`). This occurs when older migrations attempt to operate on a schema that has already been advanced by later migrations or manual ERD alignment.

A subsequent re-audit of all migrations was performed:
*   All trigger creations now use the idempotent pattern `DROP TRIGGER IF EXISTS trigger_name ON table_name; CREATE TRIGGER trigger_name ...;`.
*   Problematic `CREATE INDEX` statements and their associated DML (`INSERT INTO leaderboard_summary`) in older migrations (`20240515*` and `20240530000002`) that referenced non-ERD columns in `leaderboard_summary` have been commented out. These migrations now focus on their primary, compatible DDL changes, deferring `leaderboard_summary` structuring and population to the later, ERD-aligned migrations.

This re-verification ensures greater confidence in the syntactic correctness and idempotency of the migration chain when applied to a database whose schema may already partially reflect later migration states.

## 6. CLI Password Management

To avoid repeatedly entering the database password for Supabase CLI commands:

Set the `SUPABASE_DB_PASSWORD` environment variable:

```bash
export SUPABASE_DB_PASSWORD='YourPasswordHere'
```

For persistence, add this line to your shell's configuration file (e.g., `~/.zshrc` or `~/.bashrc`). Remember to source the file or open a new terminal session. 