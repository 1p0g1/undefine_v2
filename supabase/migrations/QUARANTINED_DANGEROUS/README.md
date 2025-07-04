# QUARANTINED DANGEROUS MIGRATIONS

## ⚠️ CRITICAL WARNING ⚠️

**These migrations have been QUARANTINED due to dangerous patterns that caused SERIOUS DATABASE DAMAGE.**

**DO NOT APPLY THESE MIGRATIONS!** They contain destructive operations that will break your database schema.

## What Happened

On July 4, 2025, we discovered that the game was completely broken due to missing database columns. Investigation revealed that multiple migrations contained catastrophic design flaws:

### 1. **UP+DOWN in Same File Pattern**
Several migrations incorrectly included both UP and DOWN operations in the same file, causing them to:
- ✅ Add columns/constraints (UP operation)
- ❌ **Immediately drop them** (DOWN operation)
- Result: **Broken database schema**

### 2. **Multiple Column/Constraint Drops**
Other migrations contained multiple DROP operations that would destroy critical database structure.

## Damage Caused

The following critical damage was already caused by these broken migrations:

### `20230515143000_add_clue_fields_to_words.sql` (ALREADY APPLIED)
- **DROPPED ALL CLUE COLUMNS** from words table:
  - `etymology`
  - `first_letter`
  - `in_a_sentence`
  - `number_of_letters`
  - `equivalents`
  - `difficulty`
- **DROPPED `clue_status`** from game_sessions table
- **This broke the entire game** - players couldn't submit guesses

## Quarantined Migrations

### **CATASTROPHIC PATTERN: UP+DOWN in Same File**

#### `20240530000001_remove_word_column.sql`
- Drops `word` column from game_sessions
- Then immediately adds it back
- **Result**: Confusing and potentially destructive

#### `20240530000000_fix_word_relationships.sql`
- Creates foreign key constraints and indexes
- Then immediately drops them
- **Result**: No actual improvements, potential data loss

#### `20230515143000_add_clue_fields_to_words.sql` (Duplicate)
- Duplicate of the already-applied broken migration
- Contains same destructive UP+DOWN pattern

### **DANGEROUS PATTERN: Multiple Drops**

#### `20241201000005_align_leaderboard_schema.sql`
- Drops multiple columns: `score`, `completion_time_seconds`, `created_at`
- Drops constraints and indexes
- **Risk**: Complete loss of leaderboard data structure

#### `20241202000004_fix_leaderboard_unique_constraint.sql`
- Drops critical unique constraints
- **Risk**: Data integrity violations

#### `20241202000005_fix_leaderboard_constraints.sql`
- Drops multiple constraints and indexes
- **Risk**: Loss of data relationships and performance

#### `20241202000001_drop_word_text_from_game_sessions.sql`
- Drops `word` column from game_sessions
- **Risk**: Loss of game session data

## Recovery Actions Taken

1. ✅ **Restored words table clue columns** via direct database operations
2. ✅ **Restored game_sessions clue_status column** via direct database operations
3. ✅ **Fixed the main broken migration** by removing DOWN operations
4. ✅ **Quarantined all dangerous migrations** to prevent future damage
5. ✅ **Game is now working again**

## Prevention Measures

1. **Migration Design Rule**: NEVER include DOWN operations in UP migration files
2. **Review Process**: All migrations must be reviewed for destructive patterns
3. **Testing**: Migrations must be tested in isolation before deployment
4. **Backup**: Always backup database before applying migrations

## If You Need These Changes

If any of these migrations contain legitimate changes that are needed:

1. **Extract only the constructive parts** (ADD COLUMN, CREATE INDEX, etc.)
2. **Remove all destructive operations** (DROP COLUMN, DROP CONSTRAINT, etc.)
3. **Test thoroughly** in a development environment
4. **Apply incrementally** with proper rollback plans

## Contact

If you have questions about these quarantined migrations, refer to the git history and the main migration audit documentation.

---

**Date Quarantined**: July 4, 2025  
**Reason**: Catastrophic database schema damage  
**Status**: PERMANENTLY QUARANTINED - DO NOT USE** 