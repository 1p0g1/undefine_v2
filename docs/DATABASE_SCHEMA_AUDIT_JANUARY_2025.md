# Database Schema Audit - January 13, 2025

## 🔍 **AUDIT OVERVIEW**

**Context**: Database schema has grown significantly. This audit cross-references actual Supabase tables (via screenshots) with our documentation to identify unused/redundant tables and ensure documentation accuracy.

**Sources**:
- ✅ Supabase screenshots (January 13, 2025)
- ✅ Current documentation (Tier 1 docs)
- ✅ Production API usage analysis

---

## 📊 **COMPLETE SCHEMA INVENTORY**

### **🟢 CORE TABLES (Essential & Actively Used)**

#### **1. `players` - Player Management**
```sql
- id (text) - Primary key
- display_name (text) - Player name
- created_at (timestamptz) - Registration date
- last_active (timestamptz) - Last activity
- is_anonymous (bool) - Anonymous flag
- nickname (text) - Current nickname
- last_nickname_change (timestamptz) - Nickname change tracking
```
**Status**: ✅ ESSENTIAL - Core player identity system

#### **2. `words` - Game Content**
```sql
- id (uuid) - Primary key
- date (date) - Game date
- word (text) - The word to guess
- definition (text) - Word definition
- etymology (text) - Word origin
- first_letter (text) - First letter clue
- in_a_sentence (text) - Usage example
- number_of_letters (int4) - Length clue
- equivalents (text) - Similar words
- difficulty (text) - Difficulty level
- theme (text) - Weekly theme
- created_at (timestamptz) - Creation date
```
**Status**: ✅ ESSENTIAL - Game content foundation

#### **3. `game_sessions` - Game Records**
```sql
- id (uuid) - Primary key
- player_id (text) - Player reference
- word_id (uuid) - Word reference
- date (text) - Game date
- start_time (timestamptz) - Session start
- end_time (timestamptz) - Session end
- guesses (text) - All guesses made
- guesses_used (int4) - Number of guesses
- revealed_clues (text) - Clues revealed
- is_complete (bool) - Game finished
- is_won (bool) - Game won
- clue_status (jsonb) - Clue state
- theme_guess (text) - Theme guess
- created_at (timestamptz) - Creation date
- updated_at (timestamptz) - Last update
```
**Status**: ✅ ESSENTIAL - Core game mechanics

#### **4. `player_streaks` - Streak Tracking**
```sql
- player_id (text) - Primary key
- current_streak (int4) - Current streak
- highest_streak (int4) - Best streak
- streak_start_date (date) - Streak start
- last_win_date (date) - Last win
- created_at (timestamptz) - Creation date
- updated_at (timestamptz) - Last update
```
**Status**: ✅ ESSENTIAL - All-time leaderboard dependency

#### **5. `daily_leaderboard_snapshots` - Immutable Daily Rankings**
```sql
- id (uuid) - Primary key
- word_id (uuid) - Word reference
- date (date) - Game date
- final_rankings (jsonb) - Final rankings
- total_players (int4) - Player count
- is_finalized (bool) - Finalization status
- finalized_at (timestamptz) - Finalization time
- created_at (timestamptz) - Creation date
- updated_at (timestamptz) - Last update
```
**Status**: ✅ ESSENTIAL - Daily snapshots system (100% functional)

---

### **🟡 LEGACY/QUESTIONABLE TABLES**

#### **6. `leaderboard_summary` - Historical Rankings**
```sql
- id (uuid) - Primary key
- word_id (uuid) - Word reference
- player_id (text) - Player reference
- rank (int4) - Player rank
- best_time (int4) - Completion time
- guesses_used (int4) - Guesses count
- was_top_10 (bool) - Top 10 status
- date (date) - Game date
```
**Status**: ⚠️ LEGACY - Replaced by daily_leaderboard_snapshots
**Usage**: Still used by All-Time Leaderboard API (should migrate)
**Action**: Phase out in favor of daily_leaderboard_snapshots

