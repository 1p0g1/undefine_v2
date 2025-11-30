# Archive Play Implementation Plan
**Date:** January 2025  
**Status:** 📋 Planning Phase  
**Priority:** 🔥 High - New Feature Request

---

## 🎯 **FEATURE OVERVIEW**

### **Goal:**
Allow players to play words from previous dates (archive play) while maintaining the integrity of:
- **Live daily stats** (streaks, leaderboards, rankings)
- **Theme of the week** functionality
- **Player progression tracking**

### **Key Requirements:**
1. Players can play any previous date's word
2. Archive plays DON'T affect live stats (streaks, leaderboards)
3. Archive plays ARE tracked separately for completeness/achievement
4. Theme guesses work for archive plays (if within theme week)
5. Clear UI distinction between "live" and "archive" play

---

## 🔍 **CURRENT SYSTEM ANALYSIS**

### **✅ Schema Assessment**

#### **1. `game_sessions` Table - ⚠️ NEEDS MODIFICATION**
```sql
Current Structure:
- player_id (TEXT)
- word_id (UUID)
- date (TEXT) -- Currently NOT populated consistently
- start_time (TIMESTAMPTZ)
- end_time (TIMESTAMPTZ)
- is_complete (BOOLEAN)
- is_won (BOOLEAN)
- guesses (TEXT[])
- theme_guess (TEXT)
```

**Issues:**
- ❌ No `is_archive_play` flag to distinguish archive from live
- ❌ `date` column exists but may not be populated
- ❌ No way to exclude archive plays from streak calculations
- ❌ Triggers treat all wins equally (would affect streaks)

**Required Changes:**
```sql
ALTER TABLE game_sessions ADD COLUMN is_archive_play BOOLEAN DEFAULT FALSE;
ALTER TABLE game_sessions ADD COLUMN game_date DATE; -- Word's actual date
ALTER TABLE game_sessions ADD COLUMN played_on DATE DEFAULT CURRENT_DATE; -- When played
```

#### **2. `leaderboard_summary` Table - ⚠️ NEEDS LOGIC CHANGE**
```sql
Current Structure:
- player_id (TEXT)
- word_id (UUID)
- date (TEXT)
- rank (INTEGER)
- best_time (INTERVAL)
- guesses_used (INTEGER)
- was_top_10 (BOOLEAN)
```

**Issues:**
- ❌ Populated by trigger on `game_sessions` completion
- ❌ Would include archive play wins (pollutes leaderboard)
- ❌ No exclusion logic for archive plays

**Required Changes:**
- Modify trigger to exclude `is_archive_play = TRUE` from leaderboard population
- Archive plays tracked separately (see new table below)

#### **3. `player_streaks` Table - ✅ MOSTLY OK**
```sql
Current Structure:
- player_id (TEXT PRIMARY KEY)
- current_streak (INTEGER)
- highest_streak (INTEGER)
- streak_start_date (DATE)
- last_win_date (DATE)
```

**Analysis:**
- ✅ Trigger fires on `leaderboard_summary` changes
- ✅ If archive plays don't enter leaderboard, streaks unaffected
- ✅ No direct changes needed (relies on leaderboard exclusion)

**Critical Rule:**
Streaks require **consecutive daily wins on the day the word was published**.
Playing yesterday's word today ≠ streak (it's an archive play).

#### **4. `theme_attempts` Table - ⚠️ NEEDS MODIFICATION**
```sql
Current Structure:
- player_id (TEXT)
- theme (TEXT)
- guess (TEXT)
- is_correct (BOOLEAN)
- attempt_date (DATE)
- words_completed_when_guessed (INTEGER)
- UNIQUE(player_id, theme, attempt_date)
```

**Issues:**
- ⚠️ Constraint allows one guess per theme per day
- ❓ Should archive theme guesses count separately?
- ❓ If player plays archive week, can they guess that theme?

**Decision Needed:**
**Option A:** Allow theme guesses for archive plays (track separately)
**Option B:** Only allow theme guesses for current live week

**Recommendation:** Option A with separate tracking

