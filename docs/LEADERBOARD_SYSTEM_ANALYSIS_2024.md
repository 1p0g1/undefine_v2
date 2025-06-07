# Leaderboard System Analysis & Action Plan
**Date**: December 2024  
**Objective**: Systematic analysis of current database structure and comprehensive action plan for robust leaderboard system  
**Long-term Goals**: Daily leaderboards, streaks, all-time leaderboards, reliable data integrity

---

## 🔍 DATABASE TABLE ANALYSIS

### **1. `game_sessions` Table - ✅ PRIMARY DATA SOURCE (WORKING)**
**Status**: **RELIABLE** - This is our source of truth
**Observations from Screenshot**:
- ✅ Rich data: `player_id`, `word_id`, `is_complete`, `is_won`, `total_time`, `guesses_used`
- ✅ Complete game records with timestamps (`created_at`, `updated_at`)
- ✅ Proper completion tracking (`is_complete: TRUE/FALSE`)
- ✅ Win/loss tracking (`is_won: TRUE/FALSE`)
- ✅ Performance metrics (`total_time`, `guesses_used`)
- ✅ Etymology data (`etymology: "definition"/"false_definition"/"true_definition"`)

**Key Insight**: This table has ALL the data we need - the issue is downstream processing.

---

### **2. `leaderboard_summary` Table - ⚠️ CRITICAL GAPS (PARTIALLY WORKING)**
**Status**: **UNRELIABLE** - Missing many players despite complete games
**Observations from Screenshot**:
- ⚠️ Has entries but clearly missing players (confirmed Matilda case)
- ✅ Correct structure: `player_id`, `word_id`, `rank`, `best_time`, `guesses_used`, `was_top_10`
- ⚠️ Date field present but may have timezone/consistency issues
- 🚨 **ROOT PROBLEM**: Population mechanism is failing

**Critical Issues**:
1. **Trigger Dependency**: Relies on database triggers that fail silently
2. **No Fallback**: When triggers fail, data is permanently lost
3. **No Validation**: No checks to ensure all completed games appear

---

### **3. `players` Table - ✅ WORKING CORRECTLY**
**Status**: **RELIABLE** - Proper player management
**Observations from Screenshot**:
- ✅ Proper player records with meaningful display names
- ✅ Mix of real names ("Brian", "Paddy", "Beth", "Ruth", "Matt Dub") and anonymous players
- ✅ Anonymous tracking (`is_anonymous: TRUE/FALSE`)
- ✅ Metadata storage for additional player info
- ✅ Proper timestamp tracking

**No Issues Identified**: This table is working as expected.

---

### **4. `scores` Table - 🚨 REDUNDANT (REMOVE)**
**Status**: **REDUNDANT** - Confirmed user suspicion
**Observations from Screenshot**:
- 🚨 Only 5 test entries vs hundreds of actual games
- 🚨 Duplicate data that exists in `game_sessions`
- 🚨 Not being populated consistently
- 🚨 Creates confusion and maintenance overhead

**Recommendation**: **DELETE THIS TABLE** - All scoring data should come from `game_sessions`

---

### **5. `trigger_log` Table - ⚠️ SHOWS TRIGGER ISSUES**
**Status**: **REVEALS PROBLEMS** - Evidence of trigger failures
**Observations from Screenshot**:
- ⚠️ Shows `update_leaderboard_from_game` operations
- ⚠️ All operations on `game_sessions` table
- ⚠️ High execution count (55+ triggers) but leaderboard still has gaps
- 🚨 **SMOKING GUN**: Triggers are firing but not succeeding

**Key Insight**: Triggers are executing but failing to complete properly - this explains the missing players.

---

### **6. `user_stats` Table - 🚨 COMPLETELY BROKEN**
**Status**: **CRITICAL FAILURE** - All data is NULL/0
**Observations from Screenshot**:
- 🚨 ALL values are NULL or 0 across all fields
- 🚨 `top_10_count`, `best_rank`, `longest_streak`, `current_streak` all empty
- 🚨 `average_completion_time` all NULL
- 🚨 `games_played`, `games_won` all 0

