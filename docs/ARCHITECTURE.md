# Un-Define Architecture

Last Updated: May 2024

## Recent Changes (May 2024)

### Schema Optimizations
1. **Foreign Key Alignment**
   - All `player_id` foreign keys now correctly reference `user_stats.player_id`
   - Dropped redundant `word_id` from `game_sessions` in favor of direct `word` text field
   - Simplified schema structure for better performance and maintainability

2. **Session Management**
   - Added `ensurePlayerStatsExists()` in `userStatsRepository.ts`
   - Player stats upsert before game session creation
   - Supports anonymous/dynamic users with foreign key constraints

3. **Development Tools**
   - New `/api/dev/reset-session` endpoint (dev-only)
   - Streamlined DevControls with auto-inferred `player_id`
   - Frontend state alignment for GameSession
   - Books emoji (📚) favicon added

## API Routes

### CORS Policy

All `/api/*` routes are wrapped with `withCors()` (see `lib/withCors.ts`). This ensures:

1. Dynamic origin validation for:
   - Production: `undefine-v2-front.vercel.app`
   - Preview: `undefine-v2-front-[hash]-paddys-projects...`

2. Security:
   - No wildcard origins
   - Proper credentials handling
   - Safe preview deployment pattern

3. Implementation Pattern:
```typescript
// lib/withCors.ts
export function withCors(handler: Handler): Handler {
  return async (req, res) => {
    // Origin validation
    // Header setting
    // Preflight handling
    return handler(req, res);
  };
}

// Usage in API routes
export default withCors(async function handler(req, res) {
  // Route implementation
});
```

Note: Middleware must not be used for CORS in Next.js API routes.

### Game Logic Abstractions

Game logic is encapsulated in dedicated modules under `src/game/`:

1. Word Management (`src/game/word.ts`):
   - Word selection algorithms
   - Difficulty scaling
   - Word validation

2. Guess Processing (`src/game/guess.ts`):
   - Guess validation
   - Clue generation
   - Progress tracking

3. API Integration:
```typescript
// pages/api/word.ts
import { selectWord, validateWord } from '@/game/word';

export default withCors(async function handler(req, res) {
  const word = await selectWord(difficulty);
  // ... rest of handler
});

// pages/api/guess.ts
import { processGuess, generateClue } from '@/game/guess';

export default withCors(async function handler(req, res) {
  const result = await processGuess(guess, targetWord);
  // ... rest of handler
});
```

🔧 Backend Architecture

Tech Stack

Node.js + Express — API server

Supabase — Postgres database & auth

TypeScript — Full type safety (front & back)

Endpoints

GET /api/word

Starts a game session and returns metadata for the word of the day:

{
gameId: string,
clues: {
D: string,
E: string[],
F: string,
I: string,
N: number,
E2: string
}
}

Clues returned in predefined order

Word is hidden from client

Creates game session row with timestamp and player ID

GET /api/random

Returns a random word and bypasses daily logic (dev only):

{
gameId: string,
clues: ClueSet,
isTest: true
}

For local testing only

Follows the same structure as /api/word

POST /api/guess

Submits a guess and updates the game state:

{
gameId: string,
guess: string
}

Response:

{
isCorrect: boolean,
guess: string,
isFuzzy: boolean,
fuzzyPositions: number[],
gameOver: boolean,
revealedClues: string[],
usedHint: boolean
}

Normalises input (lowercase, trim, unicode safe)

Tracks guesses and updates is_won, is_complete

Updates Supabase game_sessions record

🗄️ Supabase Schema

words

Column

Type

Description

id

UUID

Primary key

word

TEXT

Word to guess

definition

TEXT

Core clue

equivalents

TEXT

Comma-separated synonyms (E)

first_letter

TEXT

First letter (F)

in_a_sentence

TEXT

Usage sentence (I)

number_of_letters

INT

Word length (N)

etymology

TEXT

Origin (E2)

difficulty

TEXT

easy/medium/hard

date

DATE

When it's used as daily word

game_sessions

Column

Type

id

UUID

word_id

UUID

word

TEXT

guesses

TEXT[]

guesses_used

INT

revealed_clues

TEXT[]

clue_status

JSONB

is_complete

BOOLEAN

is_won

BOOLEAN

start_time

TIMESTAMP

end_time

TIMESTAMP

created_at

TIMESTAMP

updated_at

TIMESTAMP

state

TEXT

player_id

TEXT

scores

Column

Type

id

UUID

player_id

TEXT

word

TEXT

guesses_used

INT

used_hint

BOOLEAN

completion_time_seconds

INT

was_correct

BOOLEAN

nickname

TEXT

submitted_at

TIMESTAMP

user_stats

Column

Type

player_id

TEXT

games_played

INT

games_won

INT

current_streak

INT

longest_streak

INT

average_guesses

FLOAT

average_completion_time

FLOAT

last_played_word

TEXT

leaderboard_summary

Column