#### **7. `scores` - Detailed Scoring**
```sql
- id (uuid) - Primary key
- world_id (uuid) - Word reference (typo?)
- game_session_id (uuid) - Session reference
- player_id (text) - Player reference
- score (int4) - Total score
- base_score (int4) - Base score
- guess_penalty (int4) - Guess penalty
- time_penalty (int4) - Time penalty
- hint_penalty (int4) - Hint penalty
- correct (bool) - Correct answer
- nickname (text) - Player nickname
- guesses_used (int4) - Guesses count
- used_hint (bool) - Hint used
- completion_time_sec (int4) - Completion time
- submitted_at (timestamp) - Submission time
- fuzzy_bonus (int4) - Fuzzy match bonus
```
**Status**: ❓ UNCLEAR - Potentially redundant with game_sessions
**Issues**: 
- Column name inconsistency (world_id vs word_id)
- Overlaps with game_sessions data
- Not used in All-Time Leaderboard
**Action**: Investigate usage and consider removal

#### **8. `user_stats` - Aggregated Statistics**
```sql
- player_id (text) - Primary key
- games_played (int4) - Total games
- best_rank (int4) - Best rank
- longest_streak (int4) - Longest streak
- current_streak (int4) - Current streak
- average_completion_time (float8) - Avg time
- last_played_word (text) - Last word
- top_10_count (int4) - Top 10 count
- games_won (int4) - Games won
```
**Status**: ❌ DEPRECATED - Not populated, stats calculated from other tables
**Documentation**: Tier 1 docs confirm this is empty
**Action**: Remove entirely

#### **9. `theme_attempts` - Theme Guessing**
```sql
- id (uuid) - Primary key
- player_id (text) - Player reference
- theme (text) - Theme name
- guess (text) - Player's guess
- is_correct (bool) - Correct guess
- attempt_date (date) - Attempt date
- words_completed_when_guessed (int4) - Words completed
- total_word_guesses (int4) - Total guesses
- created_at (timestamptz) - Creation date
```
**Status**: ✅ USED - Theme system functionality
**Note**: Part of working theme system

---

### **🔧 SYSTEM TABLES**

#### **10. `trigger_log` - Debugging**
```sql
- id (uuid) - Primary key
- trigger_name (text) - Trigger name
- table_name (text) - Table name
- operation (text) - Operation type
- old_data (jsonb) - Old data
- new_data (jsonb) - New data
- execution_time (interval) - Execution time
- executed_at (timestamptz) - Execution time
```
**Status**: ✅ UTILITY - Debugging and monitoring

#### **11. `schema_migrations` - Version Control**
```sql
- version (text) - Migration version
- applied_at (timestamptz) - Application time
```
**Status**: ✅ SYSTEM - Migration tracking

---

## 🚨 **CRITICAL AUDIT FINDINGS**

### **❌ IMMEDIATE ISSUES**

1. **`user_stats` Table is Empty but Referenced**
   - **Issue**: Documentation references it as populated
   - **Reality**: Completely empty (verified in July 2025)
   - **Action**: Remove table and all references

2. **`scores` Table Usage Unclear**
   - **Issue**: Potential data duplication with game_sessions
   - **Concern**: Column name inconsistency (world_id vs word_id)
   - **Action**: Investigate and potentially remove

3. **`leaderboard_summary` vs `daily_leaderboard_snapshots`**
   - **Issue**: Two systems for same purpose
   - **Current**: All-Time Leaderboard uses leaderboard_summary
   - **Better**: Should use daily_leaderboard_snapshots (immutable)
   - **Action**: Migrate All-Time Leaderboard to use snapshots

### **⚠️ DOCUMENTATION INCONSISTENCIES**

1. **Column Name Mismatches**
   - `longest_streak` vs `highest_streak` (docs use both)
   - `world_id` vs `word_id` (inconsistent naming)

2. **Usage Assumptions**
   - Several docs assume user_stats is populated
   - Some docs reference removed Top 10 functionality

