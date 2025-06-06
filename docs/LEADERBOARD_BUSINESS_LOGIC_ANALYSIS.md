# Leaderboard Business Logic Analysis
**Date**: December 2024  
**Status**: 🚨 CRITICAL QUESTIONS NEED ANSWERS  
**Purpose**: Define expected behavior vs current implementation

---

## 🚨 CRITICAL BUSINESS LOGIC QUESTIONS

### **1. `was_top_10` Field Logic**

**Current Implementation** (from trigger analysis):
```sql
-- In update_leaderboard_rankings() function
UPDATE leaderboard_summary 
SET was_top_10 = (rank <= 10)
WHERE word_id = target_word_id;
```

**Current Behavior**: 
- ✅ Updates in **real-time** whenever rankings change
- ⚠️ If Player A is #8 at 10am, then drops to #12 at 2pm → `was_top_10` becomes `false`
- ⚠️ If Player B gets #9 at 11pm → `was_top_10` becomes `true`

**Questions for Clarification**:
1. **What should `was_top_10` represent?**
   - **Option A**: "Was in top 10 when daily word closed" (end-of-day snapshot)
   - **Option B**: "Is currently in top 10" (real-time status)  
   - **Option C**: "Was ever in top 10 during that day" (once true, stays true)

2. **Business Impact**: This affects player achievements, streaks, and historical records

---

### **2. Daily Word Lifecycle**

**Current Understanding**:
- Each word has a `date` field
- Players can potentially play any word at any time
- Leaderboards update in real-time regardless of word date

**Questions for Clarification**:
1. **When does a daily word "close"?**
   - At midnight local time?
   - At midnight UTC?
   - When the next day's word is published?
   - Never (always open)?

2. **Can players affect past leaderboards?**
   - If someone plays yesterday's word today, should it update yesterday's leaderboard?
   - Or should past leaderboards be "frozen"?

3. **Ranking calculation timing**:
   - Should rankings update immediately after each game?
   - Or only at end-of-day?

---

### **3. Leaderboard Persistence Strategy**

**Current Implementation**:
- Single `leaderboard_summary` table
- Rankings recalculated dynamically
- No historical snapshots

**Questions for Clarification**:
1. **Should daily leaderboards be immutable after word closes?**
   - Yes → Need daily snapshot system
   - No → Continue with real-time updates

2. **Historical integrity**:
   - Should we preserve what the leaderboard looked like "at the time"?
   - Or is current state sufficient?

---

## 📊 CURRENT TRIGGER BEHAVIOR ANALYSIS

### **Game Completion Flow**:
```
1. Player completes game
   ↓
2. update_leaderboard_from_game() trigger fires
   ↓  
3. Inserts/updates entry in leaderboard_summary
   ↓
4. update_leaderboard_rankings() trigger fires  
   ↓
5. Recalculates ALL rankings for that word
   ↓
6. Updates rank and was_top_10 for ALL players
```

### **Issues with Current Flow**:
- ⚠️ **Real-time was_top_10**: Changes throughout the day
- ⚠️ **No end-of-day freezing**: Past leaderboards can change
- ⚠️ **Performance**: Recalculates all rankings on every completion
- ⚠️ **No historical preservation**: Can't see "what leaderboard looked like at 3pm"

---

## 🎯 PROPOSED SOLUTIONS (PENDING CLARIFICATION)

### **Option A: End-of-Day Snapshot System**
```sql
-- New table for daily snapshots
CREATE TABLE daily_leaderboard_snapshots (
  id UUID PRIMARY KEY,
  word_id UUID,
  date DATE,
  final_rankings JSONB, -- Complete leaderboard at day end
  is_finalized BOOLEAN,
  finalized_at TIMESTAMPTZ
);
```

**Behavior**:
- Real-time leaderboard in `leaderboard_summary` (current rankings)
- Daily snapshot created at word close with final `was_top_10` values
- Historical queries use snapshots, current queries use live table

### **Option B: Immutable Historical Records**
```sql
-- Enhanced leaderboard_summary with versioning
ALTER TABLE leaderboard_summary ADD COLUMN version INTEGER;
ALTER TABLE leaderboard_summary ADD COLUMN is_final BOOLEAN;
```

**Behavior**:
- Multiple records per player/word (versioned)
- Final version marked as `is_final = true` at day end
- `was_top_10` only set on final version

### **Option C: Real-time Only (Current)**
**Behavior**:
- Continue with current system
- `was_top_10` always reflects current status
- No historical preservation

---

## ❓ QUESTIONS REQUIRING IMMEDIATE ANSWERS

**Before proceeding with trigger enhancements, we need clarity on**:

1. **What should `was_top_10` represent?** (end-of-day vs real-time vs ever-achieved)

2. **When do daily words close?** (midnight UTC? never?)

3. **Should past leaderboards be immutable?** (yes = snapshots needed)

4. **Can players affect past rankings?** (playing old words)

5. **What's the user expectation?** When a player sees "was top 10" what should it mean?

---

## 🔄 IMPACT ON CURRENT IMPLEMENTATION

**Depending on answers above, we may need to**:
- ✅ **Minimal changes**: If real-time behavior is correct
- ⚠️ **Moderate changes**: If we need end-of-day freezing
- 🚨 **Major changes**: If we need historical snapshots and immutable records

**This affects**:
- Trigger logic enhancement (next step)
- User stats calculations  
- Streak logic
- Achievement systems
- API responses 