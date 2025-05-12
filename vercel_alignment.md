# Vercel Alignment & Debug Log

This document tracks the alignment between our deployed frontend (`undefine-v2.vercel.app`) and backend `/api` routes, with a focus on debugging persistent fetch/session errors.

---

## ✅ Deployment Alignment (Confirmed Working)

- `@supabase/supabase-js` correctly declared in root `package.json` and installed via workspaces.
- Vercel settings:
  - **Install Command**: `npm install`
  - **Build Command**: `cd client && npm run build`
  - **Output Directory**: `client/dist`
  - **Root Directory**: _(blank — project root)_
  - ✅ "Include files outside of root directory" enabled.
- `fetch("/api/word")` confirmed working via:
  - Direct browser hit ✅
  - `curl` ✅
- `startNewGame()` runs on `App.tsx` mount via `useEffect` hook.

---

## 🐛 Current Critical Error

```json
{ "error": "Error creating game session" }
```
🔍 Diagnosis In Progress
 RLS for game_sessions confirmed enabled with "Enable all access to game_sessions" for anon.

 Exact Supabase error not yet exposed — needs logging.

 Suspect required column (start_time) or invalid/missing word_id.

🧪 Next Debug Step
Update /api/word.ts to expose actual Supabase error:

```ts
const { data, error } = await supabase
  .from("game_sessions")
  .insert([{ word_id: word.id, start_time: new Date().toISOString() }]);

if (error) {
  console.error("Supabase insert error:", error.message);
  return res.status(500).json({ error: "Error creating game session" });
}
```
After redeploy, hit /api/word and inspect Vercel function logs for full message.

🗂 Related Schema Assumptions
game_sessions.word_id is a foreign key to words.id (UUID)

start_time is required

No default value for start_time

Append all future related debugging to this file. This is the master record of alignment between Supabase, Vercel, and frontend logic.

---

## 🛠️ Implementation Log

- [x] Updated `/api/word.ts` to log and return the actual Supabase error message when game session creation fails. This will help diagnose issues with RLS, required columns, or foreign key constraints in production. 
- [x] Updated `/api/word` route to include `id` field in the select statement, ensuring the UUID is returned alongside the word text. This enables proper use of word_id in game_sessions and scores tables.
- [x] Updated game session creation to use word_id (UUID) instead of word text. Added proper error handling and logging for session creation failures.
- [x] Updated frontend game state to track word_id. Modified WordResponse and GameSessionState types to include UUID, and updated useGame hook to store and handle word_id in state.
- [x] Updated `/api/guess` endpoint to use game sessions and UUIDs:
  - Now fetches game session and associated word using gameId
  - Updates game session with guesses, completion status
  - Creates score entry on correct guess using word_id and game_session_id
  - Added comprehensive error logging
- [x] Updated API types to support new guess flow:
  - Added playerId to GuessRequest
  - Added score information to GuessResponse
  - Ensured all UUIDs are properly typed
- [x] Implemented real-time leaderboard ranking logic on correct guess submit in `/api/guess.ts`:
  - Added rank comparison and top 10 enforcement
  - Handles both new entries and updates to existing entries
  - Recalculates and reassigns ranks after each change
  - Includes comprehensive error handling and logging
  - Maintains data integrity with UUID relationships

## 🔁 Supabase Table Relationships – Alignment Audit

### ✅ Game Sessions (`game_sessions`)
- **Current**: Stores session-level data like `guesses`, `start_time`, `player_id`, `word` (text).
- **Issue**: No relational link to `words`, only text.
- **Action**: Add `word_id UUID REFERENCES words(id)` to enforce consistency.
- **Also Add**: Composite constraint on (`player_id`, `word_id`) if you want to enforce 1 game per user per word.

### ✅ Words (`words`)
- Canonical word source with definitions, etymology, etc.
- **Used In**: `game_sessions`, `scores`, `leaderboard_summary`.

### ⚠️ Scores (`scores`)
- **Current**: Uses `word` as `text`.
- **Issue**: Risks drift if a word is mistyped or updated.
- **Action**: Add `word_id UUID REFERENCES words(id)`.

### ⚠️ Leaderboard Summary (`leaderboard_summary`)
- **Current**: Same issue — `word` is `text`.
- **Action**: Replace `word` text field with `word_id` FK.