**Impact**: This breaks any streak functionality and comprehensive player statistics.

---

### **7. `v_trigger_performance` Table - 📊 PERFORMANCE INSIGHTS**
**Status**: **MONITORING DATA** - Shows trigger execution metrics
**Observations from Screenshot**:
- 📊 3 different triggers being tracked
- 📊 `update_leaderboard_from_game`: 55 executions
- 📊 `update_leaderboard_rankings`: 1 execution  
- 📊 `update_scoring_system_schema`: 1 execution

**Insight**: High trigger activity but inconsistent results suggests trigger logic issues.

---

## 🎯 ROOT CAUSE ANALYSIS

### **Primary Issues Identified**:

1. **🚨 Trigger Reliability Crisis**
   - Triggers fire but don't complete successfully
   - No error handling or logging of failures
   - Silent failures leave gaps in leaderboard data

2. **🚨 Data Flow Breakdown**
   - `game_sessions` → `leaderboard_summary` chain is unreliable
   - `user_stats` completely disconnected from actual game data
   - No validation that completed games appear in leaderboards

3. **🚨 Redundant Systems**
   - `scores` table creating confusion and maintenance overhead
   - Multiple ways to track the same data leading to inconsistencies

4. **🚨 Missing Fallback Mechanisms**
   - No manual population system when triggers fail
   - No daily batch jobs to ensure data consistency
   - No alerts when leaderboard population fails

---

## 📋 COMPREHENSIVE ACTION PLAN

### **PHASE 1: IMMEDIATE FIXES (Week 1)**

#### **1.1 Eliminate Redundancy**
- [ ] **DELETE `scores` table** - It's redundant and causing confusion
- [ ] **Update all code references** to use `game_sessions` instead of `scores`
- [ ] **Remove scoring API endpoints** that reference the redundant table

#### **1.2 Build Reliable Leaderboard Population Function**
**Status**: 🔄 REQUIRES MAJOR REDESIGN

**Business Requirements Clarified**:
- ✅ `was_top_10` = "Was in top 10 when daily word ended"
- ✅ Words close at midnight UTC, leaderboards become immutable  
- ✅ Historical preservation required
- ✅ Foundation needed for streaks and all-time leaderboards

**Major System Changes Required**:
- 🚨 **End-of-day snapshot system** (new table + finalization process)
- 🚨 **Immutable daily leaderboards** (current vs historical logic)
- 🚨 **Modified `was_top_10` logic** (real-time for current, frozen for past)
- 🚨 **Daily finalization automation** (midnight UTC jobs)
- 🚨 **All-time stats foundation** (streak tracking, top 10 counts)

**Implementation Progress**:
- [x] **Analysis complete** - Understanding current system
- [x] **✅ COMPLETED**: Create robust population function (`/api/admin/populate-leaderboard`)
- [x] **✅ COMPLETED**: Create validation endpoint (`/api/admin/validate-leaderboard`)
- [ ] **🚨 REDESIGN REQUIRED**: Current functions need major modifications for snapshot system
- [ ] **🔄 NEW PRIORITY**: Design and implement daily snapshot system
- [ ] **🔄 NEW PRIORITY**: Create daily finalization process
- [ ] **🔄 NEW PRIORITY**: Modify triggers for current-day vs historical logic
- [ ] **🔄 NEW PRIORITY**: Build foundation for streak tracking
- [ ] Test with current missing players

**Previous Work Status**:
- ✅ **Population function** - Will be adapted for snapshot system
- ✅ **Validation endpoint** - Will be enhanced for snapshot validation  
- ⚠️ **Current triggers** - Need complete redesign for new business logic

