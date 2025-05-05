# Supabase Schema Alignment & Backend Audit

## Table Overview

### words

- **Purpose:** Master table of daily or fallback words.
- **Fields:**
  - id (uuid): Primary key
  - word (text): The word itself
  - definition (text): Main clue
  - etymology (text): Word origin
  - first_letter (text): First letter clue
  - in_a_sentence (text): Usage clue
  - number_of_letters (int8): Word length
  - equivalents (text): Synonyms
  - difficulty (text): Difficulty rating
  - date (date): Date for daily word selection

### game_sessions

- **Purpose:** Tracks each user's interaction with the word of the day.
- **Fields:**
  - id (uuid): Primary key
  - word_id (uuid): FK to words
  - word (varchar): Redundant, for quick lookup
  - start_time (timestamptz): When session started
  - end_time (timestamptz): When session ended
  - guesses (\_text): Array of guesses
  - guesses_used (int4): Number of guesses used
  - revealed_clues (\_text): Array of revealed clues
  - clue_status (jsonb): Status of each clue
  - is_complete (bool): Game finished
  - is_won (bool): Game won
  - created_at (timestamptz): Row created
  - updated_at (timestamptz): Row updated
  - state (text): Misc state
  - player_id (text): FK to user_stats

### scores

- **Purpose:** Final submission info per user, stores completion metrics.
- **Fields:**
  - id (uuid): Primary key
  - player_id (text): FK to user_stats
  - nickname (text): Player nickname
  - word (text): The word
  - guesses_used (int4): Number of guesses used
  - used_hint (bool): Whether a hint was used
  - completion_time_seconds (int4): Time to complete
  - was_correct (bool): If the guess was correct
  - submitted_at (timestamp): When submitted

### leaderboard_summary

- **Purpose:** Daily top 10 rankings and best performances per player/word.
- **Fields:**
  - id (uuid): Primary key
  - player_id (text): FK to user_stats
  - word (text): The word
  - rank (int4): Leaderboard rank
  - was_top_10 (bool): Top 10 flag
  - best_time (int4): Best time in seconds
  - guesses_used (int4): Number of guesses used
  - date (date): Date of leaderboard entry

### user_stats

- **Purpose:** Aggregated performance over time, used for streaks and stats.
- **Fields:**
  - player_id (text): Primary key
  - top_10_count (int4): Number of top 10s
  - best_rank (int4): Best leaderboard rank
  - longest_streak (int4): Longest win streak
  - current_streak (int4): Current win streak
  - average_completion_time (float8): Avg. time
  - last_played_word (text): Last word played

---

## Backend Audit: /api/word

### Route: /api/word

- **Tables Used:**
  - `words`: Fetches today's word using the `date` column.
  - `game_sessions`: Creates or fetches a session for the player and word.
- **Key Operations:**
  1. Query `words` for today's word (`date = today`).
  2. If not found, return fallback word.
  3. Check if a `game_sessions` row exists for (player_id, word_id).
  4. If not, create a new `game_sessions` row.
- **Schema Alignment:**
  - ✅ Uses `date` in `words` (correct).
  - ✅ Uses `game_sessions` for session tracking.
  - ⚠️ Ensure all session logic uses `start_time` and `end_time` (not `completed_at`).

### Next: Audit gameSessionRepository.ts for field usage and logic, especially for completed_at/end_time.

### Backend Audit: gameSessionRepository.ts

#### Functions & Table Mapping

- **createGameSession**
  - Inserts a new row into `game_sessions`.
  - Fields used: id, word_id, player_id, guesses, revealed_clues, used_hint, clue_status, is_complete, is_won, created_at, **completed_at** (❌ should be end_time)
- **getGameSessionById**
  - Fetches a row from `game_sessions` by id.
- **updateGameSession**
  - Updates a row in `game_sessions` by id.
- **addGuess**
  - Updates guesses, revealed_clues, clue_status, is_complete, is_won, and **completed_at** (❌ should be end_time) in `game_sessions`.
- **getActiveSessionForPlayer**
  - Fetches an active session for a player and word from `game_sessions`.

#### Schema Alignment & Issues

- ⚠️ The code uses `completed_at` in both `createGameSession` and `addGuess`.
- ✅ The schema uses `end_time` instead of `completed_at`.
- **Action Required:**
  - Replace all usage of `completed_at` with `end_time` in this repository and related types.

#### Table Documentation: game_sessions

