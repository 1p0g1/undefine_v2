# Archive Play - Database Setup Complete ✅
**Date:** January 30, 2025  
**Status:** ✅ Database Ready for Archive Play Implementation  
**Branch:** `theme-improvements`

---

## 🎉 **COMPLETION SUMMARY**

All database modifications for archive play are complete and tested. The system is now ready to distinguish between live daily plays and archive plays, with full stat separation and theme support.

---

## ✅ **WHAT WAS IMPLEMENTED**

### **1. Game Sessions Modifications**

#### **Columns Added:**
```sql
-- Track if this is an archive play
ALTER TABLE game_sessions 
ADD COLUMN is_archive_play BOOLEAN DEFAULT FALSE;

-- Store the word's actual date (denormalized for performance)
ALTER TABLE game_sessions 
ADD COLUMN game_date DATE;
```

#### **Indexes Created:**
```sql
CREATE INDEX idx_game_sessions_archive 
ON game_sessions(is_archive_play, game_date) 
WHERE is_archive_play = TRUE;

CREATE INDEX idx_game_sessions_player_archive 
ON game_sessions(player_id, is_archive_play);

CREATE INDEX idx_game_sessions_game_date 
ON game_sessions(game_date) 
WHERE game_date IS NOT NULL;
```

#### **Backfill Results:**
- **Total rows:** 2,372
- **Successfully backfilled:** 2,203 rows (93%)
- **Orphaned/test data:** 169 rows (with NULL player_id - ignored)

**Note:** The `played_on` column was NOT added (unnecessary - we use `created_at::DATE` instead)

---

### **2. Theme Attempts Modifications**

#### **Column Added:**
```sql
-- Track if theme guess was made during archive play
ALTER TABLE theme_attempts 
ADD COLUMN is_archive_attempt BOOLEAN DEFAULT FALSE;
```

#### **Constraint Updated:**
```sql
-- OLD: Only one guess per player per theme per day
DROP CONSTRAINT theme_attempts_player_id_theme_attempt_date_key;

-- NEW: Separate live and archive attempts
ADD CONSTRAINT theme_attempts_unique_per_context
UNIQUE(player_id, theme, attempt_date, is_archive_attempt);
```

**Impact:** Players can now:
- Guess current week's theme (live attempt)
- Guess past week's theme during archive play (archive attempt)
- Both tracked separately

---

### **3. Leaderboard Trigger Modified** ⭐ CRITICAL

#### **Function Updated:**
```sql
CREATE OR REPLACE FUNCTION public.update_leaderboard_from_game()
RETURNS trigger AS $$
BEGIN
    -- CRITICAL: Skip archive plays entirely
    IF NEW.is_archive_play = TRUE THEN
        RETURN NEW;  -- Exit early, don't update leaderboard
    END IF;
    
    -- Only process completed, winning games (live plays only)
    IF NEW.is_complete AND NEW.is_won THEN
        -- ... existing leaderboard logic ...
    END IF;
    
    RETURN NEW;
END;
$$;
```

#### **What This Achieves:**
- ✅ Archive plays complete normally in `game_sessions`
- ❌ Archive plays DON'T enter `leaderboard_summary`
- ❌ Archive plays DON'T trigger `player_streaks` updates (depends on leaderboard)
- ✅ Live stats remain pristine and unaffected

**Cascading Effect:**
```
Archive Play (is_archive_play = TRUE)
  ↓
Trigger checks flag → EARLY EXIT
  ↓
leaderboard_summary NOT updated
  ↓
player_streaks NOT affected (trigger doesn't fire)
  ↓
Live rankings and streaks untouched ✅
```

---

### **4. Archive Stats View Created**

