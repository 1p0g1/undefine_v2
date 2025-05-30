# Game Logic Debugging Checklist

## Frontend State Management Issues

### 1. Frontend: Game State Creation
- **Check**: Is `start_time` stored in state after calling `/api/word`?
- **Current Error**: `start_time` is likely null/undefined in submitGuess payload
- **Fix**: Ensure `start_time` is saved into React state on game start
- **Implementation**: Update `useGame.ts` to store start_time from API response

### 2. Frontend: submitGuess Call
- **Check**: Does `submitGuess` send `start_time`, `wordId`, and `gameId`?
- **Current Error**: Request missing `start_time`, causing 400 error
- **Fix**: Send `start_time` in `submitGuess()` from game state
- **Implementation**: Update payload construction in submitGuess

### 3. Frontend: Word Object Persistence
- **Check**: Is `start_time` fetched again if page is refreshed?
- **Current Error**: Page refresh may cause game state loss
- **Fix**: Persist session or reload word/start_time from Supabase
- **Implementation**: Add local storage or session persistence

## Backend API Issues

### 4. API: /api/word Endpoint
- **Check**: Does `/api/word` response include correct `start_time`?
- **Current Error**: `start_time` might not be returned in session object
- **Fix**: Confirm `start_time` is included in `/api/word`
- **Implementation**: Update response to include session start_time

### 5. API: /api/guess Endpoint
- **Check**: Does `/api/guess` validate the correct ISO string format & keys?
- **Current Error**: Fails if submitted `start_time` doesn't match DB
- **Fix**: Update `/api/guess` handler to log & check received keys explicitly
- **Implementation**: Add validation and error logging

### 6. Supabase: game_sessions Table
- **Check**: Does game_sessions have correct column types for `start_time`?
- **Current Error**: Schema mismatch may reject payloads or cause broken joins
- **Fix**: Inspect Supabase schema: game_sessions.start_time must be `timestamptz`
- **Implementation**: Verify schema matches expected types

## Critical Fixes Required

1. Frontend State Management:
   ```typescript
   // In useGame.ts after /api/word call
   setGameState({
     ...gameState,
     start_time: response.start_time,  // Save from API response
     gameId: response.gameId,
     wordId: response.word.id
   });
   ```

2. API Response Structure:
   ```typescript
   // In /api/word response
   res.json({
     word: wordData,
     gameId: session.id,
     start_time: session.start_time  // Include in response
   });
   ```

3. Supabase Query Structure:
   ```typescript
   // Correct join syntax
   .select(`
     id,
     word_id,
     start_time,
     words:word_id (*)
   `)
   ```

## Logging Improvements

1. Frontend Logging:
   ```typescript
   console.log('[Game] State after word fetch:', {
     start_time: gameState.start_time,
     gameId: gameState.gameId,
     wordId: gameState.wordId
   });
   ```

2. API Logging:
   ```typescript
   console.log('[/api/guess] Request payload:', {
     start_time,
     gameId,
     wordId,
     guess
   });
   ```

## Schema Validation

1. Supabase Types:
   ```sql
   start_time TIMESTAMPTZ NOT NULL,
   word_id UUID REFERENCES words(id),
   game_id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
   ```

2. TypeScript Types:
   ```typescript
   interface GameSession {
     start_time: string;  // ISO string
     word_id: string;     // UUID
     game_id: string;     // UUID
   }
   ```

## Next Steps

1. Implement frontend state persistence
2. Add comprehensive request validation
3. Improve error handling and logging
4. Add schema validation checks
5. Implement session recovery on page refresh 