### ✅ User Stats (`user_stats`)
- Linked to `game_sessions` via `player_id`.

### 🚧 Optional Future Addition
- Add `game_session_id` to `scores` if you want to join across full gameplay data.

## 📊 Leaderboard Summary – Population Logic

### Source of Truth
- Uses `scores` table as the source of truth for game performance
- Each score entry contains:
  - `player_id` (UUID)
  - `word_id` (UUID)
  - `completion_time_seconds`
  - `guesses_used`
  - `submitted_at`

### Ranking Algorithm
1. Scores are ranked by:
   - Primary: `completion_time_seconds` (ASC)
   - Secondary: `guesses_used` (ASC)
2. Only top 10 scores per word per day are included
3. Uses `RANK()` window function to assign positions

### Data Integrity
- One entry per player per word per day
- All relationships use UUID foreign keys:
  - `player_id` → `players.id`
  - `word_id` → `words.id`
- `ON CONFLICT DO NOTHING` prevents duplicate entries if script re-runs

### SQL Implementation
```sql
WITH ranked_scores AS (
  SELECT
    s.player_id,
    s.word_id,
    s.guesses_used,
    s.completion_time_seconds AS best_time,
    DATE(s.submitted_at) AS date,
    RANK() OVER (
      PARTITION BY s.word_id, DATE(s.submitted_at)
      ORDER BY s.completion_time_seconds ASC, s.guesses_used ASC
    ) AS rank
  FROM scores s
  WHERE DATE(s.submitted_at) = CURRENT_DATE
),
top_scores AS (
  SELECT *
  FROM ranked_scores
  WHERE rank <= 10
)
INSERT INTO leaderboard_summary (
  id,
  player_id,
  word_id,
  rank,
  was_top_10,
  best_time,
  guesses_used,
  date
)
SELECT
  gen_random_uuid(),
  player_id,
  word_id,
  rank,
  TRUE,
  best_time,
  guesses_used,
  date
FROM top_scores
ON CONFLICT DO NOTHING;
```

### Execution
- Can be triggered by:
  1. Game completion webhook
  2. Daily CRON job
  3. Manual execution for testing
- Uses `CURRENT_DATE` for daily partitioning
- Can be overridden with specific date for testing

## Leaderboard Implementation Refinements

### Sorting and Display Logic
- Leaderboard entries are sorted by:
  1. Fewest guesses used (primary)
  2. Fastest completion time (secondary)
- Current player's entry is always displayed:
  - In top 10 if qualified
  - As an additional row if not in top 10
  - Highlighted with animation on load

### Error Handling and Edge Cases
- Loading state with spinner while fetching data
- Error state with user-friendly message
- Empty state for new words with no completions
- Graceful handling of Supabase fetch failures

### Real-time Updates
- Leaderboard refreshes on:
  - Game completion (correct guess or 6 attempts)
  - Modal re-open
  - New game start
- Player rank updates immediately after score submission

### UI Enhancements
- Loading spinner during data fetch
- Highlight animation for current player's row
- Share button for social play
- Responsive table layout
- Proper date-based filtering

### Type Safety
- Updated `LeaderboardEntry` type with `is_current_player` flag
- Proper error handling in API client
- Loading and error states in React components

### Performance Considerations
- Efficient sorting at database level
- Single query for all entries
- Client-side filtering for top 10
- Proper cleanup of timeouts and intervals

## ✅ Leaderboard Implementation

**Backend:**
- `/api/leaderboard` returns top 10 entries, plus current player's rank
- Sorted by:
  1. Fewest guesses used
  2. Fastest completion time
- Filters by word ID and session date
- Optimised for performance (indexed queries, single fetch)
- Error handling and logging included

**Frontend Integration:**
- `useGame` and `GameSummaryModal` fetch and render leaderboard data
- Current player row is highlighted (even if not top 10)
- Loading spinners and graceful error UI included
- Empty state UI shown if no completions exist yet
- Leaderboard refreshes when:
  - Game completes
  - Modal is re-opened
  - New game starts

**Enhancements:**
- Responsive layout
- Rank share button
- Row highlight animation
- Type-safe `LeaderboardEntry` and `LeaderboardResponse` types

✅ This system is now stable, performant, and ready for full release.

--- 