**Required Changes:**
```sql
ALTER TABLE theme_attempts ADD COLUMN is_archive_attempt BOOLEAN DEFAULT FALSE;
-- Update constraint to allow archive attempts
DROP CONSTRAINT theme_attempts_player_id_theme_attempt_date_key;
ADD CONSTRAINT theme_attempts_unique_per_day 
  UNIQUE(player_id, theme, attempt_date, is_archive_attempt);
```

---

## 🏗️ **PROPOSED ARCHITECTURE**

### **New Database Objects**

#### **1. New Table: `archive_play_stats`**
```sql
CREATE TABLE archive_play_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  word_date DATE NOT NULL, -- The actual date of the word
  played_on TIMESTAMPTZ DEFAULT NOW(), -- When player actually played it
  is_won BOOLEAN NOT NULL,
  guesses_used INTEGER,
  time_taken INTEGER, -- Seconds
  score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(player_id, word_id) -- One archive play per word per player
);

CREATE INDEX idx_archive_stats_player ON archive_play_stats(player_id);
CREATE INDEX idx_archive_stats_word_date ON archive_play_stats(word_date);
CREATE INDEX idx_archive_stats_played_on ON archive_play_stats(played_on);

COMMENT ON TABLE archive_play_stats IS 'Tracks archive play completions separate from live daily stats';
```

#### **2. Modified Trigger: `update_leaderboard_from_game`**
```sql
CREATE OR REPLACE FUNCTION update_leaderboard_from_game()
RETURNS TRIGGER AS $$
BEGIN
  -- CRITICAL: Skip archive plays entirely
  IF NEW.is_archive_play = TRUE THEN
    -- Log archive completion to separate table
    INSERT INTO archive_play_stats (
      player_id,
      word_id,
      game_session_id,
      word_date,
      is_won,
      guesses_used,
      time_taken
    ) VALUES (
      NEW.player_id,
      NEW.word_id,
      NEW.id,
      NEW.game_date,
      NEW.is_won,
      NEW.guesses_used,
      EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))::INTEGER
    )
    ON CONFLICT (player_id, word_id) DO UPDATE
    SET
      is_won = EXCLUDED.is_won,
      guesses_used = EXCLUDED.guesses_used,
      time_taken = EXCLUDED.time_taken;
    
    RETURN NEW; -- Exit early - don't update leaderboard
  END IF;
  
  -- ... existing leaderboard logic for live plays only ...
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### **3. New View: `player_archive_progress`**
```sql
CREATE OR REPLACE VIEW player_archive_progress AS
SELECT 
  p.id AS player_id,
  p.display_name,
  COUNT(DISTINCT aps.word_id) AS total_archive_plays,
  COUNT(DISTINCT CASE WHEN aps.is_won THEN aps.word_id END) AS archive_wins,
  COUNT(DISTINCT aps.word_date) AS unique_dates_played,
  MIN(aps.word_date) AS earliest_word_played,
  MAX(aps.word_date) AS most_recent_word_played,
  ROUND(
    COUNT(DISTINCT CASE WHEN aps.is_won THEN aps.word_id END)::NUMERIC / 
    NULLIF(COUNT(DISTINCT aps.word_id), 0) * 100,
    1
  ) AS archive_win_rate
FROM players p
LEFT JOIN archive_play_stats aps ON p.id = aps.player_id
GROUP BY p.id, p.display_name;

COMMENT ON VIEW player_archive_progress IS 'Summary of player archive play achievements';
```

---

## 🔄 **GAME FLOW MODIFICATIONS**

### **Current Flow (Live Play):**
```
1. User opens app
2. Frontend calls GET /api/word
3. Backend returns TODAY's word
4. Backend creates game_session (date = today)
5. User plays and wins
6. Trigger fires → leaderboard_summary updated
7. Trigger fires → player_streaks updated
8. User sees leaderboard rank + streak
```

### **New Flow (Archive Play):**
```
1. User opens archive calendar
2. User selects past date (e.g., 2024-12-15)
3. Frontend calls GET /api/word?date=2024-12-15&archive=true
4. Backend returns word for that date
5. Backend creates game_session with:
   - is_archive_play = TRUE
   - game_date = 2024-12-15
   - played_on = 2025-01-30 (today)