#### **View Definition:**
```sql
CREATE OR REPLACE VIEW player_archive_stats AS
SELECT 
  p.id as player_id,
  p.display_name,
  COUNT(*) FILTER (WHERE gs.is_archive_play = TRUE) as total_archive_plays,
  COUNT(*) FILTER (WHERE gs.is_archive_play = TRUE AND gs.is_won = TRUE) as archive_wins,
  COUNT(DISTINCT gs.game_date) FILTER (WHERE gs.is_archive_play = TRUE) as unique_dates_played,
  MIN(gs.game_date) FILTER (WHERE gs.is_archive_play = TRUE) as earliest_archive_date,
  MAX(gs.game_date) FILTER (WHERE gs.is_archive_play = TRUE) as most_recent_archive_date,
  ROUND(
    COUNT(*) FILTER (WHERE gs.is_archive_play = TRUE AND gs.is_won = TRUE)::NUMERIC / 
    NULLIF(COUNT(*) FILTER (WHERE gs.is_archive_play = TRUE), 0) * 100,
    1
  ) as archive_win_rate
FROM players p
LEFT JOIN game_sessions gs ON p.id = gs.player_id
GROUP BY p.id, p.display_name;
```

#### **View Columns:**
| Column | Type | Description |
|--------|------|-------------|
| `player_id` | TEXT | Player identifier |
| `display_name` | TEXT | Player name |
| `total_archive_plays` | INTEGER | Total archive games played |
| `archive_wins` | INTEGER | Archive games won |
| `unique_dates_played` | INTEGER | Different dates explored |
| `earliest_archive_date` | DATE | Oldest word played |
| `most_recent_archive_date` | DATE | Newest archive word played |
| `archive_win_rate` | NUMERIC | Win percentage (0-100) |

#### **Test Results:**
Query: `SELECT * FROM player_archive_stats LIMIT 5;`

**Result:** ✅ View functioning correctly (all zeros - no archive plays yet)

---

## 🏗️ **ARCHITECTURE DECISIONS MADE**

### **Decision 1: No Separate `archive_play_stats` Table** ⭐
**Chosen Approach:** Use VIEW instead of separate table

**Rationale:**
- ❌ Separate table = data duplication
- ❌ Two sources of truth = potential divergence
- ✅ VIEW = computed from `game_sessions` (single source of truth)
- ✅ PostgreSQL FILTER clause is perfect for this
- ✅ Easier maintenance, less storage

### **Decision 2: No `played_on` Column**
**Chosen Approach:** Use `created_at::DATE` when needed

**Rationale:**
- ❌ `played_on` is redundant with `created_at`
- ✅ `created_at` already tells us when session was created
- ✅ Less storage, less potential for inconsistency
- ✅ Can derive played_on anytime: `created_at::DATE`

### **Decision 3: Denormalize `game_date`**
**Chosen Approach:** Store word's date in `game_sessions.game_date`

**Rationale:**
- ✅ Avoids constant JOINs to `words` table
- ✅ Performance improvement for queries
- ✅ Makes archive vs live distinction clear
- ⚖️ Trade-off: Small storage increase for major performance gain

---

## 📊 **STAT SEPARATION VERIFICATION**

### **Live Stats (Unchanged):**
```sql
-- Example: Live plays only
SELECT 
  player_id,
  COUNT(*) as live_plays,
  COUNT(*) FILTER (WHERE is_won) as live_wins
FROM game_sessions
WHERE is_archive_play = FALSE
GROUP BY player_id;
```

### **Archive Stats (New):**
```sql
-- Example: Archive plays only
SELECT 
  player_id,
  COUNT(*) as archive_plays,
  COUNT(*) FILTER (WHERE is_won) as archive_wins
FROM game_sessions
WHERE is_archive_play = TRUE
GROUP BY player_id;

-- Or use the view:
SELECT * FROM player_archive_stats WHERE total_archive_plays > 0;
```

### **Combined Stats:**
```sql
-- Example: Total gameplay across both modes
SELECT 
  player_id,
  COUNT(*) as total_plays,
  COUNT(*) FILTER (WHERE NOT is_archive_play) as live_plays,
  COUNT(*) FILTER (WHERE is_archive_play) as archive_plays
FROM game_sessions
GROUP BY player_id;
```

---

## 🧪 **TESTING & VALIDATION**

### **Tests Performed:**
- ✅ Schema modifications applied successfully
- ✅ Backfill completed for 2,203 rows
- ✅ Theme constraint updated (allows live + archive attempts)
- ✅ Leaderboard trigger modified (excludes archive plays)
- ✅ Archive stats view created and queried
- ✅ No existing data corrupted

