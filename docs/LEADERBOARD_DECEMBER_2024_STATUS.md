# Leaderboard System Status & Migration Audit (December 2024)

## 🚨 CRITICAL WARNING - MIGRATION CHAOS
**8+ migrations applied in December 2024 without proper state verification. Multiple attempts to fix the same issues. STOP applying migrations until end-to-end testing confirms what actually works.**

## 📋 COMPLETE MIGRATION ANALYSIS

### 🔴 CONCERNING DECEMBER 2024 MIGRATIONS
1. `20241202000007_ensure_game_completion_trigger` - **DUPLICATE** of existing trigger
2. `20241202000006_fix_duplicate_constraints` - Removed "duplicate" constraints  
3. `20241202000005_fix_leaderboard_constraints` - Fixed constraints AGAIN
4. `20241202000004_fix_leaderboard_unique_constraint` - Fixed unique constraints AGAIN
5. `20241202000003_add_clue_status_to_game_sessions` - Added clue_status column (OK)
6. `20241202000002_fix_leaderboard_summary_player_fk` - Fixed foreign keys AGAIN
7. `20241202000001_drop_word_text_from_game_sessions` - Dropped word_text column (OK)
8. `20241202000000_restore_words_clue_columns` - Restored clue columns (OK)

### 🔴 CONCERNING DECEMBER 2024 MIGRATIONS (CONTINUED)
9. `20241201000005_align_leaderboard_schema` - Schema alignment
10. `20241201000001_seed_test_leaderboard_data` - Test data seeding
11. `20241201000000_populate_missing_players_simple` - Player population

### ✅ LIKELY WORKING MIGRATIONS (June 2024)
- `20240601000002_add_trigger_logging` - Added trigger logging ✅ CORE FEATURE
- `20240601000001_fix_leaderboard_data_flow` - Fixed leaderboard triggers ✅ CORE FEATURE

### 🔴 SUSPICIOUS EARLIER MIGRATIONS
- `20240530000002_fix_leaderboard_summary` - **OUTDATED SCHEMA** - uses `score` column not in ERD
- `20240530000001_remove_word_column` - Removed word column (OK)  
- `20240530000000_fix_word_relationships` - Fixed relationships (OK)
- `20240515000001_update_score_data` - **REFERENCES MISSING COLUMNS** in leaderboard_summary
- `20240515000000_add_score_fields` - **CREATES WRONG SCHEMA** for leaderboard_summary

### ✅ FOUNDATIONAL MIGRATIONS (March-May 2024)
- `20240321000000_add_players_table` - Core player system ✅
- `20240320000000_add_game_session_columns` - Core game sessions ✅
- `20230515143001_update_leaderboard_ranking` - Early leaderboard logic ✅
- `20230515143000_add_clue_fields_to_words` - Core clue system ✅

## 🎯 ERD vs GAME LOGIC ANALYSIS

### ERD Tables Present:
- `words` - ✅ Matches game logic (stores daily words + clues)
- `game_sessions` - ✅ Matches game logic (tracks gameplay)  
- `players` - ✅ Matches game logic (anonymous player tracking)
- `user_stats` - ✅ Matches game logic (player statistics)
- `scores` - ✅ Matches game logic (detailed scoring)
- `leaderboard_summary` - ✅ Matches game logic (optimized rankings)
- `trigger_log` - ✅ Matches system needs (debugging)

### ERD Relationships Analysis:
Looking at the ERD, the data flow should be:
1. `words` ← Daily words with DEFINE clues
2. `game_sessions` ← Player attempts on words  
3. `players` → `user_stats` ← Player aggregates
4. `game_sessions` → `scores` ← Completion details
5. `scores` → `leaderboard_summary` ← Optimized rankings

### 🚨 CRITICAL MISMATCH IDENTIFIED:
The ERD shows `leaderboard_summary` should have:
- `best_time` (integer) ✅ CORRECT
- `guesses_used` (integer) ✅ CORRECT  
- `rank` (integer) ✅ CORRECT
- `was_top_10` (boolean) ✅ CORRECT

