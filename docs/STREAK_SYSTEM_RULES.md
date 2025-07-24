# Streak System Rules & Logic

**Last Updated**: January 2025  
**Status**: ✅ Active System - STRICT CONSECUTIVE DAILY PLAY  
**Purpose**: Incentivize daily user engagement through consecutive daily wins

---

## 🎯 **CORE STREAK DEFINITION**

### **What is a Streak?**
A **streak** is a sequence of **consecutive daily wins** with **NO gaps allowed**.

### **Key Principles**
1. **Daily wins only count** - Must play and win the daily word
2. **Consecutive days required** - Missing ANY day breaks the streak
3. **NO gap tolerance** - Skip Tuesday after Monday win = streak broken
4. **Loss breaks streak** - Playing and losing resets the streak to 0
5. **Daily engagement incentive** - Designed to encourage daily play habits

---

## 📅 **STRICT CONSECUTIVE RULES**

### **Database Logic (No Tolerance)**
The `player_streaks` table trigger requires **consecutive calendar days** between wins.

**Examples:**
- ✅ **Win Monday, win Tuesday, win Wednesday** → 3-game streak
- ❌ **Win Monday, skip Tuesday, win Wednesday** → Streak breaks, new streak starts (1)
- ❌ **Win Monday, skip any day, win later** → Streak always breaks

### **UI Display Logic (Same as Database)**
The StreakBadge shows active streaks only if player won yesterday or today.

**Current Behavior:**
- 📊 **Database**: Stores only true consecutive daily wins
- 🎮 **UI**: Shows streaks if last win was yesterday or today
- 🎯 **Goal**: Encourage daily play habits

---

## 🔄 **STREAK LIFECYCLE**

### **Starting a Streak**
1. Player plays daily word
2. Player wins (guesses correctly)
3. `current_streak` = 1, `streak_start_date` = win date

### **Continuing a Streak**  
1. Player wins on the **next calendar day**
2. **Gap Check**: Is today exactly 1 day after last win?
   - ✅ **Yes**: `current_streak` += 1
   - ❌ **No**: `current_streak` = 1 (new streak starts)

### **Breaking a Streak**
1. **Loss**: Player plays and doesn't win → `current_streak` = 0
2. **Skip Day**: Player doesn't play on consecutive day → `current_streak` = 1 (when they next win)
3. **Gap**: Any gap >1 day between wins → `current_streak` = 1 (resets)

### **Updating Records**
- `highest_streak` = MAX(current_streak, previous_highest)
- `last_win_date` = most recent win date
- `updated_at` = timestamp of calculation

---

## 🧪 **EDGE CASES & EXAMPLES**

### **Scenario 1: Perfect Daily Player**
**Play Pattern**: Wins Monday, Tuesday, Wednesday (consecutive days)

| Date | Action | Gap Days | Current Streak | Status |
|------|--------|----------|----------------|--------|
| Mon | Win | - | 1 | ✅ New streak |
| Tue | Win | 1 | 2 | ✅ Continues (consecutive) |
| Wed | Win | 1 | 3 | ✅ Continues (consecutive) |

**Database**: `current_streak = 3`  
**UI Display**: Shows 3 🔥 (if won today or yesterday)

### **Scenario 2: Casual Player (Streak Breaks)**
**Play Pattern**: Wins Monday, skips Tuesday, wins Wednesday

| Date | Action | Gap Days | Current Streak | Status |
|------|--------|----------|----------------|--------|
| Mon | Win | - | 1 | ✅ New streak |
| Tue | Skip | - | 1 | ⏸️ At risk |
| Wed | Win | 2 | 1 | ❌ Streak broken (gap too long) |

**Database**: `current_streak = 1` (new streak started)  
**UI Display**: Shows 1 🔥 (if Wednesday is today)

### **Scenario 3: Weekend Break (Streak Breaks)**
**Play Pattern**: Wins Friday, skips weekend, wins Monday

| Date | Action | Gap Days | Current Streak | Status |
|------|--------|----------|----------------|--------|
| Fri | Win | - | 1 | ✅ New streak |
| Sat-Sun | Skip | - | 1 | ⏸️ At risk |
| Mon | Win | 3 | 1 | ❌ Streak broken (weekend gap) |

**Database**: `current_streak = 1` (new streak started)  
**UI Display**: Shows 1 🔥 (if Monday is today)

### **Scenario 4: Loss Breaks Streak**
**Play Pattern**: Win Monday, win Tuesday, lose Wednesday, win Thursday

| Date | Action | Gap Days | Current Streak | Status |
|------|--------|----------|----------------|--------|
| Mon | Win | - | 1 | ✅ New streak |
| Tue | Win | 1 | 2 | ✅ Continues |
| Wed | Loss | 1 | 0 | ❌ Streak broken (loss) |
| Thu | Win | 1 | 1 | ✅ New streak starts |

**Database**: `current_streak = 1`  
**UI Display**: Shows 1 🔥 (if Thursday is today)

### **Scenario 5: 7-Day Streak Example**
**Play Pattern**: Wins every day Monday through Sunday

