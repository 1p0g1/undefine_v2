# Database Cleanup Plan - July 2025
## Based on TIER 1 Documentation Analysis

### 🎯 **OBJECTIVE**
Remove redundant code and optimize database schema while maintaining leaderboard functionality.

## 📊 **TABLE CLASSIFICATION**

### ✅ **ESSENTIAL TABLES** (Keep as-is)
- `game_sessions` - Source of truth for game data
- `leaderboard_summary` - Primary leaderboard rankings
- `player_streaks` - Win streak tracking (needs migration fix)
- `players` - Player identity
- `words` - Game content

### ⚠️ **PROBLEMATIC TABLES** (Needs action)

#### `user_stats` - ABANDONED BUT FK-REQUIRED
**Status**: All data is zeros/nulls, but required for foreign keys
**Action**: Keep table but remove redundant writes
**Cleanup**:
1. Remove unnecessary upserts in `/api/guess.ts` (lines 111-201)
2. Replace `theme-stats.ts` and `streak-status.ts` to use `player_streaks` instead
3. Keep minimal FK-only records

#### `scores` - REDUNDANT DATA
**Status**: Duplicates `game_sessions` data, only used in debug
**Action**: Consider deprecation
**Cleanup**:
1. Remove score writes from `/api/guess.ts` (line 234)
2. Update debug endpoints to use `game_sessions` data instead
3. Add deprecation warnings

### 📸 **ARCHIVAL TABLES** (Optimize)
- `daily_leaderboard_snapshots` - Used for historical data, could be optimized

## 🔧 **SPECIFIC CLEANUP TASKS**

### Phase 1: Remove `user_stats` Redundancy
```typescript
// REMOVE from /api/guess.ts:
// - updateUserStats() function (lines 96-201)
// - user_stats upserts and updates

// UPDATE /api/theme-stats.ts:
// - Query theme_attempts directly instead of checking user_stats

// UPDATE /api/streak-status.ts:
// - Query player_streaks instead of user_stats
```

### Phase 2: Deprecate `scores` Table
```typescript
// REMOVE from /api/guess.ts:
// - Score insertion (line 234)

// UPDATE debug endpoints:
// - Calculate scores from game_sessions data
// - Add deprecation warnings
```

### Phase 3: Optimize Queries
```sql
-- Replace user_stats reads with:
SELECT current_streak, highest_streak 
FROM player_streaks 
WHERE player_id = ?

-- Replace scores reads with:
SELECT 
  player_id,
  word_id,
  EXTRACT(EPOCH FROM (end_time - start_time)) as completion_time_seconds,
  array_length(guesses, 1) as guesses_used
FROM game_sessions 
WHERE is_complete = true AND is_won = true
```

## 📈 **EXPECTED BENEFITS**
- **Performance**: Fewer database writes per game completion
- **Clarity**: Remove confusing empty tables from data flow
- **Maintenance**: Simpler schema with clear data sources
- **Consistency**: Single source of truth for each data type

## ⚠️ **CONSTRAINTS**
- Cannot remove `user_stats` table due to FK constraints
- Must maintain backward compatibility during transition
- Keep debug endpoints functional during cleanup

## 🚀 **DEPLOYMENT STRATEGY**
1. **Phase 1**: Deploy streak fix migration first
2. **Phase 2**: Remove redundant writes (low risk)
3. **Phase 3**: Update read endpoints (test thoroughly)
4. **Phase 4**: Add deprecation warnings
5. **Phase 5**: Consider schema migration to remove FK dependency

## ✅ **SUCCESS METRICS**
- Reduced database writes per game completion
- Faster leaderboard API responses
- Cleaner codebase with fewer redundant operations
- Maintained functionality across all leaderboard features 