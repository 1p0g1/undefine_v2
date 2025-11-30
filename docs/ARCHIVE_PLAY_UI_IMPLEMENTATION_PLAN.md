# Archive Play UI Implementation Plan
**Date:** January 30, 2025  
**Branch:** `theme-improvements`  
**Component:** Streak/Play History Modal → Archive Calendar

---

## 🎯 **GOAL**

Transform the current `StreakCalendarModal` into a dual-purpose component that shows:
1. **Play History** - Past wins/losses (existing functionality)
2. **Archive Play** - Clickable dates to replay past words

---

## 📊 **CURRENT STATE ANALYSIS**

### **Existing Component:**
- **File:** `client/src/components/StreakCalendarModal.tsx`
- **Trigger:** Clicking `StreakBadge`
- **Data Source:** `GET /api/player/history` (last 2 months)
- **Display:**  
  - ✅ Green checkmark = Won
  - ❌ Red X = Lost
  - Empty = No play

### **Current Limitations:**
- ❌ Only shows 2 months of history
- ❌ Dates are not clickable
- ❌ No way to access older words
- ❌ No indication if word exists for a date

---

## 🏗️ **NEW ARCHITECTURE**

### **Enhanced `StreakCalendarModal` will:**
1. Show **full calendar** (not just history dates)
2. **Mark dates** with indicators:
   - 🟢 Won (played & won)
   - 🔴 Lost (played & lost)
   - 🔵 Available (not played, word exists)
   - ⚪ Not available (no word for this date)
3. **Make clickable:** Dates with available words
4. **Gray out:** Dates without words
5. **Navigate:** Previous/Next month buttons

---

## 🎨 **UI DESIGN**

### **Visual States:**

```
Calendar Day States:
┌──────────────────────────────────────────────┐
│ 1. TODAY (current date)                      │
│    - Bold border, highlighted background     │
│    - Shows current game status               │
├──────────────────────────────────────────────┤
│ 2. WON (past date, played & won)             │
│    - Green checkmark ✓                       │
│    - Not clickable (already completed)       │
├──────────────────────────────────────────────┤
│ 3. LOST (past date, played & lost)           │
│    - Red X ✗                                 │
│    - Clickable (can retry archive)           │
├──────────────────────────────────────────────┤
│ 4. AVAILABLE (past date, not played)         │
│    - Blue outline, clickable                 │
│    - Cursor: pointer                         │
│    - Hover: highlighted                      │
├──────────────────────────────────────────────┤
│ 5. NO WORD (no word exists for this date)    │
│    - Gray, faded                             │
│    - Not clickable                           │
│    - Cursor: not-allowed                     │
├──────────────────────────────────────────────┤
│ 6. FUTURE (date hasn't happened yet)         │
│    - Gray, faded                             │
│    - Not clickable                           │
└──────────────────────────────────────────────┘
```

### **Modal Layout:**
```
┌─────────────────────────────────────────────┐
│           Your Play History           ✕     │
├─────────────────────────────────────────────┤
│  ← Previous    November 2025    Next →      │
├─────────────────────────────────────────────┤
│  Sun  Mon  Tue  Wed  Thu  Fri  Sat          │
│                        1   2   3   4         │
│   5    6    7    8    9   10  11            │
│  [12] [13] [14] [15] [16] [17] [18]         │
│  [19] [20] [21] [22] [23] [24] [25]         │
│  [26] [27] [28] [29] [30]                   │
├─────────────────────────────────────────────┤
│  ✓ Won    ✗ Lost    📅 Available            │
│  ⚪ No word                                  │
├─────────────────────────────────────────────┤
│  Click any available date to play!          │
└─────────────────────────────────────────────┘
```

---

## 📡 **BACKEND API CHANGES**

### **1. New Endpoint: `GET /api/archive/available-dates`**

**Purpose:** Get ALL dates that have words (for calendar marking)

```typescript
// pages/api/archive/available-dates.ts

interface AvailableDateInfo {
  date: string;           // YYYY-MM-DD
  word: string;           // The word for that date
  hasWord: boolean;       // Always true (only return dates with words)
  theme: string | null;   // Theme if applicable
  difficulty: string | null;
}

export default async function handler(req, res) {
  const { start_date, end_date } = req.query;
  
  // Get all words between start and end date
  const { data } = await supabase
    .from('words')
    .select('date, word, theme, difficulty')
    .gte('date', start_date)
    .lte('date', end_date)
    .order('date', { ascending: true });
  
  return res.json({ dates: data });
}
```

**Usage:**
```typescript
// In StreakCalendarModal:
const availableDates = await fetch(
  `/api/archive/available-dates?start_date=2024-11-01&end_date=2025-01-31`
);
```

---

### **2. Modified Endpoint: `GET /api/word`**

**Add query parameters for archive mode:**

