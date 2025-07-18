# Un-Define API Response Shapes

Last Updated: January 2025

## Overview
This document serves as the canonical source for API response shapes in the Un-Define v2 project. All endpoints use standardized response formats with proper error handling.

## Core Game Endpoints

### GET /api/word

```typescript
interface WordResponse {
  gameId: string;
  clues: {
    D: string;      // Definition
    E: string[];    // Equivalents (synonyms)
    F: string;      // First letter
    I: string;      // In a sentence
    N: number;      // Number of letters
    E2: string;     // Etymology
  };
  isTest?: boolean; // Only present for random/test words
}
```

### POST /api/guess

```typescript
interface GuessResponse {
  isCorrect: boolean;
  guess: string;
  isFuzzy: boolean;
  fuzzyPositions: number[];
  gameOver: boolean;
  revealedClues: string[];
  score?: {
    value: number;
    guessesUsed: number;
    completionTimeSeconds: number;
    isWon: boolean;
  };
  stats?: {
    games_played: number;
    games_won: number;
    current_streak: number;
    longest_streak: number;
  };
}
```

## Leaderboard Endpoints

### GET /api/leaderboard

```typescript
interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  playerRank?: number;
  totalPlayers: number;
  date: string;
  wordId: string;
  isHistorical: boolean;
}

interface LeaderboardEntry {
  player_id: string;
  rank: number;
  guesses_used: number;
  completion_time: number;
  was_top_10: boolean;
  display_name?: string;
}
```

**Query Parameters:**
- `wordId` (required): UUID of the word
- `playerId` (optional): UUID of the player to highlight
- `date` (optional): Date in YYYY-MM-DD format for historical queries

### GET /api/leaderboard/all-time

```typescript
interface AllTimeLeaderboardResponse {
  success: boolean;
  data?: {
    topByStreaks: AllTimeStats[];
    topByGames: AllTimeStats[];
    totalPlayers: number;
    totalGames: number;
  };
  error?: string;
  debug?: any;
}

interface AllTimeStats {
  player_id: string;
  player_name: string;
  win_percentage: number;
  average_guesses: number;
  highest_streak: number;
  current_streak: number;
  total_games: number;
  total_wins: number;
  last_played: string;
}
```

## Theme of the Week Endpoints

### GET /api/theme-status

```typescript
interface ThemeStatusResponse {
  currentTheme?: string | null;
  hasActiveTheme: boolean;
  progress: {
    totalWords: number;
    completedWords: number;
    themeGuess: string | null;
    canGuessTheme: boolean;
    hasGuessedToday: boolean;
    isCorrectGuess: boolean;
  };
  weeklyThemedWords: Array<{
    id: string;
    word: string;
    date: string;
    completedOn: string;
  }>;
}
```

**Query Parameters:**
- `player_id` (required): UUID of the player

### POST /api/theme-guess

```typescript
interface ThemeGuessResponse {
  isCorrect: boolean;
  guess: string;
  actualTheme?: string;
  progress: {
    totalWords: number;
    completedWords: number;
    themeGuess: string | null;
    canGuessTheme: boolean;
  };
  fuzzyMatch: {
    method: 'exact' | 'synonym' | 'semantic' | 'error';
    confidence: number;
    similarity?: number;
  };
}
```

**Request Body:**
```typescript
interface ThemeGuessRequest {
  player_id: string;
  guess: string;
  gameId: string;
}
```

### GET /api/theme-stats

```typescript
interface ThemeStatsResponse {
  totalThemes: number;
  completedThemes: number;
  currentWeekProgress: {
    totalWords: number;
    completedWords: number;
    themeGuess: string | null;
    isCorrectGuess: boolean;
  };
  recentActivity: Array<{
    date: string;
    action: string;
    theme?: string;
  }>;
}
```

## Player Management Endpoints

### POST /api/streak-status

```typescript
interface StreakResponse {
  current_streak: number;
  longest_streak: number;
  last_played: string;
  games_played: number;
  games_won: number;
}
```

**Request Body:**
```typescript
interface StreakRequest {
  player_id: string;
}
```

### GET /api/player/nickname

```typescript
interface PlayerResponse {
  success: boolean;
  data?: {
    player_id: string;
    display_name: string;
    created_at: string;
    last_active: string;
  };
  error?: string;
}
```

## Admin Endpoints

### POST /api/admin/finalize-daily-leaderboard