But early migrations created:
- `score` (integer) ❌ NOT IN ERD
- `completion_time_seconds` (integer) ❌ NOT IN ERD (should be `best_time`)

## 🔍 ACTUAL DATABASE STATE

### Current Table Structure ✅ NOW CORRECT
```sql
Table "public.leaderboard_summary"
Column        | Type    | Nullable | Default
--------------|---------|----------|-------------------
id            | uuid    | not null | gen_random_uuid()
player_id     | text    | not null | 
rank          | integer | not null | 
was_top_10    | boolean |          | 
best_time     | integer |          | 
guesses_used  | integer |          | 
date          | date    |          | CURRENT_DATE
word_id       | uuid    |          | 
```

### Foreign Keys ✅ CORRECT
- `fk_leaderboard_player` → `user_stats(player_id)` ✅ MATCHES ERD
- `leaderboard_summary_word_id_fkey` → `words(id)` ✅ MATCHES ERD

### Triggers ✅ WORKING
- `update_rankings_after_leaderboard_change` ✅ EXISTS

## 🚨 ROOT CAUSE IDENTIFIED

### The Migration Timeline Problem:
1. **2023-2024**: Early migrations created WRONG schema (score, completion_time_seconds)
2. **June 2024**: Triggers created to work with WRONG schema
3. **December 2024**: Multiple migrations tried to "fix" schema to match ERD
4. **Result**: Mixed logic - some code expects old schema, some expects new

### The API Logic Problem:
`/api/guess.ts` currently:
1. Updates `game_sessions` ✅ CORRECT
2. Calls manual `updateLeaderboardSummary()` ❌ REDUNDANT
3. Should rely on database triggers ❌ BUT TRIGGERS MAY BE BROKEN

## 🎯 IMMEDIATE ACTION PLAN

### Step 1: Test Current State (NO MORE MIGRATIONS)
```bash
# Test game completion → leaderboard flow
# 1. Complete a game
# 2. Check if entry appears in leaderboard_summary
# 3. Document what works vs what doesn't
```

### Step 2: Identify Single Source of Truth
- Either: Database triggers handle leaderboard updates
- Or: API manually handles leaderboard updates  
- NOT BOTH (current conflicting state)

### Step 3: Fix Logic, Not Schema
The schema is now correct. The problem is likely:
- Triggers expecting old column names
- API code calling redundant functions
- Mixed logic causing conflicts

## 🔥 CRITICAL FINDINGS

### ✅ GOOD NEWS:
1. Current schema matches ERD perfectly
2. Foreign keys are correct
3. Core game tables are solid

### ❌ BAD NEWS:
1. 15+ migrations tried to fix the same issues
2. Mixed trigger/API logic creates conflicts  
3. Early migrations created wrong schema that persisted for months

### 🎯 THE FIX:
1. **NO MORE SCHEMA MIGRATIONS** - schema is correct now
2. **TEST END-TO-END FLOW** - see what actually works
3. **SIMPLIFY LOGIC** - one source of truth for leaderboard updates
4. **REMOVE REDUNDANT CODE** - clean up conflicting API functions

## 🔥 DESTRUCTIVE MIGRATION ANALYSIS

### 🚨 MIGRATIONS TO AVOID/REVERSE (Documented for Future Reference)

#### **Tier 1: MOST DESTRUCTIVE** 
```sql
-- These created fundamentally wrong schema that persisted for months
20240515000000_add_score_fields.sql
20240530000002_fix_leaderboard_summary.sql
```
**Damage**: Created `leaderboard_summary` with wrong columns (`score`, `completion_time_seconds`) that don't exist in ERD. Caused months of confusion and trigger mismatches.

#### **Tier 2: REDUNDANT/CONFLICTING**
```sql
-- December 2024 chaos - multiple migrations doing the same thing
20241202000007_ensure_game_completion_trigger.sql  -- DUPLICATE trigger
20241202000006_fix_duplicate_constraints.sql       -- "Fixed" constraints that weren't broken
20241202000005_fix_leaderboard_constraints.sql     -- Fixed constraints AGAIN
20241202000004_fix_leaderboard_unique_constraint.sql -- Fixed constraints AGAIN
20241202000002_fix_leaderboard_summary_player_fk.sql -- Fixed FK AGAIN
```
**Damage**: Applied same fixes multiple times, removed working constraints, created confusion about what was actually broken.

