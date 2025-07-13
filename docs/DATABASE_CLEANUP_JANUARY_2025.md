# Database Cleanup & Critical Fixes - January 13, 2025

## 🚨 **CRITICAL PRODUCTION FIXES COMPLETED**

### **Summary**
Major database cleanup session to remove unused tables, fix broken foreign keys, and resolve production errors caused by dropped tables still being referenced in code and triggers.

---

## 🗑️ **TABLE REMOVAL: `user_stats`**

### **Why Removed**
- **Completely empty** - all values were 0/NULL/empty
- **Redundant** - data now stored in `game_sessions` and `player_streaks` 
- **Maintenance burden** - required constant FK maintenance with no benefit

### **Step-by-Step Removal Process**

#### **1. Foreign Key Constraint Updates**
```sql
-- Removed old FK constraints pointing to user_stats
ALTER TABLE leaderboard_summary DROP CONSTRAINT IF EXISTS fk_leaderboard_player;
ALTER TABLE theme_attempts DROP CONSTRAINT IF EXISTS theme_attempts_player_id_fkey;
ALTER TABLE leaderboard_summary DROP CONSTRAINT IF EXISTS leaderboard_summary_player_id_fkey;
ALTER TABLE scores DROP CONSTRAINT IF EXISTS fk_scores_player;

-- Added new FK constraints pointing to players table
ALTER TABLE leaderboard_summary ADD CONSTRAINT leaderboard_summary_player_id_to_players FOREIGN KEY (player_id) REFERENCES players(id);
ALTER TABLE theme_attempts ADD CONSTRAINT theme_attempts_player_id_to_players FOREIGN KEY (player_id) REFERENCES players(id);
ALTER TABLE scores ADD CONSTRAINT scores_player_id_to_players FOREIGN KEY (player_id) REFERENCES players(id);
```

#### **2. Table Deletion**
```sql
-- Successfully dropped after removing all dependencies
DROP TABLE user_stats;
```

---

## 🔧 **CODE FIXES: Remove `user_stats` References**

### **Files Updated**
- `pages/api/guess.ts` - Removed ensureUserStatsForFK function and upsert calls
- `pages/api/theme-stats.ts` - Removed user_stats query, calculate from game_sessions
- `pages/api/admin/populate-leaderboard.ts` - Removed user_stats upsert  
- `pages/api/debug-player.ts` - Removed user_stats query
- `pages/api/debug-missing-players.ts` - Removed user_stats analysis
- `supabase/types.ts` - Removed user_stats table definition and updated FK references

### **Git Commits**
```bash
# Multiple commits deployed these fixes:
- "URGENT FIX: Remove user_stats references from guess API"
- "Fix remaining user_stats references in API endpoints"
- "URGENT: Fix debug API still querying dropped user_stats table"
- "URGENT: Fix TypeScript types - remove user_stats table"
```

---

## 🔥 **DATABASE TRIGGER FIX: `update_leaderboard_from_game`**

### **The Problem**
The database trigger was still trying to INSERT into the dropped `user_stats` table, causing **`"relation user_stats does not exist"`** errors on every game completion.

### **Trigger Fix Process**
```sql
-- Step 1: Drop the trigger first
DROP TRIGGER IF EXISTS update_leaderboard_on_game_complete ON game_sessions;

-- Step 2: Drop the function
DROP FUNCTION IF EXISTS update_leaderboard_from_game();

-- Step 3: Create new function WITHOUT user_stats reference
CREATE OR REPLACE FUNCTION update_leaderboard_from_game()
RETURNS trigger AS $BODY$
BEGIN
    -- Only process completed, winning games
    IF NEW.is_complete AND NEW.is_won THEN
        -- Insert or update leaderboard entry (NO user_stats reference)
        INSERT INTO leaderboard_summary (
            player_id, word_id, rank, was_top_10, best_time, guesses_used, date
        ) VALUES (
            NEW.player_id, NEW.word_id, 1, true,
            EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))::INTEGER,
            array_length(NEW.guesses, 1), CURRENT_DATE
        )
        ON CONFLICT (player_id, word_id) 
        DO UPDATE SET
            best_time = LEAST(leaderboard_summary.best_time, EXCLUDED.best_time),
            guesses_used = CASE 
                WHEN leaderboard_summary.best_time > EXCLUDED.best_time 
                THEN EXCLUDED.guesses_used 
                ELSE leaderboard_summary.guesses_used 
            END,
            date = CURRENT_DATE;
    END IF;
    RETURN NEW;
END;
$BODY$ LANGUAGE plpgsql;

-- Step 4: Recreate the trigger
CREATE TRIGGER update_leaderboard_on_game_complete
    AFTER UPDATE ON game_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_leaderboard_from_game();
```

