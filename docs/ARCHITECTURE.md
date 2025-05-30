# Un-Define Architecture

## Status (Last Updated: May 2024)
- ✅ Backend and frontend deployed as separate Vercel projects
- ✅ Supabase integration complete with permissive anon access
- ⚠️ RLS not yet enabled - do not assume RLS constraints exist
- ✅ Game logic fully tested and deployed
- 🚧 End-to-end test automation pending

## Project Structure
This is a Vercel-deployed monorepo with:
- `client/`: Vite + React frontend
- `pages/api/`: Next.js API backend (deployed separately)
- `src/`: Shared game logic used by both frontend and backend
- `scripts/`: Dev and CI tooling (e.g. Supabase sync, word import)
- `docs/`: Architecture and supporting documentation

## Recent Changes (May 2024)

### Schema Optimizations
1. **Foreign Key Alignment**
   - All `player_id` foreign keys correctly reference `user_stats.player_id`
   - `game_sessions` includes both `word_id` (FK to `words.id`) and `word` (text) for improved resilience and historical joins
   - Schema structure optimized for performance and maintainability

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
    const origin = req.headers.origin || '';
    const isAllowed = allowedOrigins.includes(origin) ||
      /^https:\/\/undefine-v2-front-[a-z0-9]+-paddys-projects-82cb6057\.vercel\.app$/.test(origin);

    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      // ... other CORS headers
    }
    return handler(req, res);
  };
}

// Usage in API routes
export default withCors(async function handler(req, res) {
  // Route implementation
});
```

### Game Logic & State Normalization

1. Word Management (`src/game/word.ts`):
   - Word selection algorithms
   - Difficulty scaling
   - Word validation

2. Guess Processing:
   ```typescript
   // Text normalization used throughout
   const normalize = (text: string) => text.trim().toLowerCase().replace(/[​-‍]/g, '');
   ```

   - Core Game Logic (`src/game/guess.ts`):
     - Guess validation using normalized text
     - Clue generation
     - Progress tracking

   - API Endpoint (`pages/api/guess.ts`):
     - Updates game_sessions with guess, outcome, and clues
     - Inserts row into scores table
     - Updates user_stats (streaks, averages)
     - Full game round finalization

### Database Schema

For detailed schema information, see `docs/supa_alignment.md`. Key points:

1. **Core Tables**
   - `words`: Daily word bank with clues
     - `id` (uuid): Primary key
     - `word` (text): The actual word
     - Other clue fields...

   - `game_sessions`: Active gameplay tracking
     - `id` (uuid): Primary key
     - `word_id` (uuid): FK to words.id
     - `word` (text): Direct word reference
     - `state` (jsonb): Freeform game progress data
     - `guesses` (_text): Array of attempts
     - Other tracking fields...

   - `scores`: Completion metrics
     - `id` (uuid): Primary key
     - `word_id` (uuid): FK to words.id
     - `word` (text): Direct word reference
     - Other score fields...

2. **Foreign Key Constraints**
```sql
alter table game_sessions
add constraint fk_game_sessions_word_id foreign key (word_id) references words(id);

alter table game_sessions
add constraint fk_game_sessions_player foreign key (player_id) references user_stats(player_id);

alter table scores
add constraint fk_scores_word_id foreign key (word_id) references words(id);

alter table scores
add constraint fk_scores_word_text foreign key (word) references words(word);

alter table leaderboard_summary
add constraint fk_leaderboard_player foreign key (player_id) references user_stats(player_id);

alter table leaderboard_summary
add constraint fk_leaderboard_word foreign key (word) references words(word);
```

### Development Mode
- In dev mode (`/api/random`, local overrides):
  - UUIDs used directly from `localStorage.nickname`
  - Word overrides available but may cause state desync
  - Test data clearly marked with `isTest: true`
- In production:
  - Players mapped consistently via UUID
  - No word overrides allowed
  - Full game session lifecycle enforced

### Security & RLS
⚠️ **Important**: RLS is not currently enabled in Supabase
- All access is permissive for anon users
- Future RLS policy will enforce `player_id = auth.uid()`
- Currently using UUID-based player tracking
- All repository methods written with future RLS compatibility in mind

## Future Improvements
1. Zeitgeist mode (popular words)
2. Word pools and categories
3. Real-time multiplayer guesses
4. Custom difficulty curves
5. Formal RLS policies + JWT auth for admin

Use this document as the unambiguous source of truth for any backend, schema, or API-related updates.

### Text Normalization

All text normalization in the codebase is handled by the centralized utilities in `src/utils/text.ts`:

```typescript
// Normalize text (trim, lowercase, remove invisible chars)
const normalizedText = normalizeText(text);

// Compare strings after normalization
const isEqual = normalizedEquals(str1, str2);