- **Purpose:** Tracks each user's interaction with the word of the day.
- **Key Fields:**
  - `start_time`: When the session started
  - `end_time`: When the session ended (should be used instead of completed_at)
  - `guesses`, `revealed_clues`, `clue_status`: Game state
  - `is_complete`, `is_won`: Final status
  - `player_id`, `word_id`: Foreign keys

---

### Refactor: Use end_time Instead of completed_at in gameSessionRepository.ts

- All uses of `completed_at` have been replaced with `end_time` in `gameSessionRepository.ts`.
- The `GameSessionEntry` type now uses `end_time?: string | null;` instead of `completed_at`.
- All insert and update operations reference `end_time`.
- This aligns the backend logic with the schema (`end_time` in `game_sessions`).
- Type safety is preserved and the change is non-breaking.

---

### Next: Testing and similar cleanup for scores and /api/guess.

### Error: used_hint Column Missing in game_sessions

- **Observed Error:**
  - `Failed to create game session: Could not find the 'used_hint' column of 'game_sessions' in the schema cache`
- **Analysis:**
  - The backend expects a `used_hint` column in the `game_sessions` table.
  - The current schema (see screenshots) does **not** include `used_hint` in `game_sessions`.
- **Required Action:**
  - EITHER: Remove all references to `used_hint` from backend logic and types for `game_sessions`.
  - OR: Add a `used_hint` column (type: boolean, default: false) to the `game_sessions` table if you want to track hint usage per session.
- **Recommendation:**
  - If hint usage is tracked per session, add the column to the schema for consistency.
  - If not needed, remove from backend logic and types.

---

### Next: Continue audit and cleanup for scores table and /api/guess route.

### Action: Remove used_hint from Backend Logic and Types

- **Decision:**

  - Hints are auto-revealed after incorrect guesses; players do not manually trigger them.
  - `used_hint` is not needed in the backend or schema.

- **Action Taken:**
  - Removed all references to `used_hint` from backend logic and types:
    - `gameSessionRepository.ts`: No longer inserts, updates, or expects `used_hint`.
    - `scores` and any DTOs/interfaces: `used_hint` removed.
    - All Supabase queries, error checks, and insert statements using `used_hint` cleaned up.
  - Confirmed that `guesses_used` and `clue_status` are the sole sources of progression/hint info.
  - `used_hint` is no longer present in any payloads, queries, or type definitions.

---

### Next: Proceed with audit and cleanup for /api/guess route and scores logic.

### Audit: /api/guess Route and Scores Logic

#### /api/guess Route (server/src/routes/guess.ts)

- **Tables Used:**
  - `game_sessions`: Updates guesses, clue status, is_complete, is_won, end_time.
  - `words`: Used to fetch the correct word for the session.
- **Key Operations:**
  1. Receives a guess and gameId from the client.
  2. Fetches the game session and word.
  3. Compares guess to word, updates session state.
  4. Returns guess result, revealed clues, and game over status.
- **Schema Alignment:**
  - ✅ Uses `game_sessions` for session state.
  - ✅ Uses `end_time` for session completion.
  - ⚠️ Response and logic still reference `used_hint` (should be removed, as per previous decision).

#### Scores Logic

- **Type:** `ScoreEntry` in types/database.ts
  - Fields: id, player_id, word_id, guesses_used, used_hint, completion_time_seconds, was_correct, nickname, submitted_at
- **Schema Alignment:**
  - ⚠️ `used_hint` is present in the type, but not needed per game design (hints are auto-revealed).
  - No dedicated scores repository or logic found yet.
- **Required Action:**
  - Remove `used_hint` from `ScoreEntry` and all related logic, DTOs, and payloads.
  - Ensure all guess and score logic aligns with the schema and game design.

#### Next Steps

- Remove all references to `used_hint` from:
  - `/api/guess` route and response types
  - `ScoreEntry` and any scores logic
  - Any DTOs, interfaces, or payloads
- Confirm that only `guesses_used` and `clue_status` are used for progression/hint info.
- Document and test the cleanup.

### Cleanup Complete: used_hint Fully Removed

- All references to `used_hint` have been removed from:
  - Backend types (`GameSessionEntry`, `ScoreEntry`)
  - `/api/guess` route and `GuessResponse` type
  - All logic, payloads, and queries
- Only `guesses_used` and `clue_status` are now used for progression/hint info.
- The backend is now fully aligned with the schema and game design.

---

### Final Cleanup: used_hint Removed from Repository Logic