---

## 📊 **ALL-TIME LEADERBOARD SIMPLIFICATION**

### **What Changed**
- **Reduced from 5 tabs to 4 tabs**
- **Removed**: "🏆 Top 10" tab entirely
- **Updated labels**: "Consistency" → "Average Guesses", "Activity" → "Total Games"

### **New Tab Structure**
1. **🥇 Win Rate** - Highest win percentage
2. **🎯 Average Guesses** - Fewest average guesses  
3. **🔥 Highest Streak** - Longest win streaks
4. **📊 Total Games** - Most games played

### **Files Updated**
- `client/src/components/AllTimeLeaderboard.tsx` - UI simplified
- `pages/api/leaderboard/all-time.ts` - Removed Top 10 calculations

---

## 📋 **DOCUMENTATION SYSTEM REFRESH**

### **Updated Documentation Hierarchy**
- **Tier 1**: `CRITICAL_DATABASE_ANALYSIS_JULY_2025.md`, `ACTUAL_DATABASE_SCHEMA.md`
- **Tier 2**: `DOCUMENTATION_STATUS_JANUARY_2025.md`, `ALL_TIME_LEADERBOARD_IMPLEMENTATION.md`
- **Tier 3**: Implementation guides and troubleshooting docs

### **New Documentation Created**
- `DATABASE_SCHEMA_AUDIT_JANUARY_2025.md` - Complete schema analysis
- `DOCUMENTATION_STATUS_JANUARY_2025.md` - Current status tracker
- `DATABASE_CLEANUP_JANUARY_2025.md` - This document

---

## ✅ **FINAL PRODUCTION STATUS**

### **✅ WORKING SYSTEMS**
- **Games** - No more user_stats errors, completing successfully
- **Leaderboards** - Daily and all-time leaderboards functioning  
- **Theme system** - Weekly themed words working
- **All APIs** - No more broken references

### **🗑️ TABLES REMOVED**
- `user_stats` - Successfully dropped (was empty, redundant)

### **🔍 TABLES TO INVESTIGATE NEXT**
- `scores` - Contains only test data, likely redundant with game_sessions
- Potential consolidation of leaderboard tables

### **📈 IMPACT**
- **Database size**: Reduced by removing empty table
- **Performance**: Eliminated unnecessary FK maintenance
- **Reliability**: Fixed critical production errors
- **User experience**: Games work without errors

---

## 🚨 **CRITICAL NOTES FOR FUTURE REFERENCE**

1. **Database triggers** must be checked when dropping tables
2. **All API endpoints** need to be searched for table references
3. **TypeScript types** need updates when schema changes
4. **Foreign key constraints** must be updated in correct order
5. **Production deployment** happens automatically via Git commits

**This cleanup resolved the major production issues and simplified the database schema significantly.**

---

## 🐛 **RANKING DISPLAY BUG FIX - JANUARY 13, 2025**

### **The Problem**
After database cleanup, players reported seeing "You didn't rank today" even after completing games successfully.

### **Root Cause Analysis**
**Not database triggers** (those were working correctly), but **frontend environment and timing issues**:

1. **Vercel Preview Environment Variables**: Frontend using hardcoded fallback URLs instead of correct API endpoints
2. **Timing Issues**: Leaderboard fetched immediately after game completion, sometimes before database triggers completed
3. **Cross-Domain API Calls**: Preview deployments making unnecessary external calls instead of relative URLs

### **Fix Applied**
```typescript
// Before: Hardcoded fallback to external domain
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://undefine-v2-back.vercel.app';

// After: Relative URLs for same-domain deployments  
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Added: 500ms delay for database trigger completion
setTimeout(async () => {
  await fetchLeaderboard();
}, 500);
```

### **Files Updated**
- `client/src/api/client.ts` - Updated BASE_URL fallback and logging
- `client/src/components/AllTimeLeaderboard.tsx` - Consistent relative URL usage
- `client/src/hooks/useGame.ts` - Added delay for database trigger completion

### **Result** 
✅ Rankings now display correctly on both preview and production deployments 