// Check if one string contains another after normalization
const hasSubstring = normalizedIncludes(text, search);
```

This ensures consistent text handling across:
- Word comparison in game logic
- User input processing
- Search functionality
- Database operations

The normalization process:
1. Trims whitespace
2. Converts to lowercase
3. Removes invisible Unicode characters (zero-width spaces)
4. Removes hyphens

## Clue Type Management

The game's clue system is centrally managed through shared types in `shared-types/src/clues.ts`. This ensures consistency between frontend and backend implementations.

### Key Components

1. **Clue Keys**
   ```typescript
   // Full clue keys matching Supabase columns
   type ClueKey = 'definition' | 'equivalents' | 'first_letter' | ...;
   
   // Short form keys for frontend display
   type ShortClueKey = 'D' | 'E' | 'F' | 'I' | 'N' | 'E2';
   ```

2. **Clue Sequence**
   ```typescript
   const CLUE_SEQUENCE: ClueKey[] = [
     'definition',
     'equivalents',
     'first_letter',
     'in_a_sentence',
     'number_of_letters',
     'etymology'
   ];
   ```

3. **Key Mappings**
   ```typescript
   const CLUE_KEY_MAP: Record<ShortClueKey, ClueKey> = {
     'D': 'definition',
     'E': 'equivalents',
     // ...
   };
   ```

### Usage

1. **Frontend**
   - Uses `GameClues` interface for clue storage
   - Converts between short and full keys using `CLUE_KEY_MAP`
   - Displays clues using `CLUE_LABELS` for consistent naming

2. **Backend**
   - Uses `ClueKey` for database operations
   - Follows `CLUE_SEQUENCE` for revealing clues
   - Validates clue integrity at runtime

3. **Type Safety**
   - `ClueStatus` tracks revealed state
   - Runtime validations ensure sequence integrity
   - Shared types prevent inconsistencies

### Benefits

- Single source of truth for clue types
- Consistent naming across codebase
- Type-safe clue operations
- Runtime validation for data integrity

## Scoring System

The game's scoring system is centrally managed through `shared-types/src/scoring.ts`. This ensures consistent score calculation across frontend and backend.

### Score Formula

The base score for completing a word is 1000 points, with penalties applied for:
- Each guess after the first: -100 points
- Time taken: -1 point per 10 seconds
- Using a hint: -200 points
- Game not won: 0 points (overrides all other calculations)

Example:
```typescript
const score = calculateScore({
  guessesUsed: 3,      // -200 points (2 guesses after first)
  timeTaken: 120,      // -12 points (120 seconds = 12 * 10s)
  usedHint: true,      // -200 points
  isWon: true          // Score calculated
});
// Final score: 1000 - 200 - 12 - 200 = 588 points
```

### Score Components

Each score calculation returns detailed components:
```typescript
interface ScoreResult {
  score: number;        // Final calculated score
  baseScore: number;    // Starting score (1000)
  guessPenalty: number; // Points deducted for guesses
  timePenalty: number;  // Points deducted for time
  hintPenalty: number;  // Points deducted for hints
}
```

### Usage

1. **Backend**
   - Calculates score when game is complete
   - Stores score components in database
   - Updates user stats with total score
   - Uses score for leaderboard ranking

2. **Frontend**
   - Displays score components to user
   - Shows score breakdown in game over screen
   - Updates UI based on score milestones

3. **Leaderboard**
   - Ranks players primarily by score
   - Uses completion time as tiebreaker
   - Shows score breakdown on hover

### Benefits

- Consistent scoring across application
- Transparent score calculation
- Detailed score breakdown
- Type-safe score handling

## Database Security

### Row Level Security (RLS)

Currently, RLS is **disabled** for development purposes. This is temporary and will be enabled before production deployment.

When enabled, the following policies will be applied:

1. Words table:
   - Public read access
   - Admin-only write access

2. Game sessions:
   - Read/write access only to own sessions
   - Admin read access to all sessions

3. Scores:
   - Public read access for leaderboard
   - Write access only to own scores
   - Admin full access

4. User stats:
   - Read/write access only to own stats
   - Admin read access to all stats

### Indices

The following indices are maintained for performance:

1. Score-based indices:
   ```sql
   CREATE INDEX idx_scores_score ON scores(score DESC);
   CREATE INDEX idx_leaderboard_summary_score ON leaderboard_summary(score DESC);
   ```

2. Composite indices:
   ```sql
   CREATE INDEX idx_scores_word_player ON scores(word_id, player_id);
   CREATE INDEX idx_leaderboard_word_score ON leaderboard_summary(word_id, score DESC);
   ```

## Centralized Logic

### Clue System

The clue system is centralized in `shared-types/src/clues.ts`:
- Defines clue types and sequences
- Validates clue order integrity
- Provides consistent clue key mapping
- Runtime validation ensures data consistency

### Scoring System

Score calculation is centralized in `shared-types/src/scoring.ts`:
- Defines score constants
- Implements score calculation logic
- Provides type-safe interfaces
- Ensures consistent scoring across app

Benefits:
- Single source of truth
- Type safety
- Consistent behavior
- Easy maintenance