6. User plays and wins
7. Trigger fires → archive_play_stats updated
8. Trigger SKIPS leaderboard_summary (archive excluded)
9. Trigger SKIPS player_streaks (no streak impact)
10. User sees "Archive Win!" + archive stats
```

---

## 🛠️ **IMPLEMENTATION STEPS**

### **Phase 1: Database Schema Changes** (2-3 hours)

#### **Step 1.1: Modify `game_sessions`**
```sql
-- Migration: 20250130000001_add_archive_play_support.sql

-- Add archive play tracking columns
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS is_archive_play BOOLEAN DEFAULT FALSE;

ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS game_date DATE;

ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS played_on DATE DEFAULT CURRENT_DATE;

-- Backfill existing data (all current plays are live)
UPDATE game_sessions 
SET is_archive_play = FALSE 
WHERE is_archive_play IS NULL;

UPDATE game_sessions gs
SET game_date = w.date
FROM words w
WHERE gs.word_id = w.id AND gs.game_date IS NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_sessions_archive ON game_sessions(is_archive_play);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_date ON game_sessions(game_date);
CREATE INDEX IF NOT EXISTS idx_game_sessions_played_on ON game_sessions(played_on);

-- Add constraint: live plays must match game date
ALTER TABLE game_sessions
ADD CONSTRAINT check_live_play_date
CHECK (
  is_archive_play = TRUE OR 
  game_date IS NULL OR
  game_date::TEXT = played_on::TEXT
);
```

#### **Step 1.2: Create `archive_play_stats`**
```sql
-- (SQL from "Proposed Architecture" section above)
```

#### **Step 1.3: Modify Theme Tracking**
```sql
ALTER TABLE theme_attempts 
ADD COLUMN IF NOT EXISTS is_archive_attempt BOOLEAN DEFAULT FALSE;

-- Update unique constraint
ALTER TABLE theme_attempts 
DROP CONSTRAINT IF EXISTS theme_attempts_player_id_theme_attempt_date_key;

ALTER TABLE theme_attempts
ADD CONSTRAINT theme_attempts_unique_per_context
UNIQUE(player_id, theme, attempt_date, is_archive_attempt);
```

#### **Step 1.4: Update Triggers**
```sql
-- Modify leaderboard trigger (see "Proposed Architecture" section)
-- Modify theme progress functions to handle archive plays
```

---

### **Phase 2: Backend API Changes** (4-6 hours)

#### **Step 2.1: Modify `GET /api/word`**
```typescript
// pages/api/word.ts

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const playerId = (req.headers['player-id'] as string) ?? 'anonymous';
  const requestedDate = req.query.date as string | undefined;
  const isArchive = req.query.archive === 'true';
  
  // Get word for specific date or today
  const targetDate = requestedDate || getTodayDateString();
  const word = await getWordByDate(targetDate);
  
  if (!word) {
    return res.status(404).json({ error: 'No word found for this date' });
  }
  
  // Check if this is truly an archive play
  const today = getTodayDateString();
  const isActuallyArchive = targetDate !== today;
  
  // Create game session with archive flag
  const { data: session, error } = await supabase
    .from('game_sessions')
    .insert({
      player_id: playerId,
      word_id: word.id,
      guesses: [],
      revealed_clues: [],
      clue_status: createDefaultClueStatus(),
      is_complete: false,
      is_won: false,
      start_time: new Date().toISOString(),
      is_archive_play: isActuallyArchive, // ← NEW
      game_date: targetDate,                // ← NEW
      played_on: today                      // ← NEW
    })
    .select('id, start_time')
    .single();
  
  return res.status(200).json({
    word,
    gameId: session.id,
    start_time: session.start_time,
    isArchivePlay: isActuallyArchive, // ← NEW: Tell frontend
    gameDate: targetDate               // ← NEW: Original word date
  });
}
```

#### **Step 2.2: Create `GET /api/archive/available-dates`**
```typescript
// pages/api/archive/available-dates.ts

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get all dates that have words
  const { data: words, error } = await supabase
    .from('words')
    .select('date, word, theme, difficulty')
    .order('date', { ascending: false })
    .lt('date', getTodayDateString()); // Only past dates
  
  if (error) {
    return res.status(500).json({ error: 'Failed to fetch archive dates' });
  }
  
  return res.status(200).json({ dates: words });
}
```

#### **Step 2.3: Create `GET /api/archive/player-progress`**
```typescript
// pages/api/archive/player-progress.ts

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const playerId = req.headers['player-id'] as string;
  
  if (!playerId) {
    return res.status(400).json({ error: 'Player ID required' });
  }
  
  // Get player's archive stats
  const { data, error } = await supabase
    .from('player_archive_progress')
    .select('*')
    .eq('player_id', playerId)
    .single();
  
  if (error && error.code !== 'PGRST116') { // Not found is OK
    return res.status(500).json({ error: 'Failed to fetch archive progress' });
  }
  
  return res.status(200).json({
    totalArchivePlays: data?.total_archive_plays || 0,
    archiveWins: data?.archive_wins || 0,
    uniqueDatesPlayed: data?.unique_dates_played || 0,
    archiveWinRate: data?.archive_win_rate || 0,
    earliestWordPlayed: data?.earliest_word_played,
    mostRecentWordPlayed: data?.most_recent_word_played
  });
}
```

#### **Step 2.4: Modify Theme APIs**
```typescript
// src/game/theme.ts - Update to handle archive theme guesses