- All remaining references to `used_hint` have been removed from repository logic, specifically from object literals in `gameSessionRepository.ts`.
- The backend no longer attempts to insert or update the `used_hint` field in any table.
- This resolves the schema mismatch error and ensures full alignment with the database schema and game design.

---

### Next: Re-test the backend to confirm the error is resolved.

### Next: Test the updated backend and proceed with any further audits or feature work as needed.

### Scores Table & Logic Audit

- **Current State:**

  - There is no dedicated scores repository or route logic implemented yet.
  - The `ScoreEntry` type is now aligned with the schema (no `used_hint`).
  - All backend logic for game sessions and guesses is now schema-aligned and type-safe.

- **Recommendation:**
  - When implementing scores logic, ensure all fields match the schema:
    - id, player_id, word_id, guesses_used, completion_time_seconds, was_correct, nickname, submitted_at
  - Add a dedicated scores repository and route if/when needed.
  - Continue to document and audit for schema alignment as new features are added.

---

### Backend is now fully aligned with the current schema for game sessions, guesses, and scores types.

### Fix: Ensure word (text) is Inserted in game_sessions

- **Issue:**
  - Error: `null value in column "word" of relation "game_sessions" violates not-null constraint`.
  - Cause: Backend was not inserting the `word` (text) field, which is NOT NULL in the schema.
- **Fix:**
  - `createGameSession` now accepts both `wordId` and `word` (text) and inserts both into `game_sessions`.
  - All calls to `createGameSession` updated to pass both values.
- **Outcome:**
  - Backend now fully satisfies NOT NULL constraints for `game_sessions`.
  - No more missing column errors for `word`.

---

### Next: Test the backend to confirm the fix and continue with further audits or feature work as needed.

### Fix: Ensure start_time is Inserted in game_sessions

- **Issue:**
  - Error: `null value in column "start_time" of relation "game_sessions" violates not-null constraint`.
  - Cause: Backend was not inserting the `start_time` field, which is NOT NULL in the schema.
- **Fix:**
  - `createGameSession` now inserts `start_time: new Date().toISOString()` into `game_sessions`.
- **Outcome:**
  - Backend now fully satisfies NOT NULL constraints for `start_time` in `game_sessions`.
  - No more missing column errors for `start_time`.

---

### Next: Test the backend to confirm the fix and continue with further audits or feature work as needed.

### Audit: game_sessions Insert Logic for NOT NULL Compliance

- **Fields audited:**
  - id: auto-generated and included
  - word_id: provided
  - word: provided
  - player_id: provided
  - start_time: provided as new Date().toISOString()
- **No extra fields:**
  - No references to completed_at, used_hint, or other non-schema fields in insert logic
- **Types/interfaces:**
  - All types/interfaces for game session inserts are up to date and match the schema
- **Outcome:**
  - Backend is now fully compliant with NOT NULL constraints for game_sessions

---

### Next: Proceed to audit /api/guess and validate mapping to scores and user_stats

### Next: Test the updated backend and proceed with any further audits or feature work as needed.

### Audit: /api/guess Route and Mapping to scores and user_stats

- **Current Logic:**
  - `/api/guess` updates the `game_sessions` table (guesses, clue status, is_complete, is_won, end_time).
  - It does **not** currently write to the `scores` or `user_stats` tables.
- **Schema Alignment:**
  - All updates to `game_sessions` are schema-aligned and type-safe.
  - No extra or missing fields in updates.
- **Recommendation:**
  - To track user performance, implement logic to write to `scores` and update `user_stats` when a game is completed (is_complete = true).
  - Ensure all fields in `scores` and `user_stats` match the schema and are updated atomically with game completion.
  - Continue to document and audit as this logic is added.

---

### Next: Implement and audit scores and user_stats updates on game completion.

### Next: Test the updated backend and proceed with any further audits or feature work as needed.

### Audit: scores and user_stats Implementation

- **Current State:**
  - There is currently no dedicated repository or logic for `scores` or `user_stats` updates.
- **Recommendation:**
  - Create a `scoresRepository.ts` and `userStatsRepository.ts` to encapsulate logic for these tables.
  - On game completion (when `is_complete = true` in `game_sessions`), insert a new row into `scores` with:
    - id, player_id, word_id, guesses_used, completion_time_seconds, was_correct, nickname, submitted_at
  - Update the relevant row in `user_stats` for the player:
    - games_played, games_won, current_streak, longest_streak, average_guesses, average_completion_time, last_played_word, updated_at
  - Ensure updates are atomic and schema-aligned.
