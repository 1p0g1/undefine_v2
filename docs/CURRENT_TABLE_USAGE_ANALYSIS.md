# Current Supabase Table Usage Analysis & Leaderboard Investigation

**Last Updated**: December 2024  
**Status**: 🚨 CRITICAL ISSUES IDENTIFIED - Players being lost from leaderboard  
**Investigation**: Matilda case study shows data flow breakdowns

## 🔍 ISSUE SUMMARY

**Problem**: Players like "Matilda" complete games successfully but don't appear on leaderboards  
**Evidence**: Database shows completed games but leaderboard_summary is missing entries  
**Impact**: Inconsistent leaderboard experience, lost player engagement

---

## 📊 CURRENT TABLE ARCHITECTURE

### **Table Hierarchy & Data Flow**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│   players   │───▶│ user_stats   │───▶│ leaderboard_    │
│             │    │              │    │ summary         │
│ - id (PK)   │    │ - player_id  │    │ - player_id     │
│ - display_  │    │   (PK, FK)   │    │   (FK to stats) │
│   name      │    │ - games_     │    │ - rank          │
│ - created_  │    │   played     │    │ - best_time     │
│   at        │    │ - current_   │    │ - was_top_10    │
└─────────────┘    │   streak     │    └─────────────────┘
                   └──────────────┘              ▲
                           ▲                     │
          ┌────────────────┴──────────────┐      │
          │                               │      │
    ┌──────────────┐              ┌──────────────┴──┐
    │ game_        │              │ scores          │
    │ sessions     │              │                 │
    │              │              │ - player_id     │
    │ - player_id  │─────────────▶│ - word_id       │
    │ - word_id    │              │ - completion_   │
    │ - is_        │              │   time_seconds  │
    │   complete   │              │ - guesses_used  │
    │ - is_won     │              │ - correct       │
    │ - guesses    │              └─────────────────┘
    │ - start_time │
    │ - end_time   │
    └──────────────┘