export async function submitThemeAttempt(
  playerId: string,
  theme: string,
  guess: string,
  isArchiveAttempt: boolean = false // ← NEW PARAMETER
): Promise<{...}> {
  
  // ... existing validation ...
  
  // Insert theme attempt with archive flag
  const { error: insertError } = await supabase
    .from('theme_attempts')
    .insert({
      player_id: playerId,
      theme,
      guess: guess.trim(),
      is_correct: isCorrect,
      attempt_date: today,
      is_archive_attempt: isArchiveAttempt, // ← NEW
      words_completed_when_guessed: progress.completedWords,
      total_word_guesses: totalWordGuesses,
      similarity_score: guessResult.similarity || null,
      confidence_percentage: guessResult.confidence,
      matching_method: guessResult.method
    });
  
  // ...
}
```

---

### **Phase 3: Frontend Changes** (6-8 hours)

#### **Step 3.1: Create Archive Calendar Component**
```typescript
// client/src/components/ArchiveCalendar.tsx

interface ArchiveCalendarProps {
  onDateSelect: (date: string) => void;
}

export const ArchiveCalendar: React.FC<ArchiveCalendarProps> = ({ onDateSelect }) => {
  const [availableDates, setAvailableDates] = useState<ArchiveDate[]>([]);
  const [playerProgress, setPlayerProgress] = useState<ArchiveProgress | null>(null);
  
  useEffect(() => {
    fetchAvailableDates();
    fetchPlayerProgress();
  }, []);
  
  const fetchAvailableDates = async () => {
    const response = await fetch('/api/archive/available-dates');
    const data = await response.json();
    setAvailableDates(data.dates);
  };
  
  const fetchPlayerProgress = async () => {
    const playerId = getPlayerId();
    const response = await fetch('/api/archive/player-progress', {
      headers: { 'player-id': playerId }
    });
    const data = await response.json();
    setPlayerProgress(data);
  };
  
  return (
    <div className="archive-calendar">
      <h2>Archive Play</h2>
      
      {/* Player archive stats */}
      <div className="archive-stats">
        <p>Archive Wins: {playerProgress?.archiveWins || 0}</p>
        <p>Archive Win Rate: {playerProgress?.archiveWinRate || 0}%</p>
        <p>Dates Played: {playerProgress?.uniqueDatesPlayed || 0}</p>
      </div>
      
      {/* Calendar grid */}
      <div className="calendar-grid">
        {availableDates.map(dateInfo => (
          <ArchiveDateCard
            key={dateInfo.date}
            date={dateInfo.date}
            word={dateInfo.word}
            theme={dateInfo.theme}
            difficulty={dateInfo.difficulty}
            onClick={() => onDateSelect(dateInfo.date)}
          />
        ))}
      </div>
    </div>
  );
};
```

#### **Step 3.2: Modify Game Service**
```typescript
// client/src/services/GameService.ts

