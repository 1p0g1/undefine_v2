# DEPRECATED MIGRATIONS - DO NOT USE

## ⚠️ WARNING
These migrations have been moved here because they are **DESTRUCTIVE** or **REDUNDANT**. 

**DO NOT APPLY** these migrations to any database, especially fresh installations.

## Why These Migrations Are Problematic

### Tier 1: Schema Destruction
These migrations created fundamentally wrong schema that took months to fix:

- `20240515000000_add_score_fields.sql` - Created wrong `leaderboard_summary` schema
- `20240530000002_fix_leaderboard_summary.sql` - Perpetuated wrong schema

**Problem**: Created columns (`score`, `completion_time_seconds`) that don't exist in the ERD, causing months of confusion.

### Tier 2: Redundant Fixes  
These migrations were applied multiple times trying to fix the same issues:

- `20241202000004_fix_leaderboard_unique_constraint.sql` 
- `20241202000005_fix_leaderboard_constraints.sql`
- `20241202000006_fix_duplicate_constraints.sql`
- `20241202000007_ensure_game_completion_trigger.sql`

**Problem**: Applied same constraint fixes multiple times, removed working constraints.

### Tier 3: Misguided Attempts
These migrations tried to fix things that weren't broken or referenced wrong schema:

- `20240515000001_update_score_data.sql` - References columns that shouldn't exist

## Current Correct State

The correct database schema is documented in:
- `docs/database_schema.md` (ERD)
- `docs/LEADERBOARD_DECEMBER_2024_STATUS.md` (Status & Analysis)

## For Fresh Installations

Use only the foundational migrations:
- `20230515143000_add_clue_fields_to_words.sql` ✅
- `20240321000000_add_players_table.sql` ✅  
- `20240320000000_add_game_session_columns.sql` ✅
- `20240601000001_fix_leaderboard_data_flow.sql` ✅
- `20240601000002_add_trigger_logging.sql` ✅

**Skip everything in this DEPRECATED folder.**

## Lessons Learned

1. **Check ERD before creating migrations**
2. **Test end-to-end before applying to remote**
3. **One migration should fix one specific issue**
4. **Don't apply multiple migrations for the same problem**
5. **Document what's actually broken vs what we think is broken** 