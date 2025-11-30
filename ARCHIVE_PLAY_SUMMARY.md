# Archive Play - Executive Summary
**Date:** January 2025  
**Status:** ✅ Planning Complete, Ready for Decision & Implementation

---

## ✅ **COMPLETED WORK**

### **1. Phase 1.5: Theme Matching Enhancement** 
**Implemented & Deployed**

Changed semantic similarity prompts to use implicit connection framing:
- **Before:** "Synonym or description: evolution" vs "Theme or its synonyms: words changing"
- **After:** "What connects this week's words? evolution" vs "What connects this week's words? words changing"

**Impact:** Both inputs now framed identically as answers to the same question, improving AI's ability to recognize synonyms and paraphrases.

**Expected Improvement:** +10-15% on valid synonyms like "evolution" → "words changing meaning over time"

---

### **2. Comprehensive Archive Play Analysis**
**Complete Schema Audit**

Analyzed all relevant tables and systems:
- ✅ `game_sessions` - Needs `is_archive_play`, `game_date`, `played_on` columns
- ✅ `leaderboard_summary` - Needs trigger modification to exclude archive
- ✅ `player_streaks` - No changes needed (relies on leaderboard exclusion)
- ✅ `theme_attempts` - Needs `is_archive_attempt` column + constraint update

**Key Finding:** Current schema CAN support archive play with targeted modifications. No major refactoring needed.

---

## 🎯 **ARCHIVE PLAY FEATURE OVERVIEW**

### **What It Is:**
- Players can select and play words from ANY previous date
- Archive plays tracked separately from live daily stats
- No impact on streaks, leaderboards, or rankings
- Theme guessing supported for archive weeks
- Clear UI distinction between "live" and "archive" modes

### **Why It's Clean:**
Archive plays are **completely separate** from live stats:
- ❌ Archive wins don't affect streaks (streak = consecutive LIVE daily wins)
- ❌ Archive plays don't appear on live leaderboards
- ❌ Archive theme guesses don't count for weekly theme stats
- ✅ Archive completions tracked in separate `archive_play_stats` table
- ✅ Archive achievements/progress shown in dedicated UI

---

## 🏗️ **PROPOSED ARCHITECTURE**

### **Database Changes:**
```sql
-- 1. Extend game_sessions for archive tracking
ALTER TABLE game_sessions ADD COLUMN is_archive_play BOOLEAN DEFAULT FALSE;
ALTER TABLE game_sessions ADD COLUMN game_date DATE;
ALTER TABLE game_sessions ADD COLUMN played_on DATE DEFAULT CURRENT_DATE;

-- 2. New table for archive stats
CREATE TABLE archive_play_stats (
  id UUID PRIMARY KEY,
  player_id TEXT REFERENCES players(id),
  word_id UUID REFERENCES words(id),
  game_session_id UUID REFERENCES game_sessions(id),
  word_date DATE NOT NULL,
  played_on TIMESTAMPTZ DEFAULT NOW(),
  is_won BOOLEAN,
  guesses_used INTEGER,
  time_taken INTEGER,
  UNIQUE(player_id, word_id)
);

-- 3. Update theme_attempts for archive theme guesses
ALTER TABLE theme_attempts ADD COLUMN is_archive_attempt BOOLEAN DEFAULT FALSE;
```

### **Trigger Modification:**
```sql
-- Modified: update_leaderboard_from_game()
-- Add at start of function:
IF NEW.is_archive_play = TRUE THEN
  -- Log to archive_play_stats instead
  -- Exit early, don't update leaderboard
  RETURN NEW;
END IF;
-- ... rest of existing leaderboard logic
```

**Result:** Archive plays automatically excluded from streaks/leaderboards.

---

## 📊 **STAT SEPARATION**

| Stat Type | Live (Daily) | Archive (Past) |
|-----------|--------------|----------------|
| **Streak** | ✅ Counts (consecutive daily wins) | ❌ No impact |
| **Leaderboard** | ✅ Ranked | ❌ Not included |
| **Theme Progress** | ✅ Counts for current week | ❌ Separate tracking |
| **Achievements** | ✅ Standard achievements | ✅ Archive-specific achievements |
| **Win Stats** | ✅ Daily win rate | ✅ Archive win rate (separate) |

---

## 🚀 **IMPLEMENTATION PHASES**

### **Phase 1: MVP (12-16 hours)**
**Core Functionality**
- Database schema modifications
- Backend API changes (`GET /api/word?date=X&archive=true`)
- Basic archive calendar UI
- Archive play flow (without themes)
- Stat separation working

**Deliverables:**
- Players can browse and play past dates
- Archive wins tracked separately
- Live stats remain pristine

---

### **Phase 2: Theme Support (6-8 hours)**
**Enhanced Features**
- Archive theme guessing
- Past theme progress tracking
- Archive theme stats display

**Deliverables:**
- Full theme functionality for archive play

---

### **Phase 3: Gamification (10-12 hours)**
**Future Enhancements**
- Archive leaderboards (all-time, speed runs)
- Archive achievements ("Time Traveler", "Completionist")
- Advanced filters (difficulty, theme, completion status)
- "Random archive word" feature
- Full archive stats dashboard

---

