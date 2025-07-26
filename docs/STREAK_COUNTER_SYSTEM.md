# Un·Define Streak Counter System Documentation

## 🎯 **Overview**

The **Streak Counter System** tracks consecutive daily wins and displays them immediately when players complete games, incentivizing daily engagement through visual streak progression, milestone celebrations, and **interactive calendar history**.

---

## 🎨 **Visual System - StreakBadge (Updated July 2025)**

### **Purple Glow Design Philosophy**
```typescript
// NEW: Purple glow for active streaks (not red - red means incorrect in our game)
// Color system matches Un diamond styling with subtle backgrounds and glows

Active Streaks:
- 1-2 days:   Soft purple (#c084fc) with light purple background
- 3-9 days:   Medium purple (#a855f7) with light purple background  
- 10-19 days: Gold (#f59e0b) with light gold background
- 20+ days:   Deep purple (#8b5cf6) with light purple background

Inactive/Dormant:
- Gray (#9ca3af) with neutral background - encourages re-engagement
```

### **Visual Improvements**
```typescript
// Glow effect matching Un diamond system
boxShadow: `0 4px 12px ${colors.glowColor}26, 0 0 0 1px ${colors.glowColor}1A`

// Smooth transitions
transition: 'all 0.2s ease-in-out'

// Hover effect
transform: showTooltip ? 'scale(1.05)' : 'scale(1)'

// ✅ REMOVED: Green dot indicator (confusing visual element)
// ✅ IMPROVED: Softer, brand-consistent colors
// ✅ ENHANCED: Better contrast and readability
```

### **Progressive Visual Design**
- **0 streaks**: Muted gray with "Start now!" message
- **1-2 streaks**: 🟣 Purple circle with soft glow
- **3-5 streaks**: ⚡ Lightning with medium purple glow  
- **6-9 streaks**: 🔥 Fire with stronger purple glow
- **10-19 streaks**: ⭐ Gold star with gold glow + subtle pulse animation
- **20+ streaks**: 💎 Diamond with deep purple glow + sparkle effects

---

## 🖱️ **Interactive Features (NEW)**

### **Hover State**
```typescript
// Shows "Your current streak" tooltip on hover
onMouseEnter={() => setShowTooltip(true)}

// Tooltip styling matches game aesthetic
backgroundColor: '#1f2937'
color: 'white'
fontSize: '0.8rem'
```

### **Click Functionality**
```typescript
// Opens calendar modal showing play history
onClick={() => setShowCalendar(true)}

// Calendar features:
- ✅ Green checkmark for won games
- ❌ Red X for lost games  
- Empty/neutral for days not played
- Month navigation (can't go to future months)
- Today highlighted with blue border
- 2 months of history by default
```

### **Calendar Modal Design**
- **Clean, consistent styling** with game fonts (Libre Baskerville)
- **Month navigation** with proper date boundaries
- **Legend** explaining visual indicators
- **Responsive grid** layout for all screen sizes
- **Loading states** while fetching data

---

## 🔧 **New API Endpoint**

### **Player History API** (`/api/player/history`)
```typescript
// GET /api/player/history?player_id=xxx&months=2

interface HistoryResponse {
  history: Array<{
    date: string;           // YYYY-MM-DD format
    played: boolean;        // Did they play this day?
    won: boolean;          // Did they win (rank = 1)?
    rank?: number;         // Their ranking if they played
    guesses?: number;      // How many guesses used
    time?: number;         // Completion time
    word?: string;         // The word for that day
  }>;
  dateRange: {
    start: string;         // Query start date  
    end: string;          // Query end date
  };
}
```

### **Data Flow**
1. **StreakBadge clicked** → Opens StreakCalendarModal
2. **Modal opens** → Calls `/api/player/history` with playerId  
3. **API queries** → `leaderboard_summary` table for player's game history
4. **Data transformed** → Into calendar-friendly format
5. **Calendar renders** → Visual grid with win/loss indicators

---

## 🏆 **Streak Rules (Unchanged - Strict Consecutive)**

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

## 🛠️ **Recent Enhancement History (July 2025)**

### **Visual Overhaul**
**Problem**: Red streak badge was too harsh and inconsistent with brand colors
**Solution**: 
- Replaced red with purple glow system matching Un diamond
- Removed confusing green dot indicator  
- Added subtle backgrounds and better contrast
- Smooth transitions and hover effects

### **Interactive Enhancement**
**Problem**: Users couldn't see their play history or understand their streaks
**Solution**:
- Added hover tooltip showing "Your current streak"
- Click functionality opens detailed calendar view
- Calendar shows 2 months of play history with clear visual indicators
- Month navigation with proper boundaries

### **API Integration**
**Problem**: No way to fetch historical play data
**Solution**:
- Created `/api/player/history` endpoint
- Queries `leaderboard_summary` for player's game records
- Transforms data into calendar-friendly format
- Handles date ranges and error states

---

## 🎯 **User Experience Impact**

**Before Enhancement**: Static streak counter, harsh red colors, no context
**After Enhancement**: Interactive, beautiful purple glow, full history access

### **Engagement Benefits**
✅ **Purple conveys achievement** (not error like red)  
✅ **Hover feedback** provides immediate context  
✅ **Calendar view** shows progress patterns and motivates consistency  
✅ **Visual consistency** with Un diamond system  
✅ **Milestone celebrations** with animations and sparkles  

---

## 🚀 **Success Metrics**

✅ **Beautiful purple glow** matching brand colors  
✅ **Interactive hover/click** functionality  
✅ **Calendar history view** with 2 months of data  
✅ **Consistent styling** with Un diamond system  
✅ **Immediate visual feedback** and smooth animations  
✅ **Removed confusing elements** (green dot)  
✅ **Enhanced user engagement** through interactive features  

---

*This enhanced system demonstrates **thoughtful UX design** where every visual element serves a purpose and provides meaningful feedback to drive daily engagement.* 