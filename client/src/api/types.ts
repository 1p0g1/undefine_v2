/**
 * Client-side API types for Un-Define v2
 * ⚠️ Keep in sync with server/src/types/database.ts
 */

/**
 * Word response type from /api/word endpoint
 */
export interface WordResponse {
  gameId: string;
  clues: {
    D: string;
    E: string[];
    F: string;
    I: string;
    N: number;
    E2: string;
  };
  solution?: string; // DEV ONLY: present only in development mode
}

/**
 * Guess request type for /api/guess endpoint
 */
export interface GuessRequest {
  gameId: string;
  guess: string;
}

/**
 * Guess response type from /api/guess endpoint
 */
export interface GuessResponse {
  isCorrect: boolean;
  guess: string;
  isFuzzy: boolean;
  fuzzyPositions: number[];
  gameOver: boolean;
  revealedClues: string[];
  usedHint: boolean;
}

/**
 * Game session state type for frontend state management
 */
export interface GameSessionState {
  gameId: string;
  guesses: string[];
  revealedClues: string[];
  clueStatus: Record<string, boolean>;
  usedHint: boolean;
  isComplete: boolean;
  isWon: boolean;
}
