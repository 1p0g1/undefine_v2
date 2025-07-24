# Streak System Rules & Logic

**Last Updated**: January 2025  
**Status**: ✅ Active System  
**Purpose**: Comprehensive documentation of streak calculation, display, and edge case handling

---

## 🎯 **CORE STREAK DEFINITION**

### **What is a Streak?**
A **streak** is a sequence of **consecutive daily wins** with allowable gaps for non-play days.

### **Key Principles**
1. **Daily wins only count** - Playing and winning the daily word
2. **Consecutive dates matter** - Streaks are based on win dates, not play dates
3. **Gap tolerance exists** - Missing days don't break streaks (within limits)
4. **Loss breaks streak** - Playing and losing resets the streak to 0

---

## 📅 **GAP TOLERANCE SYSTEM**

### **Database Logic (7-Day Rule)**
The `player_streaks` table trigger allows **up to 7 days** between wins without breaking the streak.

**Examples:**
- ✅ **Win Monday, skip Tuesday-Wednesday, win Thursday** → Streak continues
- ✅ **Win Monday, skip entire week, win next Monday** → Streak continues (exactly 7 days)
- ❌ **Win Monday, skip 8 days, win following Tuesday** → Streak breaks, resets to 1

### **UI Display Logic (3-Day Rule)**
The StreakBadge component only shows "active" streaks if the last win was within **3 days**.

**Current Behavior:**
- 📊 **Database**: Stores Beth's 11-game streak 
- 🎮 **UI**: Shows 0 with 💤 emoji if she hasn't played in 4+ days

---

## 🔄 **STREAK LIFECYCLE**

### **Starting a Streak**
1. Player plays daily word
2. Player wins (guesses correctly)
3. `current_streak` = 1, `streak_start_date` = win date

### **Continuing a Streak**  
1. Player wins on a subsequent day
2. **Gap Check**: Days between wins ≤ 7?
   - ✅ **Yes**: `current_streak` += 1
   - ❌ **No**: `current_streak` = 1 (new streak starts)

### **Breaking a Streak**
1. **Loss**: Player plays and doesn't win → `current_streak` = 0
2. **Extended Gap**: >7 days between wins → `current_streak` = 1 (resets)

### **Updating Records**
- `highest_streak` = MAX(current_streak, previous_highest)
- `last_win_date` = most recent win date
- `updated_at` = timestamp of calculation

---

## 🧪 **EDGE CASES & EXAMPLES**

### **Scenario 1: Casual Player (Beth's Case)**
**Play Pattern**: Wins Monday, skips Tuesday-Friday, wins Saturday

| Date | Action | Gap Days | Current Streak | Status |
|------|--------|----------|----------------|--------|
| Mon | Win | - | 1 | ✅ New streak |
| Tue-Fri | Skip | - | 1 | ⏸️ Streak preserved |
| Sat | Win | 5 | 2 | ✅ Continues (≤7 days) |

**Database**: `current_streak = 2`  
**UI Display**: Shows 0 💤 if >3 days since Saturday

### **Scenario 2: Consistent Player**
**Play Pattern**: Wins Monday, Tuesday, Wednesday (consecutive days)

| Date | Action | Gap Days | Current Streak | Status |
|------|--------|----------|----------------|--------|
| Mon | Win | - | 1 | ✅ New streak |
| Tue | Win | 1 | 2 | ✅ Continues |
| Wed | Win | 1 | 3 | ✅ Continues |

**Database**: `current_streak = 3`  
**UI Display**: Shows 3 🔥 (if within 3 days of Wednesday)

### **Scenario 3: Weekly Player**
**Play Pattern**: Wins every Monday for 3 weeks

| Date | Action | Gap Days | Current Streak | Status |
|------|--------|----------|----------------|--------|
| Mon Week 1 | Win | - | 1 | ✅ New streak |
| Mon Week 2 | Win | 7 | 2 | ✅ Continues (exactly 7 days) |
| Mon Week 3 | Win | 7 | 3 | ✅ Continues |

**Database**: `current_streak = 3`  
**UI Display**: Shows 0 💤 (>3 days since last Monday)

### **Scenario 4: Streak Breaking**
**Play Pattern**: Win Monday, lose Tuesday, win Wednesday

| Date | Action | Gap Days | Current Streak | Status |
|------|--------|----------|----------------|--------|
| Mon | Win | - | 1 | ✅ New streak |
| Tue | Loss | 1 | 0 | ❌ Streak broken |
| Wed | Win | 1 | 1 | ✅ New streak starts |