**Next Major Tasks**:
- [x] **✅ COMPLETED**: Design daily snapshot table schema
- [x] **✅ COMPLETED**: Create daily finalization process  
- [x] **✅ COMPLETED**: Modify triggers for dual current/historical logic
- [x] **✅ COMPLETED**: Build automated midnight UTC finalization (cron job)
- [x] **✅ COMPLETED**: Update leaderboard API to use snapshots for historical data
- [ ] **🔄 IMMEDIATE**: Test snapshot system with existing data
- [ ] **🔄 IMMEDIATE**: Deploy migration to production database
- [ ] **🔄 FUTURE**: Implement streak tracking from snapshots
- [ ] **🔄 FUTURE**: Build all-time leaderboard from historical data

**Recent Completions (Daily Snapshot Foundation)**:
- ✅ **Daily Snapshot Table**: `daily_leaderboard_snapshots` with JSONB final rankings
- ✅ **Finalization Functions**: 
  - `finalize_daily_leaderboard()` - Creates immutable snapshots with final `was_top_10`
  - `get_historical_leaderboard()` - Queries historical data from snapshots
  - `should_finalize_date()` - Checks if date should be finalized (past midnight UTC)
  - `auto_finalize_old_snapshots()` - Bulk finalization of unfinalized snapshots
- ✅ **Admin API Endpoint**: `/api/admin/finalize-daily-leaderboard`
  - Manual finalization of specific word/date
  - Auto-finalization of all old snapshots  
  - Comprehensive error handling and progress tracking
  - Returns detailed stats on finalized snapshots

**Recent Completions (Enhanced Leaderboard API)**:
- ✅ **Dual Logic System**: Current day (real-time) vs Historical (snapshots)
- ✅ **Enhanced `/api/leaderboard`**: 
  - `date` parameter support for historical queries
  - `getCurrentDayLeaderboard()` - Real-time data from `leaderboard_summary`
  - `getHistoricalLeaderboard()` - Immutable data from snapshots
  - Auto-finalization fallback for missing snapshots
  - Graceful fallback to real-time when snapshots unavailable
- ✅ **Automated Finalization**: `/api/cron/finalize-daily-leaderboards`
  - Runs at midnight UTC via Vercel Cron (`0 0 * * *`)
  - Finalizes yesterday's leaderboards automatically
  - Prevents duplicate finalization with smart checking
  - Comprehensive error handling and logging
  - Security: Only accessible via Vercel Cron headers
- ✅ **Vercel Cron Configuration**: `vercel.json` with daily schedule

#### **1.3 Fix Missing Players Immediately**
- [ ] **Run one-time backfill** for recent missing players
- [ ] **Validate current day's leaderboard** is complete
- [ ] **Create monitoring** to catch future gaps

### **PHASE 2: ROBUST ARCHITECTURE (Week 2-3)**

#### **2.1 Replace Unreliable Triggers**
- [ ] **Disable current database triggers** causing silent failures
- [ ] **Implement API-based population**:
  - Call leaderboard update after each game completion
  - Include retry logic and error handling
  - Log all operations for debugging
- [ ] **Create daily batch job** as backup:
  - Runs every night to ensure consistency
  - Catches any missed games from API failures
  - Sends alerts if discrepancies found

#### **2.2 Fix User Stats System**
- [ ] **Rebuild user stats calculation logic**:
  - Calculate from `game_sessions` data
  - Include streaks, averages, personal bests
  - Handle edge cases (gaps in play, timezone issues)
- [ ] **Create stats update mechanism**:
  - Update after each game
  - Batch recalculation option
  - Historical stats reconstruction

#### **2.3 Implement Persistent Daily Snapshots**
- [ ] **Create `daily_leaderboard_snapshots` table**:
  - Store final rankings for each day/word
  - Never recalculate - permanent historical record
  - Include metadata (total players, completion stats)
- [ ] **Snapshot creation process**:
  - Generate at end of each day
  - Validate completeness before finalizing
  - Archive system for long-term storage

### **PHASE 3: ADVANCED FEATURES (Week 4+)**

#### **3.1 Streak System**
- [ ] **Design streak calculation logic**:
  - Daily play streaks
  - Win streaks
  - Top-10 streaks
