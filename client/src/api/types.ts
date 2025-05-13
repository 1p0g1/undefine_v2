/**
 * Client-side API types for Un-Define v2
 * ⚠️ Keep in sync with server/src/types/database.ts
 */

/**
 * Word response type from /api/word endpoint
 */
export interface WordResponse {
  id: string; // UUID from words table
  word: string;
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
  playerId: string;
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
  score?: {
    id: string;
    playerId: string;
    wordId: string;
    gameSessionId: string;
    guessesUsed: number;
    usedHint: boolean;
    completionTimeSeconds: number;
    submittedAt: string;
  };
}

/**
 * Game session state type for frontend state management
 */
export interface GameSessionState {
  gameId: string;
  wordId: string; // UUID from words table
  guesses: string[];
  revealedClues: string[];
  clueStatus: Record<string, boolean>;
  usedHint: boolean;
  isComplete: boolean;
  isWon: boolean;
}

/**
 * Leaderboard entry type from /api/leaderboard endpoint
 */
export interface LeaderboardEntry {
  id: string;
  word_id: string;
  player_id: string;
  player_name: string;
  rank: number;
  guesses_used: number;
  completion_time_seconds: number;
  date: string;
  created_at: string;
  is_current_player?: boolean;
}

/**
 * Leaderboard response type from /api/leaderboard endpoint
 */
export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  playerRank: number | null;
}
