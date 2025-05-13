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

## Game Session Clue Status

### Structure and Initialization
- `clue_status` is initialized with a default structure matching game logic:
  ```typescript
  {
    D: false, // Definition (always shown)
    E: false, // Equivalents (after 1st incorrect guess)
    F: false, // First Letter (after 2nd incorrect guess)
    I: false, // In a Sentence (after 3rd incorrect guess)
    N: false, // Number of Letters (after 4th incorrect guess)
    E2: false // Etymology (after 5th incorrect guess)
  }
  ```

### Why It's Needed
- Supabase enforces a NOT NULL constraint on `clue_status`
- Prevents null/undefined errors in frontend clue logic
- Ensures consistent state tracking across game sessions
- Matches the progressive clue reveal system

### Integration with Game Logic
- Frontend uses this structure to:
  - Track which clues have been revealed
  - Determine when to show new clues
  - Maintain game state persistence
- Updates occur after each incorrect guess
- State is preserved in game session for resuming games

## Environment Variables & Supabase Configuration

### Frontend Variables (Vite)
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Public anon key for client-side operations

### Backend Variables (Vercel)
- `VITE_SUPABASE_URL`: Same as frontend (shared)
- `SUPABASE_SERVICE_ROLE_KEY`: Private service role key for server-side operations

### Usage Guidelines
- Frontend code uses `VITE_` prefixed variables with anon key
- Backend API routes use service role key for elevated privileges
- Never expose service role key in frontend code
- Maintain consistent `VITE_` prefix for shared variables

### Vercel Configuration
- Environment variables must be set in Vercel project settings
- Service role key is only available in serverless functions
- Frontend build uses Vite's environment variable system

## API Routes

### Environment Variables
- All API routes use `VITE_SUPABASE_URL` for the Supabase project URL
- Server-side operations use `SUPABASE_SERVICE_ROLE_KEY` for elevated privileges
- No API routes should use the anon key (`VITE_SUPABASE_ANON_KEY`)

### Available Routes
1. `/api/word` (GET)
   - Fetches today's word and creates a new game session
   - Uses service role key for session creation

2. `/api/guess` (POST)
   - Handles guess submission and game state updates
   - Uses service role key for leaderboard and stats updates

3. `/api/leaderboard` (GET)
   - Retrieves leaderboard data for a specific word
   - Uses service role key for full leaderboard access

4. `/api/streak-status` (POST)
   - Fetches player's streak information
   - Uses service role key for stats access

5. `/api/dev/reset-session` (POST)
   - Development-only route for resetting game sessions
   - Uses service role key for session management

### Security Considerations
- Service role key is only used in server-side API routes
- All routes validate request methods and required parameters
- Development routes are protected in production

## Supabase Environment Key Usage

| Route            | Access Type | Key Used                    | Notes                                |
|------------------|-------------|-----------------------------|--------------------------------------|
| /api/word        | WRITE       | SUPABASE_SERVICE_ROLE_KEY   | Needs to bypass RLS to create session|
| /api/guess       | WRITE       | SUPABASE_SERVICE_ROLE_KEY   | Writes score + completion            |
| /api/leaderboard | READ        | VITE_SUPABASE_ANON_KEY      | SELECT-only, safe via RLS            |
| /api/streak-status| READ       | VITE_SUPABASE_ANON_KEY      | SELECT-only, safe via RLS            |
| /api/dev/reset-session | WRITE | SUPABASE_SERVICE_ROLE_KEY | Dev-only, needs full access          |

### Security Considerations
- Service role key (`SUPABASE_SERVICE_ROLE_KEY`) should only be used when:
  - Creating or updating game sessions
  - Writing scores and leaderboard entries
  - Performing dev operations
- Anon key (`VITE_SUPABASE_ANON_KEY`) is sufficient for:
  - Reading leaderboard data
  - Fetching user stats
  - Any SELECT-only operations
- Minimizing service role key usage reduces security risk and blast radius
- All tables should have proper RLS policies to restrict anon key access

### Type Safety
- All API routes use TypeScript types from `next`
- Request/response types are properly defined
- Optional chaining and nullish coalescing used for safety
- Buffer handling for request body parsing

## API Type Safety Improvements

### Type Definitions
- All `/api/` routes now use proper `NextApiRequest` and `NextApiResponse` typings
- Added explicit interfaces for request/response types:
  - `GuessRequest` and `GuessResponse` for `/api/guess`
  - `ResetRequest` and `ResetResponse` for `/api/dev/reset-session`
  - `StreakResponse` for `/api/streak-status`

### Request Body Handling
- Added type-safe request body parsing with explicit interfaces
- Proper Buffer handling for request body chunks
- Type assertions for JSON parsed data
- Nullish coalescing for safe defaults

### Error Handling
- Consistent error response types across all routes
- Type-safe error messages and status codes
- Proper error propagation from Supabase operations

### Development Setup
- Installed and configured `@types/next` for improved linting
- Added proper TypeScript configuration for API routes
- Improved developer experience with better type inference

### Security
- Type-safe environment variable access
- Proper null checks for required fields
- Safe handling of optional parameters

## ✅ Final API Type System Audit

- All types consolidated in `types/api.ts`
  - Common response types (`ErrorResponse`, `ApiResponse`)
  - Request/response interfaces for all endpoints
  - Shared types for game sessions and leaderboard
  - Proper null/undefined handling with type guards