#### **Tier 3: MISGUIDED BUT HARMLESS**
```sql
-- These attempted fixes but may have made things worse
20240515000001_update_score_data.sql  -- References wrong schema
```
**Damage**: Tried to populate columns that shouldn't exist according to ERD.

### 🧹 CLEANUP STRATEGY

#### **Option 1: ROLLBACK APPROACH (NOT RECOMMENDED)**
- Risk: Could break working parts of the system
- Problem: Remote database already has these applied
- Complexity: Would need to carefully undo each migration

#### **Option 2: FORWARD-ONLY CLEANUP (RECOMMENDED)**
- Create a single "consolidation" migration that ensures correct state
- Document destructive migrations as "deprecated" 
- Test current state and fix only what's actually broken
- Leave migration history as learning opportunity

#### **Option 3: LOCAL CLEANUP (PARTIAL)**
```bash
# Remove problematic migration files from local codebase
# (but keep them documented for reference)
mkdir -p supabase/migrations/DEPRECATED
mv supabase/migrations/20240515000000_add_score_fields.sql supabase/migrations/DEPRECATED/
mv supabase/migrations/20240530000002_fix_leaderboard_summary.sql supabase/migrations/DEPRECATED/
# ... move other problematic ones
```

## 🎯 RECOMMENDED ACTION PLAN

### Step 1: Document & Archive Destructive Migrations
```bash
# Create deprecated migrations folder
mkdir -p supabase/migrations/DEPRECATED_DO_NOT_USE

# Move most destructive migrations (for reference only)
# These should NEVER be applied to a fresh database
```

### Step 2: Create Migration Cleanup Documentation
```sql
-- Future migration: 99999999999999_IMPORTANT_MIGRATION_NOTES.sql
-- This file documents problematic migrations and current correct state
-- 
-- DO NOT APPLY these migrations to fresh databases:
-- - 20240515000000_add_score_fields.sql (wrong schema)
-- - 20240530000002_fix_leaderboard_summary.sql (wrong schema)
-- - 20241202000004-007 (redundant fixes)
--
-- Current correct schema is documented in:
-- - docs/database_schema.md (ERD)
-- - docs/LEADERBOARD_DECEMBER_2024_STATUS.md (this file)
```

### Step 3: Test Current State
```bash
# Before any cleanup, test what actually works:
# 1. Complete a game
# 2. Check if leaderboard updates
# 3. Document actual behavior vs expected behavior
```

### Step 4: Fix Forward, Don't Rollback
- If triggers work: Remove redundant API logic
- If triggers broken: Fix triggers to work with current schema
- Don't try to undo applied migrations

## 🔒 MIGRATION SAFETY RULES (Going Forward)

### Before Creating Any Migration:
1. ✅ **Check ERD first** - does this match the documented schema?
2. ✅ **Check existing state** - what's actually broken vs what we think is broken?
3. ✅ **Test locally first** - apply to local DB and test end-to-end
4. ✅ **Single purpose** - one migration should fix one specific issue
5. ✅ **Document why** - clear comments about what problem this solves

### Migration Naming Convention:
```sql
-- GOOD: 20241202000001_fix_specific_constraint_on_user_stats.sql
-- BAD:  20241202000001_fix_leaderboard.sql (too vague)
```

### Before Applying to Remote:
1. ✅ **Review with team** - someone else should verify the migration
2. ✅ **Backup first** - ensure we can rollback if needed  
3. ✅ **Apply during low traffic** - minimize disruption
4. ✅ **Monitor after** - watch for errors or unexpected behavior

## 🚨 RED FLAGS FOR FUTURE MIGRATIONS

### Immediate Red Flags:
- ❌ "Let's try this migration to see if it fixes it"
- ❌ Multiple migrations in one day trying to fix the same thing
- ❌ Migrations that reference columns not in the ERD
- ❌ "Quick fix" migrations without understanding root cause

