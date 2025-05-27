# Un-Define API Response Shapes

Last Updated: May 2024

## Overview
This document serves as the canonical source for API response shapes in the Un-Define v2 project.

## GET /api/word

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

## POST /api/guess

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

## Error Responses

All API errors follow this shape:

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

Common error codes:
- `INVALID_REQUEST`: Malformed request or invalid parameters
- `GAME_NOT_FOUND`: Game session doesn't exist
- `GAME_COMPLETED`: Game is already finished
- `RATE_LIMITED`: Too many requests
- `SERVER_ERROR`: Internal server error

## Headers

All responses include:
- `Content-Type: application/json`
- CORS headers (see `lib/withCors.ts` for details) 