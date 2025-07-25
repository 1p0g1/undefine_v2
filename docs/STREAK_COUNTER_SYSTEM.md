# Un·Define Streak Counter System Documentation

## 🎯 **Overview**

The **Streak Counter System** tracks consecutive daily wins and displays them immediately when players complete games, incentivizing daily engagement through visual streak progression and milestone celebrations.

---

## 🏆 **Streak Rules (Updated January 2025)**

### **Strict Consecutive Daily System**
```
✅ WIN: Successfully guess the daily word (any rank)
🔥 STREAK: Consecutive calendar days with wins
❌ BREAK: ANY missed day breaks the current streak
📈 PERSONAL BEST: Highest streak ever achieved (preserved)
```

### **Examples**
- **Monday win + Tuesday win** = 2-day streak ✅
- **Monday win + Tuesday miss + Wednesday win** = 1-day streak (resets) ❌
- **Weekend break** = Streak broken ❌
- **Loss but played** = Streak broken ❌

---

## 💾 **Database Architecture**

### **Core Table: `player_streaks`**
```sql
CREATE TABLE player_streaks (
  player_id TEXT PRIMARY KEY REFERENCES players(id),
  current_streak INTEGER NOT NULL DEFAULT 0,    -- Active consecutive streak
  highest_streak INTEGER NOT NULL DEFAULT 0,    -- Personal best (preserved)
  streak_start_date DATE,                       -- When current streak began
  last_win_date DATE,                          -- Most recent win date
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Automatic Updates via Triggers**
```sql
-- Trigger fires on leaderboard_summary changes
CREATE TRIGGER trigger_update_streaks
AFTER INSERT OR UPDATE ON leaderboard_summary
FOR EACH ROW EXECUTE FUNCTION update_player_streaks();
```

---

## ⚡ **Immediate Update System**

### **The Problem We Solved**
```typescript
// ❌ OLD SYSTEM: Separate API call with delay
const guessResult = await submitGuess(normalizedGuess);
setTimeout(async () => {
  await refreshStats(); // Separate API call - SLOW!
}, 500);
```

### **✅ NEW SYSTEM: Immediate Response Data**
```typescript
// API returns updated stats immediately
const guessResult = await submitGuess(normalizedGuess);

if (guessResult.gameOver && guessResult.isCorrect && guessResult.stats) {
  // Update local state immediately from API response
  setImmediateStreakData({
    currentStreak: guessResult.stats.current_streak,
    longestStreak: guessResult.stats.longest_streak,
    lastWinDate: guessResult.stats.updated_at
  });
}
```

### **Backend Implementation**
```typescript
// In pages/api/guess.ts - Step 5: Fetch updated stats
const { data: playerStats } = await supabase
  .from('player_streaks')
  .select('current_streak, highest_streak, last_win_date')
  .eq('player_id', playerId)
  .single();

// Return stats with game response
return res.status(200).json({
  ...result,
  score: scoreResult,
  stats: {
    current_streak: playerStats?.current_streak || 0,
    longest_streak: playerStats?.highest_streak || 0,
    updated_at: new Date().toISOString()
  }
});
```

---

## 🎨 **Visual System - StreakBadge**

### **Progressive Visual Design**
```typescript
// Color progression based on streak length
const getStreakColor = (streak: number) => {
  if (streak === 0) return '#6b7280';        // Gray - no streak
  if (streak >= 20) return '#8b5cf6';        // Purple - Diamond tier
  if (streak >= 10) return '#fbbf24';        // Gold - Elite tier
  if (streak >= 6) return '#eab308';         // Yellow - High tier
  if (streak >= 3) return '#059669';         // Green - Active tier
  return '#3b82f6';                          // Blue - Starting tier
};

// Emoji progression
const getStreakEmoji = (streak: number) => {
  if (streak === 0) return '😴';             // Sleeping
  if (streak >= 20) return '💎';             // Diamond
  if (streak >= 10) return '🔥';             // Fire
  if (streak >= 3) return '⚡';              // Lightning
  return '🟢';                               // Green circle
};
```

### **Milestone Celebrations**
- **10+ streaks**: Subtle pulse animation
- **15+ streaks**: Background sparkle effect  
- **20+ streaks**: Diamond tier styling
- **Confetti**: Triggered on game completion (separate system)

---

## 🔧 **Database Trigger Logic**

### **Strict Consecutive Function**
```sql
CREATE OR REPLACE FUNCTION update_player_streaks()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rank = 1 THEN  -- Only process wins
    INSERT INTO player_streaks (player_id, current_streak, highest_streak, streak_start_date, last_win_date)
    VALUES (NEW.player_id, 1, 1, NEW.date, NEW.date)
    ON CONFLICT (player_id) DO UPDATE SET
      current_streak = CASE 
        -- STRICT: Only consecutive calendar days (exactly 1 day apart)
        WHEN player_streaks.last_win_date = NEW.date - INTERVAL '1 day' 
        THEN player_streaks.current_streak + 1
        -- ANY gap breaks streak, start new streak at 1
        ELSE 1
      END,
      highest_streak = GREATEST(
        player_streaks.highest_streak,
        CASE 
          WHEN player_streaks.last_win_date = NEW.date - INTERVAL '1 day'
          THEN player_streaks.current_streak + 1
          ELSE 1
        END
      ),
      last_win_date = NEW.date,
      updated_at = NOW();
  ELSE
    -- Loss: breaks current streak completely
    INSERT INTO player_streaks (player_id, current_streak, highest_streak, last_win_date)
    VALUES (NEW.player_id, 0, 0, NEW.date)
    ON CONFLICT (player_id) DO UPDATE SET
      current_streak = 0,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 **API Integration**