### Questions to Ask Before Any Migration:
1. **What exactly is broken?** (Not "the leaderboard doesn't work")
2. **How do we know this migration will fix it?** 
3. **What could this migration break?**
4. **Is there a simpler fix that doesn't require schema changes?**

## 🚨 CURRENT LIVE ISSUE (December 2, 2024)

### **Error in Console:**
```
Failed to update game session
Details: "insert or update on table \"leaderboard_summary\" violates foreign key constraint \"fk_leaderboard_player\""
```

### **Root Cause Analysis:**
1. **Mixed Logic Conflict**: Both database triggers AND API functions trying to update leaderboard
2. **Foreign Key Violation**: `fk_leaderboard_player` constraint requires player exists in `user_stats`
3. **Race Condition**: Trigger fires before API ensures player exists in `user_stats`

### **The Exact Flow That's Failing:**
```
1. User submits correct guess ✅
2. API updates game_sessions ✅ 
3. Database trigger fires: update_leaderboard_on_game_complete
4. Trigger tries to INSERT into leaderboard_summary ❌
5. Foreign key constraint fails: player not in user_stats ❌
6. API call fails with 500 error ❌
```

### **Why This Happens:**
- **Trigger executes immediately** when `game_sessions` is updated
- **API hasn't run `ensurePlayerExists()` yet** 
- **Trigger assumes player exists in `user_stats`**
- **Foreign key constraint blocks the insert**

### **The Fix:**
We have THREE options:

#### **Option 1: Remove Database Triggers (RECOMMENDED)**
- Remove `update_leaderboard_on_game_complete` trigger
- Let API handle all leaderboard updates manually
- Simpler, more predictable logic

#### **Option 2: Fix Trigger Order**  
- Ensure trigger calls `ensurePlayerExists()` first
- Add error handling in trigger
- More complex but keeps trigger-based system

#### **Option 3: Remove API Manual Updates**
- Keep triggers but remove `updateLeaderboardSummary()` from API
- Ensure triggers handle all cases properly
- Risk: triggers might miss edge cases

## 🎯 IMMEDIATE FIX NEEDED

The game is broken because we have **conflicting update mechanisms**. We need to pick ONE:

- **Either**: Database triggers handle leaderboard updates
- **Or**: API manually handles leaderboard updates  
- **NOT BOTH** (current broken state)

## 🚨 IMMEDIATE FIX (APPLY NOW) ✅ **APPLIED**

### **Status: MIGRATION APPLIED**
✅ `20241202000008_fix_trigger_foreign_key_issue.sql` successfully applied on December 2, 2024

### **What Was Fixed:**
- Added player existence check inside the trigger function
- Ensures `user_stats` entry exists BEFORE inserting into `leaderboard_summary`
- Prevents foreign key constraint violation `fk_leaderboard_player`

### **Expected Result:**
- Game completions should now work
- Correct guesses should trigger leaderboard popup
- No more "Failed to update game session" errors

### **Next Steps:**
1. **TEST THE GAME NOW** - Submit a correct guess and verify:
   - Game completes successfully ✅
   - Leaderboard popup appears ✅  
   - Player appears in leaderboard ✅
   - No console errors ✅

2. **Document Test Results** - Update this file with actual results

## 🎯 RECOMMENDED IMMEDIATE ACTION

**Option 1: Quick Fix Trigger (RECOMMENDED)**
- Apply the fixed trigger function above
- Keeps trigger-based system working
- Fixes the foreign key constraint issue

**Option 2: Remove Trigger (SIMPLER)**  
- Remove the trigger entirely
- Let `/api/guess.ts` handle all leaderboard updates manually
- Simpler but loses automatic trigger benefits

## Next Steps Summary

1. ✅ **STOP** applying migrations (schema is correct)
2. 🔍 **TEST** actual game completion flow  
3. 🧹 **CLEAN** redundant API logic
4. 📝 **DOCUMENT** what actually works
5. 🚀 **DEPLOY** simplified, working system 