- [ ] **Historical streak reconstruction**
- [ ] **Streak leaderboards and achievements**

#### **3.2 All-Time Leaderboards**
- [ ] **Multi-dimensional leaderboards**:
  - Best average time
  - Best average guesses
  - Most games won
  - Longest streaks
- [ ] **Historical performance tracking**
- [ ] **Season/monthly leaderboards**

#### **3.3 Enhanced Monitoring & Analytics**
- [ ] **Real-time leaderboard health monitoring**
- [ ] **Player engagement analytics**
- [ ] **Performance optimization for large datasets**

---

## 🔧 TECHNICAL SPECIFICATIONS

### **New Table Structure Recommendations**

#### **`daily_leaderboard_snapshots`** (NEW)
```sql
- id (uuid, primary key)
- word_id (uuid, foreign key)
- date (date)
- final_rankings (jsonb) -- Complete leaderboard data
- total_players (integer)
- snapshot_created_at (timestamptz)
- is_finalized (boolean)
```

#### **Enhanced `user_stats`** (REBUILD)
```sql
- player_id (uuid, foreign key)
- total_games_played (integer)
- total_games_won (integer)
- current_daily_streak (integer)
- longest_daily_streak (integer)
- current_win_streak (integer)
- longest_win_streak (integer)
- best_rank_ever (integer)
- best_time_ever (interval)
- average_completion_time (interval)
- average_guesses (decimal)
- top_10_appearances (integer)
- first_game_date (date)
- last_game_date (date)
- stats_updated_at (timestamptz)
```

### **API Endpoints to Create**
- `POST /api/admin/populate-leaderboard` - Manual population
- `GET /api/admin/validate-leaderboard` - Validation checks
- `POST /api/admin/create-daily-snapshot` - Snapshot creation
- `GET /api/stats/player/{playerId}` - Enhanced player stats
- `GET /api/leaderboard/all-time` - All-time leaderboards

---

## 🎯 SUCCESS METRICS

### **Immediate (Phase 1)**
- [ ] Zero missing players on daily leaderboards
- [ ] Leaderboard population time < 2 seconds
- [ ] 100% reliability for completed games appearing

### **Medium-term (Phase 2)**
- [ ] User stats accuracy: 100% match with game data
- [ ] Daily snapshot creation: 100% success rate
- [ ] System can handle 1000+ daily players

### **Long-term (Phase 3)**
- [ ] Streak calculations: 100% accurate
- [ ] All-time leaderboards: Real-time updates
- [ ] Historical data: Complete reconstruction capability

---

## 🚨 CRITICAL NEXT STEPS

1. **IMMEDIATE**: Delete redundant `scores` table
2. **THIS WEEK**: Build reliable leaderboard population function
3. **PRIORITY**: Fix current day's missing players issue
4. **FOUNDATION**: Implement persistent daily snapshots

This systematic approach will create a robust, scalable leaderboard system that supports current needs and future enhancements like streaks and all-time leaderboards.

---

## 📋 TASK LOG & PROGRESS TRACKING

### **PHASE 1: IMMEDIATE FIXES**

#### **1.1 Eliminate Redundancy**
**Status**: ⏸️ DEFERRED (will do after population function is stable)
- [ ] Delete `scores` table
- [ ] Update code references
- [ ] Remove redundant API endpoints

#### **1.2 Build Reliable Leaderboard Population Function**
**Status**: 🔄 REQUIRES MAJOR REDESIGN

**Business Requirements Clarified**:
- ✅ `was_top_10` = "Was in top 10 when daily word ended"
- ✅ Words close at midnight UTC, leaderboards become immutable  
- ✅ Historical preservation required
- ✅ Foundation needed for streaks and all-time leaderboards