Type

id

UUID

player_id

TEXT

word

TEXT

rank

INT

was_top_10

BOOLEAN

best_time

INT

guesses_used

INT

date

DATE

🔐 Security & RLS

RLS has not yet been enabled in Supabase, but is planned for future implementation

Future rule: player_id = auth.uid() or UUID from localStorage

Currently tracked via UUID-based player_id without login

All repository methods should be written with future RLS compatibility in mind

🔀 State Normalisation Logic

const normalize = (text: string) => text.trim().toLowerCase().replace(/[​-‍]/g, '')

Used in guess comparison logic to avoid diacritic or spacing mismatches.

🔄 TypeScript Import Rules

Do not use .js in TypeScript imports

Use tsx or ts-node/esm to avoid extension issues

✅ import { foo } from './utils/foo'

🛠️ Development Notes

Game sessions use UUIDs and are player-bound

Supabase RLS ties sessions/scores to user_stats (when enabled)

LocalStorage UUID = player_id unless auth is added later

Only one session per player per day (outside dev mode)

Dev mode must ensure random word guess == backend word (no desync)

❌ Cursor Protection Rules

Do not edit:

docs/ARCHITECTURE.md

src/types.ts

src/config/db.ts

Any .env\* files

🧪 Future Improvements

Zeitgeist mode (popular words)

Word pools and categories

Real-time multiplayer guesses

Custom difficulty curves

Formal RLS policies + JWT auth for admin

📋 SQL Relationships

alter table game_sessions
add constraint fk_game_sessions_word_id foreign key (word_id) references words(id);

alter table game_sessions
add constraint fk_game_sessions_player foreign key (player_id) references user_stats(player_id);

alter table scores
add constraint fk_scores_player foreign key (player_id) references user_stats(player_id);

alter table scores
add constraint fk_scores_word_text foreign key (word) references words(word);

alter table leaderboard_summary
add constraint fk_leaderboard_player foreign key (player_id) references user_stats(player_id);

alter table leaderboard_summary
add constraint fk_leaderboard_word foreign key (word) references words(word);

✅ Status

undefine_v2 repo is the active source

Architecture & types fully documented

RLS deferred until post-MVP

Schema reflects live Supabase dashboard

Use this document as the unambiguous source of truth for any backend, schema, or API-related updates.

## Database Schema

The database schema is defined in `docs/supa_alignment.md`. Key architectural points:

1. **Table Relationships**
   - `words` → `game_sessions` → `scores`: Game progression flow
   - `user_stats` ← `scores`: Performance aggregation
   - `leaderboard_summary`: Daily rankings with word and player links

2. **Data Types**
   - UUIDs for word and session IDs
   - Text for player IDs (allows external auth integration)
   - Timestamptz for all timestamps
   - _text arrays for lists (guesses, clues)
   - jsonb for complex state (clue_status)

3. **Constraints**
   - Non-nullable fields marked with ◆
   - Optional fields marked with ◇
   - Foreign key relationships enforced
   - Unique constraints on daily words

## Development Features

1. **Dev-Only Endpoints**
   - `/api/dev/reset-session`: Reset player's game session
   - Accepts `{ player_id, word? }` in POST body
   - Protected by `NODE_ENV !== 'production'` check

2. **DevControls**
   - Auto-infers `player_id` from localStorage
   - Persists player_id for consistency
   - Word override for targeted testing
   - Only visible in dev mode (`?dev=true`)

3. **Frontend State**
   - Removed direct word references
   - Uses `GameSessionState` for game data
   - Aligned with backend types/responses

## Security & RLS

RLS has not yet been enabled in Supabase, but is planned for future implementation:
- Future rule: `player_id = auth.uid()` or UUID from localStorage
- Currently tracked via UUID-based player_id without login
- All repository methods written with future RLS compatibility in mind

## State Normalization

```typescript
const normalize = (text: string) => text.trim().toLowerCase().replace(/[​-‍]/g, '')
```
Used in guess comparison logic to avoid diacritic or spacing mismatches.

## TypeScript Import Rules

- Do not use .js in TypeScript imports
- Use tsx or ts-node/esm to avoid extension issues
- ✅ `import { foo } from './utils/foo'`

## Development Notes

- Game sessions use UUIDs and are player-bound
- Supabase RLS ties sessions/scores to user_stats (when enabled)
- LocalStorage UUID = player_id unless auth is added later
- Only one session per player per day (outside dev mode)
- Dev mode must ensure random word guess == backend word (no desync)

## Future Improvements

- Zeitgeist mode (popular words)
- Word pools and categories
- Real-time multiplayer guesses
- Custom difficulty curves
- Formal RLS policies + JWT auth for admin

## Status

- undefine_v2 repo is the active source
- Architecture & types fully documented
- RLS deferred until post-MVP
- Schema reflects live Supabase dashboard

Use this document as the unambiguous source of truth for any backend, schema, or API-related updates.