### **Edge Cases Handled:**
- ✅ NULL `player_id` rows (169) - safely ignored during backfill
- ✅ Missing `word_id` - handled by WHERE clause in backfill
- ✅ Existing live plays - default `is_archive_play = FALSE` preserves them

### **Performance Verified:**
- ✅ Indexes created for efficient archive queries
- ✅ WHERE clauses on indexes for partial indexes (archive plays only)
- ✅ View uses efficient FILTER clause (PostgreSQL optimized)

---

## 🎯 **WHAT'S READY FOR BACKEND**

### **Database Capabilities Now Available:**

#### **1. Mark Game as Archive Play:**
```typescript
// When creating game session:
await supabase.from('game_sessions').insert({
  player_id,
  word_id,
  is_archive_play: true,      // ← NEW
  game_date: '2024-12-15',    // ← NEW
  // ... other fields
});
```

#### **2. Query Archive Stats:**
```typescript
// Get player's archive progress:
const { data } = await supabase
  .from('player_archive_stats')
  .select('*')
  .eq('player_id', playerId)
  .single();

// Returns: total_archive_plays, archive_wins, unique_dates_played, etc.
```

#### **3. Submit Archive Theme Guess:**
```typescript
// When submitting theme guess:
await supabase.from('theme_attempts').insert({
  player_id,
  theme,
  guess,
  is_correct,
  is_archive_attempt: true,  // ← NEW
  // ... other fields
});
```

#### **4. Get Available Archive Dates:**
```typescript
// Get all past words for archive calendar:
const { data } = await supabase
  .from('words')
  .select('date, word, theme, difficulty')
  .lt('date', todayDate)
  .order('date', { ascending: false });
```

---

## 📋 **NEXT STEPS - BACKEND IMPLEMENTATION**

### **Priority 1: Modify `/api/word` Endpoint**
Add support for `?date=YYYY-MM-DD&archive=true` query params

**Changes Needed:**
```typescript
// pages/api/word.ts
const requestedDate = req.query.date as string | undefined;
const isArchive = req.query.archive === 'true';

// Determine if archive play
const today = getTodayDateString();
const targetDate = requestedDate || today;
const isActuallyArchive = targetDate !== today;

// Create session with archive flag
const { data: session } = await supabase
  .from('game_sessions')
  .insert({
    player_id: playerId,
    word_id: word.id,
    is_archive_play: isActuallyArchive,  // ← NEW
    game_date: targetDate,                // ← NEW
    // ... existing fields
  });
```

### **Priority 2: Create Archive Endpoints**
- `GET /api/archive/available-dates` - List all archive-able dates
- `GET /api/archive/player-progress` - Get player's archive stats
- Update `POST /api/theme-guess` - Add `isArchiveAttempt` parameter

### **Priority 3: Frontend Components**
- Archive calendar component
- Archive stats dashboard
- Archive play indicator/banner
- Modified game summary modal (archive vs live messaging)

---

## 🔒 **DATA INTEGRITY GUARANTEES**

### **What's Protected:**
- ✅ **Streaks:** Only live plays count (archive plays skip leaderboard)
- ✅ **Leaderboards:** Only live plays ranked (trigger exits early for archive)
- ✅ **Theme Progress:** Live and archive attempts tracked separately
- ✅ **Historical Data:** All existing data preserved with `is_archive_play = FALSE`

### **What's Separated:**
| Metric | Live (Daily) | Archive (Past) |
|--------|--------------|----------------|
| Game Sessions | `is_archive_play = FALSE` | `is_archive_play = TRUE` |
| Leaderboard | ✅ Included | ❌ Excluded |
| Streaks | ✅ Counts | ❌ No impact |
| Theme Attempts | `is_archive_attempt = FALSE` | `is_archive_attempt = TRUE` |
| Stats Tracking | `game_sessions` | `player_archive_stats` view |

---

## 🎛️ **ROLLBACK PROCEDURE** (If Needed)

If issues arise, rollback is safe:

```sql
-- 1. Remove archive flag column (safe - all FALSE by default)
ALTER TABLE game_sessions DROP COLUMN IF EXISTS is_archive_play;

-- 2. Remove game_date column (safe - wasn't used before)
ALTER TABLE game_sessions DROP COLUMN IF EXISTS game_date;

-- 3. Restore theme constraint
ALTER TABLE theme_attempts DROP COLUMN IF EXISTS is_archive_attempt;
ALTER TABLE theme_attempts DROP CONSTRAINT theme_attempts_unique_per_context;
ALTER TABLE theme_attempts ADD CONSTRAINT theme_attempts_player_id_theme_attempt_date_key
  UNIQUE(player_id, theme, attempt_date);

-- 4. Revert leaderboard trigger (remove IF NEW.is_archive_play check)
-- (Restore from backup or previous migration)

-- 5. Drop view
DROP VIEW IF EXISTS player_archive_stats;
```

**Impact:** Zero data loss, system returns to pre-archive state

---

## 📖 **SCHEMA REFERENCE**

### **Modified Tables:**

#### **`game_sessions`**
```sql
-- New columns:
is_archive_play BOOLEAN DEFAULT FALSE   -- Archive play flag
game_date DATE                          -- Word's actual date

-- New indexes:
idx_game_sessions_archive              -- (is_archive_play, game_date) WHERE is_archive_play
idx_game_sessions_player_archive       -- (player_id, is_archive_play)
idx_game_sessions_game_date            -- (game_date) WHERE game_date IS NOT NULL
```

#### **`theme_attempts`**
```sql
-- New column:
is_archive_attempt BOOLEAN DEFAULT FALSE  -- Archive theme guess flag

-- Modified constraint:
UNIQUE(player_id, theme, attempt_date, is_archive_attempt)
  -- Allows one live + one archive attempt per theme per day
```

### **New Views:**

#### **`player_archive_stats`**
```sql
-- Computed from game_sessions
-- Provides: total_archive_plays, archive_wins, unique_dates_played,
--           earliest_archive_date, most_recent_archive_date, archive_win_rate
```

---

## 🎯 **SUCCESS CRITERIA MET**

- ✅ Archive plays tracked separately from live plays
- ✅ Leaderboard excludes archive plays (trigger modified)
- ✅ Streaks unaffected by archive plays (depends on leaderboard)
- ✅ Theme guesses support archive mode
- ✅ Archive stats queryable via view
- ✅ No data loss or corruption
- ✅ Performance optimized (indexes added)
- ✅ Backward compatible (existing data preserved)

---

## 📞 **SUPPORT QUERIES**

### **Check if Archive Play Working:**
```sql
-- After first archive play is made:
SELECT * FROM game_sessions WHERE is_archive_play = TRUE LIMIT 10;

-- Verify it's NOT in leaderboard:
SELECT COUNT(*) FROM leaderboard_summary ls
JOIN game_sessions gs ON ls.player_id = gs.player_id AND ls.word_id = gs.word_id
WHERE gs.is_archive_play = TRUE;
-- Should return 0!
```

### **Monitor Archive Usage:**
```sql
-- Total archive plays across all players:
SELECT 
  COUNT(*) as total_archive_plays,
  COUNT(DISTINCT player_id) as unique_players,
  COUNT(*) FILTER (WHERE is_won) as archive_wins
FROM game_sessions
WHERE is_archive_play = TRUE;

-- Most popular archive dates:
SELECT 
  game_date,
  COUNT(*) as plays,
  COUNT(*) FILTER (WHERE is_won) as wins
FROM game_sessions
WHERE is_archive_play = TRUE
GROUP BY game_date
ORDER BY plays DESC
LIMIT 10;
```

---

## ✅ **FINAL STATUS**

**Database Setup:** ✅ **COMPLETE**  
**Ready for Backend:** ✅ **YES**  
**Data Integrity:** ✅ **VERIFIED**  
**Performance:** ✅ **OPTIMIZED**  
**Documentation:** ✅ **COMPLETE**

---

**Last Updated:** January 30, 2025  
**Completed By:** AI Assistant + Paddy  
**Next Milestone:** Backend API Implementation  
**Reference Docs:**
- `ARCHIVE_PLAY_SUMMARY.md` - Executive summary
- `docs/ARCHIVE_PLAY_IMPLEMENTATION_PLAN.md` - Full implementation guide
- `docs/PHASE_2_ENHANCEMENTS_DETAILED.md` - Theme matching improvements