**Major System Changes Required**:
- 🚨 **End-of-day snapshot system** (new table + finalization process)
- 🚨 **Immutable daily leaderboards** (current vs historical logic)
- 🚨 **Modified `was_top_10` logic** (real-time for current, frozen for past)
- 🚨 **Daily finalization automation** (midnight UTC jobs)
- 🚨 **All-time stats foundation** (streak tracking, top 10 counts)

**Implementation Progress**:
- [x] **Analysis complete** - Understanding current system
- [x] **✅ COMPLETED**: Create robust population function (`/api/admin/populate-leaderboard`)
- [x] **✅ COMPLETED**: Create validation endpoint (`/api/admin/validate-leaderboard`)
- [ ] **🚨 REDESIGN REQUIRED**: Current functions need major modifications for snapshot system
- [ ] **🔄 NEW PRIORITY**: Design and implement daily snapshot system
- [ ] **🔄 NEW PRIORITY**: Create daily finalization process
- [ ] **🔄 NEW PRIORITY**: Modify triggers for current-day vs historical logic
- [ ] **🔄 NEW PRIORITY**: Build foundation for streak tracking
- [ ] Test with current missing players

**Previous Work Status**:
- ✅ **Population function** - Will be adapted for snapshot system
- ✅ **Validation endpoint** - Will be enhanced for snapshot validation  
- ⚠️ **Current triggers** - Need complete redesign for new business logic

**Next Major Tasks**:
- [x] **✅ COMPLETED**: Design daily snapshot table schema
- [x] **✅ COMPLETED**: Create daily finalization process  
- [x] **✅ COMPLETED**: Modify triggers for dual current/historical logic
- [x] **✅ COMPLETED**: Build automated midnight UTC finalization (cron job)
- [x] **✅ COMPLETED**: Update leaderboard API to use snapshots for historical data
- [ ] **🔄 IMMEDIATE**: Test snapshot system with existing data
- [ ] **🔄 IMMEDIATE**: Deploy migration to production database
- [ ] **🔄 FUTURE**: Implement streak tracking from snapshots
- [ ] **🔄 FUTURE**: Build all-time leaderboard from historical data

**Recent Completions (Daily Snapshot Foundation)**:
- ✅ **Daily Snapshot Table**: `daily_leaderboard_snapshots` with JSONB final rankings
- ✅ **Finalization Functions**: 
  - `finalize_daily_leaderboard()` - Creates immutable snapshots with final `was_top_10`
  - `get_historical_leaderboard()` - Queries historical data from snapshots
  - `should_finalize_date()` - Checks if date should be finalized (past midnight UTC)
  - `auto_finalize_old_snapshots()` - Bulk finalization of unfinalized snapshots
- ✅ **Admin API Endpoint**: `/api/admin/finalize-daily-leaderboard`
  - Manual finalization of specific word/date
  - Auto-finalization of all old snapshots  
  - Comprehensive error handling and progress tracking
  - Returns detailed stats on finalized snapshots

**Recent Completions (Enhanced Leaderboard API)**:
- ✅ **Dual Logic System**: Current day (real-time) vs Historical (snapshots)
- ✅ **Enhanced `/api/leaderboard`**: 
  - `date` parameter support for historical queries
  - `getCurrentDayLeaderboard()` - Real-time data from `leaderboard_summary`
  - `getHistoricalLeaderboard()` - Immutable data from snapshots
  - Auto-finalization fallback for missing snapshots
  - Graceful fallback to real-time when snapshots unavailable
- ✅ **Automated Finalization**: `/api/cron/finalize-daily-leaderboards`
  - Runs at midnight UTC via Vercel Cron (`0 0 * * *`)
  - Finalizes yesterday's leaderboards automatically
  - Prevents duplicate finalization with smart checking
  - Comprehensive error handling and logging
  - Security: Only accessible via Vercel Cron headers
- ✅ **Vercel Cron Configuration**: `vercel.json` with daily schedule

#### **1.3 Fix Missing Players**
**Status**: ⏳ PENDING (depends on 1.2)
- [ ] One-time backfill script
- [ ] Current day validation
- [ ] Monitoring setup 