```typescript
interface FinalizationResult {
  success: boolean;
  message: string;
  finalized: Array<{
    word_id: string;
    date: string;
    total_players: number;
    top_10_count: number;
    message: string;
  }>;
  errors: Array<{
    word_id?: string;
    date?: string;
    error: string;
  }>;
  stats: {
    totalProcessed: number;
    successCount: number;
    errorCount: number;
    finalizationDate: string;
  };
}
```

**Request Body:**
```typescript
interface FinalizationRequest {
  wordId?: string;
  date?: string;
  autoFinalize?: boolean;
}
```

### GET /api/admin/validate-leaderboard

```typescript
interface ValidationResponse {
  success: boolean;
  data?: {
    missingPlayers: string[];
    invalidEntries: Array<{
      player_id: string;
      issue: string;
    }>;
    summary: {
      totalEntries: number;
      validEntries: number;
      issuesFound: number;
    };
  };
  error?: string;
}
```

### POST /api/admin/populate-leaderboard

```typescript
interface PopulationResponse {
  success: boolean;
  message: string;
  populated: Array<{
    player_id: string;
    word_id: string;
    action: 'created' | 'updated' | 'skipped';
  }>;
  stats: {
    totalProcessed: number;
    created: number;
    updated: number;
    skipped: number;
  };
}
```

## Automation Endpoints

### POST /api/cron/finalize-daily-leaderboards

```typescript
interface CronResponse {
  success: boolean;
  message: string;
  processed: Array<{
    date: string;
    wordCount: number;
    status: 'success' | 'error' | 'skipped';
  }>;
  stats: {
    totalDates: number;
    successCount: number;
    errorCount: number;
    executionTime: string;
  };
}
```

**Security:** Only accessible via Vercel Cron headers

## Development Endpoints

### POST /api/dev/reset-session

```typescript
interface ResetResponse {
  success: boolean;
  message: string;
  reset: {
    gameSession: boolean;
    playerStats: boolean;
    leaderboard: boolean;
  };
}
```

**Request Body:**
```typescript
interface ResetRequest {
  player_id: string;
  resetType?: 'session' | 'stats' | 'all';
}
```

**Note:** Development environment only

## Debug Endpoints

### GET /api/debug-headers

```typescript
interface DebugResponse {
  headers: Record<string, string>;
  environment: string;
  timestamp: string;
}
```

### GET /api/debug-sessions

```typescript
interface DebugSessionsResponse {
  sessions: Array<{
    id: string;
    player_id: string;
    word_id: string;
    is_complete: boolean;
    created_at: string;
  }>;
  count: number;
}
```

## Standardized Error Responses

All API endpoints use consistent error response formats:

```typescript
interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

// Alternative format for some endpoints
interface StandardErrorResponse {
  success: false;
  error: string;
  message?: string;
}
```

### Common Error Codes
- `INVALID_REQUEST`: Malformed request or invalid parameters
- `GAME_NOT_FOUND`: Game session doesn't exist
- `GAME_COMPLETED`: Game is already finished
- `PLAYER_NOT_FOUND`: Player ID not found
- `THEME_NOT_ACTIVE`: No active theme this week
- `RATE_LIMITED`: Too many requests
- `SERVER_ERROR`: Internal server error
- `UNAUTHORIZED`: Missing or invalid authentication
- `METHOD_NOT_ALLOWED`: HTTP method not supported

## Response Headers

All responses include:
- `Content-Type: application/json`
- CORS headers (see `lib/withCors.ts` for details)
- Cache-Control headers (varies by endpoint)

## Caching Strategy

- **GET /api/word**: Cached for 1 hour
- **GET /api/leaderboard**: Cached for 5 minutes
- **POST /api/guess**: No caching (real-time)
- **Theme endpoints**: No caching (real-time)
- **Admin endpoints**: No caching
- **Debug endpoints**: No caching

## Authentication

Most endpoints require a `player_id` parameter. Admin endpoints may have additional authentication requirements. Cron endpoints are secured via Vercel-specific headers.

## Rate Limiting

Rate limiting is implemented per endpoint based on usage patterns:
- Game endpoints: Moderate limits
- Admin endpoints: Strict limits
- Debug endpoints: Development only
- Cron endpoints: Vercel-managed

## API Versioning

Current API version: v1 (implicit)
All endpoints are stable and maintain backward compatibility. 