## ⚠️ **CRITICAL DECISIONS NEEDED**

Before implementation, you need to decide:

### **Decision 1: Can players replay words?**
- **Option A:** Allow unlimited replays (only first counts for stats) ⭐ **RECOMMENDED**
- **Option B:** One play per word ever (simpler but less flexible)

**Recommendation:** Option A - Let players practice

---

### **Decision 2: Archive leaderboards?**
- **Option A:** No archive leaderboards (simpler, "for fun" only)
- **Option B:** Separate archive leaderboards (more engaging) ⭐ **RECOMMENDED** (Phase 3)

**Recommendation:** Option B as Phase 3 enhancement

---

### **Decision 3: Incomplete live games?**
**Scenario:** Player starts today's word, doesn't finish, comes back tomorrow.

- **Option A:** Auto-complete as loss after 24 hours ⭐ **RECOMMENDED**
- **Option B:** Incomplete games become "archive" next day
- **Option C:** Incomplete games persist indefinitely

**Recommendation:** Option A - Preserves streak integrity

---

## 💡 **KEY INSIGHTS FROM ANALYSIS**

### **1. Schema Is Archive-Ready**
Current database design supports archive play with minimal changes:
- No need to refactor existing tables
- Triggers easily modified with early-exit pattern
- Stats separation achieved through single boolean flag

### **2. Stat Integrity Preserved**
Archive plays automatically excluded from live stats because:
- Leaderboard trigger checks `is_archive_play` flag
- Streaks depend on leaderboard entries only
- Theme attempts have separate constraint for archive

### **3. No Breaking Changes**
All modifications are additive:
- New columns with defaults (existing data unaffected)
- New table (no migrations on existing tables)
- Modified triggers (backward compatible)

### **4. Clean UX Separation**
Archive mode has clear visual distinction:
- Different colors/headers
- Explicit messaging ("This won't affect your streak")
- Separate stats dashboards
- Navigation clarity (Live vs Archive)

---

## 📁 **DOCUMENTATION CREATED**

### **1. `docs/ARCHIVE_PLAY_IMPLEMENTATION_PLAN.md`** (Most Important)
**Complete technical specification:**
- Detailed schema changes (SQL included)
- API modifications (TypeScript code examples)
- Frontend components (React examples)
- Testing checklist
- Rollout plan
- Success metrics

**Use this as the implementation guide.**

---

### **2. `docs/PHASE_2_ENHANCEMENTS_DETAILED.md`**
**Synonym matching improvements:**
- Your "implicit connection" insight documented
- Synonym expansion layer (Datamuse API)
- Multi-model ensemble approach
- Hybrid approach combining all strategies
- Feedback loop & learning system

**Use this for future theme matching improvements.**

---

### **3. `PHASE_1_IMPLEMENTATION_SUMMARY.md`**
**Phase 1 & 1.5 changes:**
- Enhanced prompts documentation
- Lower threshold rationale
- Test cases and validation
- Success criteria

---

## 🎯 **RECOMMENDED NEXT STEPS**

### **1. Make Decisions** (30 minutes)
Review critical decisions and choose:
- Replay policy (Option A or B?)
- Archive leaderboards (Phase 3 or not?)
- Incomplete game handling (Option A, B, or C?)

### **2. Review Plan** (1 hour)
Read `docs/ARCHIVE_PLAY_IMPLEMENTATION_PLAN.md`:
- Understand schema changes
- Review API modifications
- Confirm UI approach

### **3. Create First Migration** (1 hour)
Write `20250130000001_add_archive_play_support.sql`:
- Add columns to `game_sessions`
- Create `archive_play_stats` table
- Modify `theme_attempts`
- Update triggers

### **4. Implement Phase 1 MVP** (12-16 hours)
Follow implementation plan step-by-step:
- Backend first (API endpoints)
- Frontend second (calendar UI)
- Integration testing

### **5. Deploy to Preview** (2 hours)
- Merge theme-improvements branch
- Deploy to staging/preview
- Validate with real data

---

## 📞 **QUESTIONS TO CONSIDER**

### **Product Questions:**
1. Should archive play be immediately available, or unlock after X live plays?
2. Should there be a limit on archive plays per day? (e.g., 3 free, unlimited with premium?)
3. Should archive wins give any XP/points/rewards?
4. Should archive mode be prominently featured or "hidden" feature?

### **Technical Questions:**
1. How far back should archive go? (All time? Last 6 months? Last year?)
2. Should archive words be pre-loaded for performance?
3. Should we add archive play analytics/tracking?
4. What's the rollback strategy if issues arise?

---

## ✅ **READY TO PROCEED**

All planning complete. You have:
- ✅ Complete schema analysis
- ✅ Detailed implementation plan
- ✅ SQL migrations outlined
- ✅ API changes documented
- ✅ Frontend components designed
- ✅ Testing strategy defined
- ✅ Critical decisions identified

**Estimated MVP Time:** 12-16 hours of development + 2 hours testing/deployment

**Next Action:** Make critical decisions, then begin Phase 1 implementation.

---

**Status:** 📋 Ready for Implementation  
**Documentation:** `docs/ARCHIVE_PLAY_IMPLEMENTATION_PLAN.md`  
**Branch:** `theme-improvements`