**Database**: `current_streak = 1`  
**UI Display**: Shows 1 🔥 (if within 3 days of Wednesday)

### **Scenario 5: Extended Gap**
**Play Pattern**: Win Monday, skip 8 days, win following Wednesday

| Date | Action | Gap Days | Current Streak | Status |
|------|--------|----------|----------------|--------|
| Mon | Win | - | 1 | ✅ New streak |
| Wed (+8 days) | Win | 8 | 1 | ⚠️ Gap too long, new streak |

**Database**: `current_streak = 1` (previous streak lost due to 8-day gap)  
**UI Display**: Shows 1 🔥 (if within 3 days of Wednesday)

---

## 🛠️ **IMPLEMENTATION DETAILS**

### **Database Trigger Logic**
```sql
-- Simplified trigger logic in player_streaks
IF (date_diff <= 7 AND previous_result = 'win') THEN
  current_streak = current_streak + 1
ELSIF (date_diff > 7 OR previous_result = 'loss') THEN  
  current_streak = 1  -- Start new streak
END IF
```

### **UI Display Logic**
```typescript
// StreakBadge.tsx
const isActiveStreak = () => {
  if (!lastWinDate || streak === 0) return false;
  
  const daysSinceWin = Math.floor(
    (today.getTime() - lastWin.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return daysSinceWin <= 3; // Show as active if ≤3 days
};
```

### **Data Flow**
```
1. Player wins daily word
2. game_sessions updated (is_won = true)  
3. leaderboard_summary populated
4. player_streaks trigger fires
5. Streak calculated with 7-day tolerance
6. API returns streak data
7. UI applies 3-day active filter
```

---

## 🎮 **USER EXPERIENCE IMPLICATIONS**

### **Positive Aspects**
- **Forgiveness**: 7-day tolerance accommodates real life
- **Flexibility**: Can maintain streaks with irregular play patterns
- **Motivation**: Streaks don't break from short breaks

### **Confusing Aspects**  
- **UI vs Database**: Display shows 0 but streak is preserved
- **Hidden Streaks**: Long-term streaks become invisible
- **Inconsistent Messages**: "Start your streak!" when you already have one

### **Improvement Opportunities**
1. **Show "Dormant" Streaks**: Display stored streaks with different styling
2. **Countdown Warnings**: "Play within X days to keep your Y-game streak"
3. **Recovery Messages**: "Welcome back! Your 11-game streak is still alive"

---

## 📊 **STREAK STATISTICS**

### **Stored in `player_streaks` Table**
- `current_streak`: Active consecutive wins (with 7-day tolerance)
- `highest_streak`: Personal best streak ever achieved  
- `streak_start_date`: When current streak began
- `last_win_date`: Most recent win date

### **Calculated Metrics**
- **Days Since Last Win**: For UI active/dormant determination
- **Streak Age**: `today - streak_start_date`
- **Gap Risk**: Days remaining before 7-day limit exceeded

---

## 🔍 **DEBUGGING CHECKLIST**

### **When Streaks Don't Show**
1. ✅ **Check Database**: Does `player_streaks.current_streak > 0`?
2. ✅ **Check Last Win**: Is `last_win_date` within 3 days?
3. ✅ **Check API**: Does `/api/streak-status` return correct data?
4. ✅ **Check UI Logic**: Is `isActiveStreak()` function working?

### **When Streaks Break Unexpectedly**
1. ✅ **Verify Gap**: Was there >7 days between wins?
2. ✅ **Check Losses**: Did player lose a game recently?
3. ✅ **Review Trigger**: Is database trigger functioning correctly?
4. ✅ **Timezone Issues**: Are dates calculated in consistent timezone?

---

## 🎯 **RECOMMENDATIONS**

### **Short-term Fixes**
1. **Update StreakBadge**: Show dormant streaks with different styling
2. **Add Streak Recovery**: "Your X-game streak is waiting!" messages
3. **Countdown Warnings**: "Play within Y days to maintain streak"

### **Long-term Improvements**  
1. **Streak Visibility Settings**: Let users choose active/total display
2. **Streak History**: Show progression over time
3. **Multiple Streak Types**: Play streaks vs win streaks vs perfect streaks

### **Documentation Updates**
1. ✅ **This document**: Comprehensive rule reference
2. **User Help**: In-game explanation of streak rules
3. **API Docs**: Clear explanation of database vs UI logic differences

---

**The key insight: Beth's 11-game streak exists in the database but is hidden by the 3-day UI filter. The system is working as designed, but the design may be confusing to users.** 