```typescript
// pages/api/word.ts

async function handler(req, res) {
  const requestedDate = req.query.date as string | undefined;
  const today = getTodayDateString();
  const targetDate = requestedDate || today;
  const isArchive = targetDate !== today;
  
  // Get word for specific date
  const word = await getWordByDate(targetDate);
  
  // Create game session with archive flag
  const { data: session } = await supabase
    .from('game_sessions')
    .insert({
      player_id: playerId,
      word_id: word.id,
      is_archive_play: isArchive,      // ← NEW
      game_date: targetDate,            // ← NEW
      // ... other fields
    });
  
  return res.json({
    word,
    gameId: session.id,
    start_time: session.start_time,
    isArchivePlay: isArchive,          // ← NEW
    gameDate: targetDate               // ← NEW
  });
}
```

---

## 🔨 **IMPLEMENTATION STEPS**

### **Step 1: Create Available Dates API** (30 min)

```bash
# Create new API endpoint
touch pages/api/archive/available-dates.ts
```

**Implementation:**
- Query `words` table for date range
- Return list of dates with words
- Cache results (dates don't change)

---

### **Step 2: Enhance StreakCalendarModal Component** (2-3 hours)

**Changes needed:**
1. **Fetch available dates** from new API
2. **Determine date state** (won/lost/available/no word)
3. **Make dates clickable** with `onClick` handler
4. **Visual styling** for each state
5. **Handle clicks** → close modal → start archive game

**New State:**
```typescript
const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
const [playHistory, setPlayHistory] = useState<Map<string, DayStatus>>(new Map());
```

**Date state logic:**
```typescript
const getDateState = (date: string): DateState => {
  const today = getTodayDateString();
  const dateObj = new Date(date);
  const todayObj = new Date(today);
  
  // Future date
  if (dateObj > todayObj) return 'future';
  
  // Today
  if (date === today) return 'today';
  
  // Check if played
  const playStatus = playHistory.get(date);
  if (playStatus) {
    return playStatus.won ? 'won' : 'lost';
  }
  
  // Check if word exists
  if (availableDates.has(date)) return 'available';
  
  // No word
  return 'no-word';
};
```

---

### **Step 3: Modify `/api/word` for Archive Mode** (1 hour)

**Changes:**
1. Accept `?date=YYYY-MM-DD` query parameter
2. Look up word by date instead of today
3. Set `is_archive_play = true` if date !== today
4. Set `game_date` to requested date

---

### **Step 4: Update GameService for Archive** (1 hour)

```typescript
// client/src/services/GameService.ts

public async startArchiveGame(date: string): Promise<GameSessionState> {
  console.log('[GameService] Starting archive game for:', date);
  
  const data = await apiClient.getArchiveWord(date);
  
  this.currentState = {
    gameId: data.gameId,
    wordId: data.word.id,
    wordText: data.word.word,
    clues: processClues(data.word),
    guesses: [],
    revealedClues: [],
    clueStatus: createDefaultClueStatus(),
    isComplete: false,
    isWon: false,
    score: null,
    startTime: data.start_time,
    isArchivePlay: true,        // ← NEW
    gameDate: data.gameDate      // ← NEW
  };
  
  this.saveState();
  return this.currentState;
}
```

---

### **Step 5: Add Archive Banner to UI** (30 min)

```typescript
// client/src/App.tsx

{gameState?.isArchivePlay && (
  <div className="archive-banner" style={{
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    marginBottom: '1rem',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  }}>
    <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
      📚 Archive Play
    </div>
    <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
      {gameState.gameDate} • Won't affect your streak or leaderboard
    </div>
  </div>
)}
```

---

### **Step 6: Update Summary Modal** (30 min)

```typescript
// client/src/GameSummaryModal.tsx

{isArchivePlay ? (
  <div className="archive-completion">
    <h2>Archive Word Completed! 📚</h2>
    <p>You played the word from {gameDate}</p>
    <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
      This doesn't affect your live stats, but great job exploring the archive!
    </p>
  </div>
) : (
  // ... existing live game UI
)}
```

---

## 🎯 **DETAILED COMPONENT MODIFICATIONS**

### **Enhanced StreakCalendarModal.tsx:**

```typescript
import React, { useState, useEffect } from 'react';
import { getPlayerId } from '../utils/storage';

interface DateInfo {
  date: string;
  word: string;
  hasWord: boolean;
  theme: string | null;
}

interface DayStatus {
  played: boolean;
  won: boolean;
}

type DateState = 'today' | 'won' | 'lost' | 'available' | 'no-word' | 'future';

export const StreakCalendarModal: React.FC<Props> = ({ open, onClose, playerId, onSelectArchiveDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [playHistory, setPlayHistory] = useState<Map<string, DayStatus>>(new Map());
  const [availableDates, setAvailableDates] = useState<Map<string, DateInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, currentDate]);
  
  const loadData = async () => {
    // Calculate month range
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const startDate = formatDate(startOfMonth);
    const endDate = formatDate(endOfMonth);
    
    // Load both play history and available dates in parallel
    await Promise.all([
      loadPlayHistory(startDate, endDate),
      loadAvailableDates(startDate, endDate)
    ]);
  };
  
  const loadAvailableDates = async (startDate: string, endDate: string) => {
    const response = await fetch(
      `/api/archive/available-dates?start_date=${startDate}&end_date=${endDate}`
    );
    const data = await response.json();
    
    const dateMap = new Map();
    data.dates.forEach((d: DateInfo) => {
      dateMap.set(d.date, d);
    });
    setAvailableDates(dateMap);
  };
  
  const getDateState = (date: string): DateState => {
    const today = getTodayDateString();
    const dateObj = new Date(date);
    const todayObj = new Date(today);
    
    if (dateObj > todayObj) return 'future';
    if (date === today) return 'today';
    
    const playStatus = playHistory.get(date);
    if (playStatus) {
      return playStatus.won ? 'won' : 'lost';
    }
    
    if (availableDates.has(date)) return 'available';
    return 'no-word';
  };
  
  const handleDateClick = (date: string) => {
    const state = getDateState(date);
    
    // Only allow clicking on available dates (not played yet)
    if (state === 'available' || state === 'lost') {
      onSelectArchiveDate(date);
      onClose();
    }
  };
  
  const renderDay = (date: string) => {
    const state = getDateState(date);
    const isClickable = state === 'available' || state === 'lost';
    
    return (
      <div
        className={`calendar-day state-${state} ${isClickable ? 'clickable' : ''}`}
        onClick={() => isClickable && handleDateClick(date)}
        style={{
          cursor: isClickable ? 'pointer' : 'not-allowed',
          opacity: state === 'no-word' || state === 'future' ? 0.3 : 1,
          // ... styling per state
        }}
      >
        {getDateIcon(state)}
        {date.split('-')[2]} {/* Day number */}
      </div>
    );
  };
  
  return (
    // ... calendar rendering
  );
};
```

---

## 🎨 **STYLING**

### **CSS for Date States:**

```css
.calendar-day {
  padding: 0.5rem;
  border-radius: 0.375rem;
  text-align: center;
  transition: all 0.2s;
}

.calendar-day.clickable:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.calendar-day.state-today {
  border: 2px solid #3b82f6;
  background: #dbeafe;
  font-weight: bold;
}

.calendar-day.state-won {
  background: #d1fae5;
  color: #065f46;
}

.calendar-day.state-lost {
  background: #fee2e2;
  color: #991b1b;
}

.calendar-day.state-available {
  border: 2px dashed #3b82f6;
  background: #f0f9ff;
}

.calendar-day.state-no-word,
.calendar-day.state-future {
  color: #9ca3af;
  background: #f9fafb;
}
```

---

## ⚠️ **EDGE CASES TO HANDLE**

1. **Player clicks today's date:**
   - Should it close modal and return to current game?
   - Or show message "This is today's word"?
   - **Recommendation:** Treat as "already playing" - no action

2. **Player clicks won date:**
   - Should they be able to replay?
   - **Current plan:** No (not clickable)
   - **Alternative:** Allow replay but mark as archive

3. **Player clicks lost date:**
   - **Recommendation:** Allow retry as archive play

4. **No words exist for month:**
   - Show message: "No words available for this month"

5. **Loading states:**
   - Show skeleton/spinner while loading dates
   - Graceful error handling if API fails

---

## 📋 **TESTING CHECKLIST**

- [ ] Calendar loads with correct dates
- [ ] Play history displayed correctly (won/lost)
- [ ] Available dates marked properly
- [ ] No-word dates grayed out
- [ ] Future dates not clickable
- [ ] Clicking available date starts archive game
- [ ] Archive game has banner showing it's archive
- [ ] Archive game doesn't affect streak
- [ ] Archive completion shows special message
- [ ] Theme guessing works for archive plays
- [ ] Navigation (prev/next month) works
- [ ] Loading states display correctly
- [ ] Error states handled gracefully

---

## 🚀 **ROLLOUT PLAN**

### **Phase 1: Backend (30 min)**
1. Create `/api/archive/available-dates` endpoint
2. Modify `/api/word` to accept date parameter
3. Test both endpoints

### **Phase 2: Frontend Core (2 hours)**
1. Enhance `StreakCalendarModal` component
2. Add state management for available dates
3. Implement date clicking logic

### **Phase 3: UI Polish (1 hour)**
1. Add archive banner to main app
2. Update summary modal for archive
3. Style calendar states
4. Add hover effects

### **Phase 4: Integration (30 min)**
1. Connect modal to GameService
2. Test full flow: click → load → play → complete
3. Verify stats separation working

### **Phase 5: Testing (1 hour)**
1. Test all date states
2. Test archive game flow
3. Verify no streak impact
4. Check theme guessing

**Total Estimated Time:** 5-6 hours

---

**Last Updated:** January 30, 2025  
**Status:** 📋 Ready for Implementation  
**Next:** Begin with Backend API endpoints