| Date | Action | Gap Days | Current Streak | Status |
|------|--------|----------|----------------|--------|
| Mon | Win | - | 1 | ✅ New streak |
| Tue | Win | 1 | 2 | ✅ Continues |
| Wed | Win | 1 | 3 | ✅ Continues |
| Thu | Win | 1 | 4 | ✅ Continues |
| Fri | Win | 1 | 5 | ✅ Continues |
| Sat | Win | 1 | 6 | ✅ Continues |
| Sun | Win | 1 | 7 | ✅ Week-long streak! |

**Database**: `current_streak = 7`  
**UI Display**: Shows 7 ⭐ (gold level achievement)

---

## 🛠️ **IMPLEMENTATION DETAILS**

### **Database Trigger Logic**
```sql
-- NEW Strict consecutive logic in player_streaks
IF (date_diff = 1 AND previous_result = 'win') THEN
  current_streak = current_streak + 1  -- Consecutive day win
ELSIF (previous_result = 'win') THEN
  current_streak = 1  -- Win but not consecutive (gap exists)
ELSE
  current_streak = 0  -- Loss breaks streak completely
END IF
```

### **UI Display Logic**
```typescript
// StreakBadge.tsx - Show active if won yesterday or today
const isActiveStreak = () => {
  if (!lastWinDate || streak === 0) return false;
  
  const daysSinceWin = Math.floor(
    (today.getTime() - lastWin.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return daysSinceWin <= 1; // Active if won today or yesterday
};
```

### **Data Flow**
```
1. Player wins daily word
2. game_sessions updated (is_won = true)  
3. leaderboard_summary populated
4. player_streaks trigger fires with STRICT consecutive check
5. Streak increments only if exactly 1 day since last win
6. API returns streak data
7. UI shows streak if won today or yesterday
```

---

## 🎮 **USER EXPERIENCE IMPLICATIONS**

### **Positive Aspects**
- **Strong Daily Habit Formation:** Encourages consistent engagement
- **Clear Rules:** No confusion about what maintains a streak
- **Achievement Value:** Streaks become meaningful accomplishments
- **Competitive Edge:** Separates dedicated daily players

### **Challenging Aspects**  
- **Unforgiving:** One missed day breaks the streak
- **Weekend Risk:** Weekend players will struggle with streaks
- **Holiday/Travel Impact:** Vacations will break all streaks
- **Pressure:** May create stress about daily engagement

### **Motivation Strategy**
1. **Streak Warnings:** "Play today to keep your 5-game streak!"
2. **Recovery Messaging:** "Start a new streak today!"
3. **Milestone Celebrations:** Extra fanfare for 7, 14, 30+ day streaks
4. **Leaderboard Recognition:** Show top current streaks

---

## 📊 **STREAK STATISTICS**

### **Stored in `player_streaks` Table**
- `current_streak`: Consecutive daily wins (strict, no gaps)
- `highest_streak`: Personal best consecutive daily wins ever
- `streak_start_date`: When current consecutive streak began
- `last_win_date`: Most recent win date

### **Calculated Metrics**
- **Days Since Last Win**: For UI active determination (0-1 = active)
- **Streak Age**: `today - streak_start_date`
- **Risk Status**: "Play today or lose your X-game streak!"

---

## 🔍 **DEBUGGING CHECKLIST**

### **When Streaks Don't Continue**
1. ✅ **Check Consecutive Days**: Was there exactly 1 day between wins?
2. ✅ **Check Win Status**: Did player actually win (not just play)?
3. ✅ **Check Database Dates**: Are dates in same timezone?
4. ✅ **Check Trigger Logic**: Is consecutive check working correctly?

### **When Streaks Break Unexpectedly**
1. ✅ **Verify Gap**: Was there >1 day between wins?
2. ✅ **Check Losses**: Did player lose breaking the streak?
3. ✅ **Review Calendar**: Account for weekends/holidays
4. ✅ **Timezone Issues**: Ensure consistent date calculations

---

## 🚨 **BREAKING CHANGE IMPLICATIONS**

### **Impact on Existing Players**
- **Beth's 11-game streak**: Will likely break as it probably has gaps
- **All current streaks**: Need recalculation with strict rules
- **User expectations**: Players used to forgiving system will be surprised

### **Migration Strategy**
1. **Announce the change**: Give users warning about new strict rules
2. **Recalculate all streaks**: Apply new logic to historical data
3. **Reset messaging**: Update UI to reflect new requirements
4. **Monitor engagement**: Track if stricter rules help or hurt daily play

### **Code Changes Required**
1. **Database trigger rewrite**: Implement strict consecutive logic
2. **UI updates**: Change active threshold to 1 day
3. **Messaging updates**: Update all streak-related text
4. **Data migration**: Recalculate existing streaks

---

## 🎯 **SUCCESS METRICS**

### **Daily Engagement Goals**
- ✅ **Increased Daily Active Users**: More players playing every day
- ✅ **Higher Retention**: Players form daily habits
- ✅ **Reduced Churn**: Daily players are more loyal
- ✅ **Premium Conversions**: Engaged daily users more likely to pay

### **Streak Achievement Distribution** (Expected)
- **1-3 days**: 60% of active players (common)
- **4-7 days**: 25% of active players (weekly achievers)
- **8-14 days**: 10% of active players (dedicated)
- **15+ days**: 5% of active players (champions)

---

**This strict system transforms streaks from casual metrics into meaningful daily engagement achievements that truly incentivize the regular playing behavior you want to encourage.** 🎯 