- All API routes explicitly typed with Next.js interfaces
  - Using `NextApiRequest` and `NextApiResponse`
  - Consistent error handling across all routes
  - Type-safe request body parsing
  - Proper response type definitions

- Interfaces include proper null/undefined guards
  - Optional fields marked with `?`
  - Nullable fields use union with `null`
  - Default values provided where appropriate
  - Type assertions only used when safe

- Full lint pass completed — zero warnings or errors
  - All implicit any types resolved
  - Unused variables removed
  - Consistent return types
  - Proper error handling

- API routes are now production-ready with full type coverage
  - Type-safe database operations
  - Consistent error responses
  - Proper request validation
  - Secure environment variable usage

## ✅ TypeScript Path Resolution

- `types/api.ts` added and path-alias configured via `tsconfig.json`
  - Added `baseUrl` and `paths` configuration
  - All API routes now use `types/api` import path
  - Consistent type imports across all routes

- Linter and build pass successfully
  - No remaining TypeScript errors
  - All imports resolve correctly
  - Type safety maintained across API routes

- All `/api/*` routes now import types via `types/api`
  - Consistent import pattern
  - No relative path imports needed
  - Better maintainability

- No remaining TypeScript errors
  - Full type coverage
  - Proper null/undefined handling
  - Consistent error responses

## API Connection Strategy

### Base URL Logic
- The application uses a dynamic base URL system that adapts to both local development and production environments
- Base URL is controlled by the `NEXT_PUBLIC_API_BASE_URL` environment variable
- In production (Vercel), the variable is not set, defaulting to an empty string, which results in relative paths
- In local development, it defaults to `http://localhost:3001` if not set

### Why Relative Paths in Production
- Vercel serverless functions are deployed to the same domain as the frontend
- Using relative paths ensures API calls work regardless of the deployment domain
- Eliminates the need for CORS configuration
- Simplifies deployment and environment management

### Why No Hardcoded Localhost
- Hardcoded localhost URLs break in production
- Makes the application environment-dependent
- Complicates testing and deployment
- Can lead to security issues if accidentally deployed

### Updated API Routes
| Route | Status | Notes |
|-------|--------|-------|
| `/api/word` | ✅ Updated | Uses `fetchFromApi` wrapper |
| `/api/guess` | ✅ Updated | Uses `fetchFromApi` wrapper |
| `/api/leaderboard` | ✅ Updated | Uses `fetchFromApi` wrapper |
| `/api/streak-status` | ✅ Updated | Uses `fetchFromApi` wrapper |
| `/api/dev/reset-session` | ✅ Updated | Uses `fetchFromApi` wrapper |

### Type Safety
- All API responses are typed using interfaces from `types/api.ts`
- The `fetchFromApi` wrapper ensures type safety through generics
- Error handling is standardized across all API calls

## Word-of-the-Day System

### `/api/word` Endpoint

The `/api/word` endpoint is responsible for fetching the word-of-the-day and creating a new game session. It follows these steps:

1. **Date Handling**:
   - Uses UTC-based date calculation to ensure consistent word selection across timezones
   - Formats date as `YYYY-MM-DD` using `Date.UTC()` for database queries
   - Example: `2024-03-20` for March 20, 2024 UTC

2. **Word Selection Logic**:
   - Primary: Fetches word matching today's UTC date from `words` table
   - Query: `.eq('date', todayUTC)` to ensure exact date match
   - Fallback: In development only, falls back to random word if date match fails
   - Error Handling: Returns 500 if word fetch fails in production

3. **Game Session Creation**:
   - Creates new session in `game_sessions` table
   - Links session to selected word via `word_id`
   - Initializes `clue_status` with all clues hidden
   - Returns both word data and `gameId` to frontend

4. **Response Structure**:
   ```typescript
   {
     word: {
       id: string;
       word: string;
       definition: string;
       first_letter: string;
       in_a_sentence: string;
       equivalents: string[];
       number_of_letters: number;
       etymology: string;
       difficulty: number;
       date: string;
     };
     gameId: string;
   }
   ```

5. **Environment-Specific Behavior**:
   - Production: Always uses date-based word selection
   - Development: Falls back to random word if date match fails
   - Logging: Includes detailed error logging for debugging

### Local Testing
- Development mode (`NODE_ENV === 'development'`) enables fallback to random word
- Useful for testing without setting up daily words
- Logs warning when falling back to random word
- Maintains production-like behavior for game sessions and scoring

### Production Behavior
- Strictly enforces date-based word selection
- No fallback to random words
- Ensures all players get the same word each day
- Maintains game fairness and leaderboard integrity

## API Base URL Configuration

### Environment Variables
- `NEXT_PUBLIC_API_BASE_URL` controls API endpoint base URL
- In production (Vercel): Not set, defaults to empty string
- In development: Set to `http://localhost:3001` in `.env.local`

### Configuration by Environment
| Environment | NEXT_PUBLIC_API_BASE_URL | Result |
|-------------|--------------------------|---------|
| Production  | Not set                  | Uses relative paths (e.g., `/api/word`) |
| Development | `http://localhost:3001`  | Uses full URL (e.g., `http://localhost:3001/api/word`) |

### Implementation Details
- `fetchFromApi` wrapper in `apiClient.ts` handles base URL logic
- Vite dev server proxy configured to handle relative paths in development
- No CORS configuration needed in production
- Type-safe API calls with proper error handling

### Best Practices
- Never hardcode localhost URLs in production code
- Use relative paths in production for same-origin requests
- Configure Vite proxy for local development
- Maintain consistent error handling across environments

--- 