```

### **Critical Data Flow Points**

1. **Game Completion** (`/api/guess.ts`)
2. **Trigger Execution** (Database triggers)  
3. **Leaderboard Population** (Automatic)
4. **API Retrieval** (`/api/leaderboard.ts`)

---

## 🔧 CURRENT TABLE USAGE ANALYSIS

### **1. `players` Table** ✅ WORKING
- **Purpose**: Anonymous player identity management
- **Population**: Auto-created via `ensurePlayerExists()` 
- **Usage**: Referenced by all other tables
- **Status**: ✅ Stable

**Current Usage:**
```typescript
// In /api/guess.ts
await ensurePlayerExists(playerId);
```

### **2. `game_sessions` Table** ⚠️ PARTIAL ISSUES  
- **Purpose**: Primary game state tracking
- **Population**: Created on game start, updated on completion
- **Key Fields**: `is_complete`, `is_won`, `start_time`, `end_time`, `guesses`
- **Status**: ⚠️ Trigger dependency issues

**Current Usage:**
```typescript
// Game completion updates
UPDATE game_sessions 
SET is_complete = true, is_won = true, end_time = NOW()
WHERE id = gameId;
```

**🚨 Issue**: Database triggers may not be firing consistently

### **3. `scores` Table** ✅ WORKING
- **Purpose**: Detailed game scoring and performance tracking  
- **Population**: Created on successful game completion
- **Key Fields**: `completion_time_seconds`, `guesses_used`, `correct`, `score`
- **Status**: ✅ Reliable data source

**Current Usage:**
```typescript
// In createScoreEntry()
INSERT INTO scores (player_id, word_id, completion_time_seconds, ...)
VALUES (playerId, wordId, completionTime, ...);
```

### **4. `user_stats` Table** ⚠️ DEPENDENCY CHAIN ISSUES
- **Purpose**: Player performance aggregation
- **Population**: Upserted before leaderboard updates
- **Critical Role**: Foreign key target for `leaderboard_summary`
- **Status**: ⚠️ May have missing entries

**Current Usage:**
```typescript
// Required before leaderboard updates
INSERT INTO user_stats (player_id, current_streak, ...)
VALUES (playerId, 0, ...) ON CONFLICT DO NOTHING;
```

**🚨 Issue**: Foreign key dependency not always satisfied

### **5. `leaderboard_summary` Table** 🚨 CRITICAL ISSUES
- **Purpose**: Optimized leaderboard rankings
- **Population**: Database triggers + manual API calls
- **Key Fields**: `rank`, `best_time`, `guesses_used`, `was_top_10`
- **Status**: 🚨 Inconsistent population

**Current Issues:**
1. **Trigger Failures**: Database triggers not executing
2. **Foreign Key Violations**: Missing `user_stats` entries
3. **Data Flow Gaps**: Manual API calls failing
4. **Ranking Logic**: Inconsistent ranking calculations

---

## 🔬 MATILDA CASE STUDY

**Database Evidence:**
- ✅ Player exists in `players` table
- ✅ Game completion in `game_sessions` (is_complete=true, is_won=true)
- ❓ Unknown: Entry in `scores` table
- ❌ Missing: Entry in `leaderboard_summary` table

**Root Cause Analysis:**

### **Hypothesis 1: Trigger Failure**
Database trigger `update_leaderboard_from_game` may not be firing
```sql
-- Check trigger status
SELECT * FROM pg_trigger 
WHERE tgname = 'update_leaderboard_on_game_complete';
```

### **Hypothesis 2: Foreign Key Constraint Violation**
`leaderboard_summary` requires `user_stats` entry, which may be missing
```sql
-- Check foreign key dependency
SELECT ls.player_id 
FROM leaderboard_summary ls
LEFT JOIN user_stats us ON ls.player_id = us.player_id
WHERE us.player_id IS NULL;
```

### **Hypothesis 3: API Flow Bypass**
Manual leaderboard updates in `/api/guess.ts` may be failing silently

---

## 🏗️ CURRENT INEFFICIENCIES

### **1. Dual Population Methods**
- Database triggers (automatic)
- API calls (manual)
- **Issue**: Inconsistent execution, fallback failures

### **2. Complex Foreign Key Chain**
```
players → user_stats → leaderboard_summary
```
- **Issue**: Multiple points of failure
- **Risk**: Chain breaks cause cascading failures

### **3. Trigger Reliability**
- Triggers depend on specific game_sessions updates
- Complex conditions for firing
- **Issue**: Silent failures, no error reporting

### **4. No Validation Layer**
- No checks for successful leaderboard population
- No monitoring of trigger execution
- **Issue**: Data loss goes undetected

---

## 📈 EFFICIENCY RECOMMENDATIONS

### **Immediate Fixes (Critical)**

1. **Implement Comprehensive Monitoring**
```sql
-- Monitor trigger execution
SELECT * FROM trigger_log 
WHERE trigger_name = 'update_leaderboard_from_game'
ORDER BY executed_at DESC LIMIT 10;
```

2. **Add Validation Layer**
```typescript
// After game completion
const leaderboardEntry = await validateLeaderboardEntry(playerId, wordId);
if (!leaderboardEntry) {
  await forceLeaderboardUpdate(playerId, wordId, scoreData);
}
```

3. **Strengthen Foreign Key Chain**
```typescript
// Ensure complete chain before leaderboard update
await ensurePlayerExists(playerId);
await ensureUserStatsExists(playerId);
await updateLeaderboardSummary(playerId, wordId, data);
```

### **System Improvements**

1. **Unified Data Population**
   - Remove dual trigger/API approach
   - Use single, reliable method
   - Add comprehensive error handling

2. **Real-time Validation**
   - Check leaderboard population after each game
   - Alert on missing entries
   - Auto-retry failed updates

3. **Performance Optimization**
   - Single transaction for game completion
   - Batch ranking updates
   - Optimized indexes for leaderboard queries

---

## 🎯 INVESTIGATION PRIORITIES

### **Phase 1: Data Audit** (Immediate)
1. Check Matilda's complete data trail
2. Identify exact failure point
3. Count total missing leaderboard entries

### **Phase 2: Trigger Analysis** (Critical)
1. Verify trigger existence and configuration
2. Test trigger execution manually
3. Check trigger_log for failure patterns

### **Phase 3: System Repair** (High Priority)  
1. Implement missing entry detection
2. Add automatic repair mechanisms
3. Strengthen data flow validation

---

## 🚨 CRITICAL ACTION ITEMS

1. **Deploy debug endpoints** to investigate Matilda case
2. **Audit trigger functionality** and execution logs
3. **Implement missing entry detection** and alerts
4. **Add comprehensive validation** to game completion flow
5. **Document repair procedures** for missing leaderboard entries

**Next Steps:** Deploy investigation tools and run comprehensive data audit to identify exact failure points in the leaderboard population system. 