public async startArchiveGame(date: string): Promise<GameSessionState> {
  try {
    console.log('[GameService] Starting archive game for date:', date);
    
    const data = await apiClient.getArchiveWord(date);
    
    if (!data.isArchivePlay) {
      throw new Error('Expected archive play but got live game');
    }
    
    // Create state with archive flag
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
  } catch (error) {
    console.error('[GameService] Failed to start archive game:', error);
    throw error;
  }
}
```

#### **Step 3.3: Update UI Components**
```typescript
// client/src/App.tsx - Add archive mode indicator

{gameState.isArchivePlay && (
  <div className="archive-banner">
    📚 Archive Play - {gameState.gameDate}
    <span className="archive-note">
      This won't affect your streak or leaderboard rank
    </span>
  </div>
)}
```

```typescript
// client/src/GameSummaryModal.tsx - Show archive-specific messaging

{isArchivePlay ? (
  <div className="archive-completion">
    <h2>Archive Word Completed! 📚</h2>
    <p className="archive-note">
      You played the word from {gameDate}
    </p>
    <p>This doesn't affect your live stats, but congrats on exploring the archive!</p>
  </div>
) : (
  <div className="live-completion">
    {/* Existing live game completion UI */}
  </div>
)}
```

---

## 📊 **STAT TRACKING SEPARATION**

### **Live Stats (Unchanged)**
- ✅ **Streaks**: Only from consecutive daily live wins
- ✅ **Leaderboards**: Only live plays ranked
- ✅ **Daily themes**: Only current week theme progress
- ✅ **Player rankings**: Based on live performance

### **Archive Stats (New)**
- 📚 **Total archive plays**: Count of words played from past
- 📚 **Archive wins**: Successful archive completions
- 📚 **Archive win rate**: Win percentage in archive mode
- 📚 **Unique dates played**: How many different dates explored
- 📚 **Archive themes**: Theme guesses for past weeks

### **Achievements (Future Enhancement)**
```typescript
// Possible archive achievements:
- "Time Traveler" - Play 7 different archive dates
- "Completionist" - Win all words from a specific month
- "Theme Historian" - Guess 5 archive themes correctly
- "Decade Explorer" - Play words from 10+ different weeks
```

---

## 🎨 **UI/UX CONSIDERATIONS**

### **Navigation**
```
Main App
├── [LIVE] Today's Game (default)
├── [ARCHIVE] Calendar Icon → Archive Browser
│   ├── Calendar view of all past dates
│   ├── Filter by: month, difficulty, theme
│   ├── Show completion status (✓ won, ✗ lost, — not played)
│   └── Archive stats dashboard
└── [SETTINGS] Leaderboard, Stats, Profile
```

### **Visual Distinction**
- **Live Play**: Green header, "Daily Word" label
- **Archive Play**: Blue/Purple header, "Archive: [Date]" label
- **Completion**: Different colors/messaging for live vs archive

### **Theme Guessing in Archive**
```
If playing archive word with theme:
┌─────────────────────────────────────┐
│ 📚 Archive Theme (Week of Jan 1)   │
│                                     │
│ Theme: [hidden]                     │
│                                     │
│ You completed 3/7 words from this   │
│ week. Want to guess the theme?      │
│                                     │
│ Note: This is an archive theme      │
│ guess and won't affect your weekly  │
│ theme stats.                        │
│                                     │
│ [Guess Theme] [Skip]                │
└─────────────────────────────────────┘
```

---

## ⚠️ **CRITICAL DECISIONS NEEDED**

### **Decision 1: Can players replay words they've already completed?**

**Option A: Allow replays** ⭐ RECOMMENDED
- Players can replay ANY word (even if completed before)
- Only FIRST completion counts for archive stats
- Subsequent replays tracked but don't overwrite

**Option B: One play per word**
- Players can only play each word once (live OR archive)
- Simpler logic, clearer stats
- Less flexibility for practice

**Recommendation:** Option A - Let players practice/retry

---

### **Decision 2: Should archive plays have separate leaderboards?**

**Option A: No archive leaderboards**
- Simpler implementation
- Archive is "for fun" only
- Focus on live competition

**Option B: Separate archive leaderboards** ⭐ RECOMMENDED
- "All-time archive leaderboard" (total archive wins)
- "Archive speed run" (fastest archive completions)
- Adds engagement for archive mode
- Doesn't interfere with live leaderboards

**Recommendation:** Option B - Phase 2 enhancement

---

### **Decision 3: What about incomplete live games?**

**Scenario:** Player starts today's word, doesn't finish, comes back tomorrow.

**Current Behavior:** Game persists via localStorage, can still complete

**Archive Impact:**
- If tomorrow, yesterday's incomplete game becomes "archive"?
- Or: Live games stay live until abandoned?

**Recommendation:** 
- Incomplete live games stay live for 24 hours
- After 24 hours, auto-complete as loss (to preserve streak logic)
- Player can restart as archive play

---

## 🚀 **ROLLOUT PLAN**

### **Phase 1: MVP (Week 1) - 12-16 hours**
- ✅ Database schema changes
- ✅ Backend API modifications
- ✅ Basic archive calendar UI
- ✅ Archive play flow (no theme support yet)
- ✅ Stat separation (live vs archive)

**Deliverables:**
- Players can select and play past dates
- Archive wins tracked separately
- Live stats unaffected

---

### **Phase 2: Theme Support (Week 2) - 6-8 hours**
- ✅ Archive theme guessing
- ✅ Past theme progress tracking
- ✅ Archive theme stats display

**Deliverables:**
- Players can guess themes for archive weeks
- Archive theme attempts tracked separately

---

### **Phase 3: Enhanced Features (Week 3+) - 10-12 hours**
- ✅ Archive leaderboards (all-time, speed runs)
- ✅ Archive achievements system
- ✅ Advanced filters (difficulty, theme, completion status)
- ✅ "Random archive word" feature
- ✅ Archive stats dashboard

**Deliverables:**
- Full-featured archive mode with gamification

---

## 🧪 **TESTING CHECKLIST**

### **Critical Tests:**
- [ ] Playing archive word doesn't affect live streak
- [ ] Playing archive word doesn't appear on live leaderboard
- [ ] Playing today's word still counts as live
- [ ] Archive theme guesses tracked separately
- [ ] Archive stats accumulated correctly
- [ ] Replaying same archive word updates stats appropriately
- [ ] Live game → archive game → live game transitions work
- [ ] Archive play completion shows correct messaging

### **Edge Cases:**
- [ ] Player starts live game, doesn't finish, tries archive play
- [ ] Player plays archive word, then that word becomes "today's word"
- [ ] Player guesses theme for current week, then plays archive from same theme week
- [ ] Multiple archive plays in same session
- [ ] Archive play while live game incomplete

---

## 📈 **SUCCESS METRICS**

### **Usage Metrics:**
- % of players who try archive mode
- Average archive plays per player
- Archive completion rate
- Most popular archive dates/words

### **Engagement Metrics:**
- Player retention (does archive increase daily returns?)
- Total games played (live + archive)
- Time spent in app (archive mode session duration)

### **Quality Metrics:**
- Zero stats corruption (live stats remain accurate)
- Zero streak/leaderboard bugs
- Player satisfaction (feedback/ratings)

---

## 🎯 **IMMEDIATE NEXT STEPS**

1. **Make Critical Decisions** (you and team)
   - Decide on replay policy (Option A or B?)
   - Decide on archive leaderboards (Option A or B?)
   - Decide on incomplete game handling

2. **Create Migration Files** (1-2 hours)
   - Write SQL migrations for Phase 1
   - Test migrations on staging DB
   - Document rollback procedures

3. **Update API Contracts** (1 hour)
   - Define TypeScript types for archive mode
   - Update API documentation
   - Share contracts with frontend team

4. **Build MVP** (12-16 hours)
   - Implement Phase 1 backend
   - Implement Phase 1 frontend
   - Test thoroughly

5. **Deploy to Preview** (2 hours)
   - Deploy theme-improvements + archive-play branch
   - Validate in preview environment
   - Gather initial feedback

---

**Last Updated:** January 2025  
**Status:** 📋 Ready for Implementation  
**Next Milestone:** Phase 1 MVP (Week 1)