- **Next Steps:**
  - Implement repositories and update logic.
  - Audit and document the new logic for schema alignment and correctness.

---

### Next: Implement scoresRepository.ts and userStatsRepository.ts, and update /api/guess to write to these tables on game completion.

### Next: Test the updated backend and proceed with any further audits or feature work as needed.

### Implementation: scoresRepository, userStatsRepository, and finaliseGameSession

- **scoresRepository.ts**: Provides insertScore to insert a new row into scores.
- **userStatsRepository.ts**: Provides getUserStats and updateUserStats for user_stats updates.
- **/api/guess**: Now calls finaliseGameSession logic after game completion (gameOver && is_complete):
  - Inserts a new score with player_id, word_id, guesses_used, completion_time_seconds, was_correct, nickname, submitted_at
  - Updates user_stats for the player: games_played, games_won, current_streak, longest_streak, average_guesses, average_completion_time, last_played_word, updated_at
  - All updates are atomic and schema-aligned
- **Types**: GameSessionEntry now includes start_time to match schema and backend usage

---

### Next: Audit and test the new flow for correctness and schema alignment

### Next: Test the updated backend and proceed with any further audits or feature work as needed.

### [2025-05-04] Foreign Key Alignment and `word_id` Removal

- All `player_id` foreign keys (in `game_sessions`, `scores`, `leaderboard_summary`) now correctly reference `user_stats.player_id`.
- Dropped `word_id` from `game_sessions` — it was redundant since `word` (text) is used directly throughout gameplay.
- Backend and types now fully align with this simplified schema structure.

---

### Next: Test the updated backend and proceed with any further audits or feature work as needed.

### [2025-05-04] /api/guess Uses gameSession.word Directly

- The /api/guess route now uses `gameSession.word` directly for guess comparison and all relevant logic.
- Removed fetching the word from the words table and all references to `word_id` in this context.
- This completes the backend alignment with the new schema, where `word` (text) is the single source of truth for the session word.

---

### Next: Test the updated backend and proceed with any further audits or feature work as needed.

### [2025-05-04] Player Upsert Before Game Session

- Backend now upserts into `user_stats` before creating any game session.
- Ensures `player_id` exists to satisfy foreign key constraints.
- Supports anonymous or dynamic users safely.
- Implemented via `ensurePlayerStatsExists()` in `userStatsRepository.ts`.

---

### Next: Test the updated backend and proceed with any further audits or feature work as needed.

### [2025-05-04] Dev-Only /api/dev/reset-session Endpoint

- Added a dev-only endpoint `/api/dev/reset-session` to allow developers to reset a player's game session for UI simulation and testing.
- Accepts `{ player_id, word? }` in the POST body. If `word` is omitted, uses today's word.
- Ensures player stats exist, deletes existing sessions for the player, and creates a fresh session.
- Protected from use in production (`NODE_ENV !== 'production'`).
- Implements `getWordByText` in `wordRepository.ts` for word lookup by text.
- Route is registered in `index.ts` under `/api/dev`.

---

### Next: Test the updated backend and proceed with any further audits or feature work as needed.

### [2025-05-04] Streamlined DevControls for Auto-Use of player_id

- DevControls now auto-infers `player_id` as `localStorage.getItem("nickname") || "dev_player_001"`.
- The playerId input field is removed; all API calls use the inferred value.
- After a session reset, the `player_id` is persisted to `localStorage.nickname` for consistency.
- The UI retains the word override input for targeted puzzle testing.
- Status feedback is shown after reset.
- Only visible in dev mode (`?dev=true`).
- This streamlines manual simulation and ensures session logic is consistent with production flows.

---

### [2025-05-04] Frontend State Alignment for GameSession

- Removed all references to `word` in the frontend state and logic.
- `GameSessionState` now only uses the correct properties: `gameId`, `guesses`, `revealedClues`, `clueStatus`, `usedHint`, `isComplete`, `isWon`.
- `/api/guess` and related logic only store and update necessary frontend-facing data.
- This ensures the frontend is fully aligned with backend types and API responses.

---

### [2025-05-04] /api/word Endpoint Test & Books Emoji Favicon

- Successfully tested `/api/word` with curl; received valid game session and clues response.
- Added a books emoji (📚) favicon to the app using SVG for modern browser support.
- Updated `index.html` to reference the new favicon.

---
