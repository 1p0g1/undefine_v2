import type { NextApiResponse } from 'next';

// Common response type for error cases
export type ErrorResponse = {
  error: string;
  details?: string;
};

// Leaderboard types
export interface LeaderboardEntry {
  id: string;
  player_id: string;
  word_id: string;
  date: string;
  rank: number;
  guesses_used: number;
  best_time: number;
  was_top_10: boolean;
  is_current_player?: boolean;
  player_name?: string;         // Player display name
  fuzzy_matches?: number;       // Number of fuzzy matches (calculated from fuzzy_bonus / 25)
  fuzzy_bonus?: number;         // Bonus points from fuzzy matches
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  playerRank: number | null;
  totalEntries: number;
}

// Game session types
export interface GameSessionPayload {
  word_id: string;
  start_time: string;
  clue_status: {
    D: boolean;
    E: boolean;
    F: boolean;
    I: boolean;
    N: boolean;
    E2: boolean;
  };
  guesses: string[];
  is_complete: boolean;
}

// Guess types
export interface GuessRequest {
  gameId: string;
  guess: string;
  playerId: string;
}

export interface GuessResponse {
  isCorrect: boolean;
  guess: string;
  isFuzzy: boolean;
  fuzzyPositions: number[];
  gameOver: boolean;
  revealedClues: string[];
  usedHint: boolean;
  score: any | null;
  stats: {
    games_played: number;
    games_won: number;
    current_streak: number;
    longest_streak: number;
  };
}

// Streak types
export interface StreakResponse {
  currentStreak: number;
  longestStreak: number;
  lastWinDate: string | null;
}

// Reset session types (dev only)
export interface ResetRequest {
  player_id: string;
  word?: string;
}

export interface ResetResponse {
  status: 'reset';
  word: string;
}

// Helper type for API responses
export type ApiResponse<T> = NextApiResponse<T | ErrorResponse>; 