### **Player Stats Endpoint** (`/api/streak-status`)
```typescript
interface StreakResponse {
  currentStreak: number;      // Active consecutive streak
  longestStreak: number;      // Personal best streak
  lastWinDate: string | null; // Most recent win date
}

// Implementation
const { data } = await supabase
  .from('player_streaks')
  .select('current_streak, highest_streak, last_win_date')
  .eq('player_id', player_id)
  .maybeSingle();

return {
  currentStreak: data?.current_streak ?? 0,
  longestStreak: data?.highest_streak ?? 0,
  lastWinDate: data?.last_win_date ?? null
};
```

### **Guess API Response Enhancement**
```typescript
// Enhanced response includes real-time streak data
interface GuessResponse {
  isCorrect: boolean;
  gameOver: boolean;
  stats?: {
    current_streak: number;      // ✅ NEW: Immediate streak data
    longest_streak: number;      // ✅ NEW: Personal best
    updated_at: string;          // ✅ NEW: Last update timestamp
  };
}
```

---

## 🛠️ **Critical Fix History**

### **The Great Trigger Disaster (July 2025)**
**Problem**: All database triggers were DISABLED (`tgenabled = 0`)
```sql
-- Diagnosis revealed
trigger_update_streaks              enabled: 0  ❌ DISABLED
update_rankings_after_leaderboard   enabled: 0  ❌ DISABLED
```

**Solution**: Re-enable all triggers
```sql
ALTER TABLE leaderboard_summary ENABLE TRIGGER trigger_update_streaks;
ALTER TABLE leaderboard_summary ENABLE TRIGGER update_rankings_after_leaderboard_change;
```

**Result**: Immediate streak functionality restoration ✅

### **API Response Bug (July 2025)**
**Problem**: `guess.ts` API returned `stats: undefined`
```typescript
// pages/api/guess.ts line 885
let stats = undefined;  // ❌ Never populated!
```

**Solution**: Added Step 5 - Fetch updated stats after leaderboard update
```typescript
// ✅ Now properly fetches and returns streak data
stats = {
  current_streak: playerStats?.current_streak || 0,
  longest_streak: playerStats?.highest_streak || 0,
  updated_at: new Date().toISOString()
};
```

---

## 🎯 **State Management**

### **Frontend Architecture**
```typescript
// App.tsx - Hybrid approach
const { stats: playerStats, refreshStats } = usePlayer();

// Local override for immediate updates (like theme system)
const [immediateStreakData, setImmediateStreakData] = useState<{
  currentStreak: number;
  longestStreak: number;
  lastWinDate: string | null;
} | null>(null);

// Use immediate data if available, otherwise fall back to API
const effectivePlayerStats = immediateStreakData 
  ? { ...playerStats, ...immediateStreakData }
  : playerStats;
```

### **Update Flow**
1. **Player wins game** → `submitGuess()` called
2. **API processes win** → Updates `leaderboard_summary`
3. **Database trigger fires** → Updates `player_streaks`
4. **API fetches fresh stats** → Returns updated streak data
5. **Frontend updates immediately** → Sets `immediateStreakData`
6. **StreakBadge re-renders** → Shows new streak count

---

## 🔍 **Debugging & Monitoring**

### **Console Logs to Watch**
```javascript
[App] Game won! Updating streak data immediately from response
[App] New stats from API: {current_streak: 1, longest_streak: 1}
[/api/guess] ✅ Step 5 completed: Player stats fetched
[usePlayer] Setting new stats: {currentStreak: 1}
```

### **Database Verification**
```sql
-- Check if triggers are enabled
SELECT tgname, tgenabled FROM pg_trigger 
WHERE tgrelid = 'leaderboard_summary'::regclass;

-- Verify streak data
SELECT current_streak, highest_streak, last_win_date 
FROM player_streaks 
WHERE player_id = 'your-player-id';
```

---

## 🚀 **Success Metrics**

✅ **Immediate visual updates** (no delays)  
✅ **Database triggers enabled** and functional  
✅ **API returns real streak data** (not undefined)  
✅ **Strict consecutive logic** enforced  
✅ **Personal bests preserved** during system changes  
✅ **Visual progression** and milestone celebrations  

---

## 📈 **Engagement Impact**

**Before Fix**: Streak counter stuck at 0, no user motivation  
**After Fix**: Real-time streak progression, daily engagement incentive  

**Design Philosophy**: *"Every win should feel immediately rewarding"*

---

*This system showcases the importance of **immediate feedback loops** and **robust database triggers** for creating engaging user experiences that drive daily habits.* 