3. **Missing Table Documentation**
   - `trigger_log` not documented
   - `theme_attempts` under-documented

---

## 📋 **RECOMMENDED CLEANUP ACTIONS**

### **🔥 HIGH PRIORITY**

1. **Remove `user_stats` Table**
   ```sql
   DROP TABLE user_stats;
   ```
   - Update all documentation references
   - Remove from API queries
   - Update types and interfaces

2. **Investigate `scores` Table Usage**
   - Check if any APIs use it
   - Verify data quality and consistency
   - Consider migration to game_sessions if redundant

3. **Migrate All-Time Leaderboard**
   - Switch from leaderboard_summary to daily_leaderboard_snapshots
   - Use immutable historical data
   - Better data integrity

### **📊 MEDIUM PRIORITY**

4. **Standardize Column Names**
   - Fix world_id → word_id inconsistency
   - Standardize streak column names
   - Update all references

5. **Update Documentation**
   - Fix all user_stats references
   - Document actual table usage
   - Update schema diagrams

### **🔍 LOW PRIORITY**

6. **Evaluate `leaderboard_summary` Necessity**
   - After All-Time Leaderboard migration
   - Check for other dependencies
   - Consider removal if unused

7. **Optimize `trigger_log`**
   - Set up log rotation
   - Add indexes if needed
   - Monitor size growth

---

## 🎯 **SIMPLIFIED SCHEMA PROPOSAL**

### **Essential Tables Only (8 tables)**

1. **`players`** - Player identity
2. **`words`** - Game content
3. **`game_sessions`** - Game records
4. **`player_streaks`** - Streak tracking
5. **`daily_leaderboard_snapshots`** - Immutable daily rankings
6. **`theme_attempts`** - Theme guessing
7. **`trigger_log`** - System logging
8. **`schema_migrations`** - Version control

### **Removed Tables (3 tables)**

- ❌ `user_stats` - Empty/unused
- ❌ `scores` - Redundant with game_sessions
- ❌ `leaderboard_summary` - Replaced by daily_leaderboard_snapshots

### **Benefits of Cleanup**

- **Reduced complexity** - 33% fewer tables
- **Better performance** - No redundant queries
- **Data integrity** - Single source of truth
- **Easier maintenance** - Less to document/maintain

---

## 📊 **CURRENT vs PROPOSED SCHEMA**

| Category | Current | Proposed | Change |
|----------|---------|----------|--------|
| Core Tables | 5 | 5 | ✅ Same |
| Legacy Tables | 4 | 1 | ✅ -3 |
| System Tables | 2 | 2 | ✅ Same |
| **Total** | **11** | **8** | **✅ -3** |

---

## 🔄 **MIGRATION STRATEGY**

### **Phase 1: Documentation Audit (Immediate)**
- ✅ Update Tier 1 docs to reflect actual schema
- ✅ Remove user_stats references
- ✅ Fix column name inconsistencies

### **Phase 2: API Migration (Week 1)**
- Migrate All-Time Leaderboard to use daily_leaderboard_snapshots
- Investigate scores table usage
- Test all endpoints

### **Phase 3: Schema Cleanup (Week 2)**
- Remove user_stats table
- Remove scores table (if redundant)
- Remove leaderboard_summary (if unused)

### **Phase 4: Optimization (Week 3)**
- Add necessary indexes
- Optimize trigger_log
- Performance testing

---

## 📝 **VERIFICATION CHECKLIST**

### **Before Cleanup**
- [ ] Verify no APIs use user_stats
- [ ] Check scores table usage
- [ ] Backup all data
- [ ] Test All-Time Leaderboard migration

### **After Cleanup**
- [ ] All APIs working
- [ ] All-Time Leaderboard functional
- [ ] Theme system working
- [ ] Daily snapshots working
- [ ] Documentation updated

---

*Last Updated: January 13, 2025*
*Next Review: January 20, 2025* 