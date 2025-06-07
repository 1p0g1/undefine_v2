# All-Time Leaderboard Implementation

## 🎯 **SIMPLIFIED METRICS** (December 2024 Decision)

### **Core Leaderboard Categories**
1. **🥇 Win Rate %** (Primary/Default) - Percentage of games won
2. **🎯 Average Guesses** - Average number of guesses needed to win
3. **🔥 Highest Streak** - Longest consecutive win streak
4. **📊 Total Games** - Most active players

**REMOVED**: Fastest players (overly complex)

## 📋 **CURRENT STATUS**

### ✅ **Already Implemented**
- Backend API: `/api/leaderboard/all-time.ts` 
- Frontend Component: `AllTimeLeaderboard.tsx`
- Integration: Settings modal button and App.tsx wiring
- Data Source: Uses existing `leaderboard_summary` table

### 🔄 **Needs Updates for Simplified Version**
- Remove speed-based leaderboard from API
- Update frontend to show 4 simplified categories
- Build streak tracking system
- Deploy to production

## 🗂️ **DATABASE REQUIREMENTS**

### **Current Tables (Already Exist)**
```sql
-- Primary data source for all-time stats
leaderboard_summary
├── player_id TEXT
├── rank INTEGER           -- 1 = win, >1 = loss  
├── best_time INTEGER      -- (ignore for simplified version)
├── guesses_used INTEGER   -- For average calculation
├── date DATE             -- For streak calculation
├── was_top_10 BOOLEAN    -- (supplemental data)
└── word_id UUID          -- Game identifier

-- Player information  
players
├── id TEXT PRIMARY KEY
└── display_name TEXT     -- For leaderboard display
```

### **New Table Needed: Streak Tracking**
```sql
CREATE TABLE player_streaks (
  player_id TEXT PRIMARY KEY REFERENCES players(id),
  current_streak INTEGER DEFAULT 0,
  highest_streak INTEGER DEFAULT 0,
  streak_start_date DATE,
  last_win_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_player_streaks_highest ON player_streaks(highest_streak DESC);
CREATE INDEX idx_player_streaks_current ON player_streaks(current_streak DESC);
```

## 🔧 **STREAK SYSTEM LOGIC**

### **Streak Definition**
- **Win**: `rank = 1` in `leaderboard_summary`
- **Consecutive wins**: Wins on consecutive dates (gaps allowed for non-play days)
- **Streak breaks**: Any `rank > 1` or missed day with gameplay

### **Streak Calculation Trigger**
```sql
-- Function to update streaks when leaderboard_summary changes
CREATE OR REPLACE FUNCTION update_player_streaks()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process wins (rank = 1)
  IF NEW.rank = 1 THEN
    -- Get player's current streak info
    INSERT INTO player_streaks (player_id, current_streak, highest_streak, streak_start_date, last_win_date)
    VALUES (NEW.player_id, 1, 1, NEW.date, NEW.date)
    ON CONFLICT (player_id) DO UPDATE SET
      current_streak = CASE 
        -- Consecutive win: increment streak
        WHEN player_streaks.last_win_date = NEW.date - INTERVAL '1 day' 
        THEN player_streaks.current_streak + 1
        -- New streak: reset to 1
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
      streak_start_date = CASE
        WHEN player_streaks.last_win_date = NEW.date - INTERVAL '1 day'
        THEN player_streaks.streak_start_date
        ELSE NEW.date
      END,
      last_win_date = NEW.date,
      updated_at = NOW();
  ELSE
    -- Loss: reset current streak to 0, keep highest_streak
    INSERT INTO player_streaks (player_id, current_streak, highest_streak, last_win_date)
    VALUES (NEW.player_id, 0, 0, NEW.date)
    ON CONFLICT (player_id) DO UPDATE SET
      current_streak = 0,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on leaderboard_summary changes
CREATE TRIGGER trigger_update_streaks
AFTER INSERT OR UPDATE ON leaderboard_summary
FOR EACH ROW EXECUTE FUNCTION update_player_streaks();
```

## 🔢 **ALL-TIME STATISTICS CALCULATION**

### **Updated API Query Logic**
```typescript
// Calculate simplified all-time stats from leaderboard_summary + player_streaks
interface AllTimeStats {
  player_id: string;
  player_name: string;
  win_percentage: number;      // (wins / total_games) * 100
  average_guesses: number;     // Average guesses for wins only
  highest_streak: number;      // From player_streaks table
  total_games: number;         // Total games played
  total_wins: number;          // Count where rank = 1
}
```

### **Leaderboard Categories**
1. **🥇 Win Rate** (Default): Sort by `win_percentage DESC`
2. **🎯 Consistency**: Sort by `average_guesses ASC` (fewer guesses = better)
3. **🔥 Streak Masters**: Sort by `highest_streak DESC`
4. **📊 Most Active**: Sort by `total_games DESC`

## 🎨 **FRONTEND DISPLAY**

### **Simplified AllTimeLeaderboard.tsx Updates**
- Remove "Fastest Players" tab
- Update to 4 tabs: Win Rate | Consistency | Streaks | Activity
- Default to Win Rate tab
- Show relevant metrics for each category

### **Leaderboard Entry Display**
```typescript
// Win Rate tab
Player Name | Win % | Total Games | Current Streak

// Consistency tab  
Player Name | Avg Guesses | Total Wins | Win %

// Streak Masters tab
Player Name | Highest Streak | Current Streak | Last Win

// Most Active tab
Player Name | Total Games | Win % | Last Played
```

## 📋 **IMPLEMENTATION STEPS**

### **Phase 1: Database Setup**
- [ ] Create `player_streaks` table migration
- [ ] Implement streak calculation trigger
- [ ] Populate initial streak data from historical `leaderboard_summary`

### **Phase 2: API Updates** 
- [ ] Update `/api/leaderboard/all-time.ts` to use simplified metrics
- [ ] Remove speed/time-based calculations
- [ ] Add streak data from `player_streaks` table

### **Phase 3: Frontend Updates**
- [ ] Update `AllTimeLeaderboard.tsx` component
- [ ] Remove speed tab, add consistency/streaks/activity tabs
- [ ] Set Win Rate as default tab
- [ ] Update display format for each category

### **Phase 4: Production Deployment**
- [ ] Deploy database migrations
- [ ] Deploy updated API and frontend
- [ ] Verify streak calculations work correctly
- [ ] Monitor all-time leaderboard performance

## 🚀 **PRODUCTION DEPLOYMENT PLAN**

1. **Database Migration**: Create `player_streaks` table and trigger
2. **Backfill Streaks**: Calculate historical streaks from existing data
3. **API Deployment**: Updated all-time endpoint 
4. **Frontend Deployment**: Simplified 4-category leaderboard
5. **Testing**: Verify streak updates work with new games

**Target**: Complete simplified all-time leaderboard with streak system in production 