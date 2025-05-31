import { ClueKey } from './clues';
import { ScoreResult } from './scoring';

/**
 * Request parameters for submitting a guess
 */
export interface GuessRequest {
  gameId: string;
  guess: string;
  playerId: string;
  wordId: string;
  start_time: string;
}

/**
 * Response from guess submission
 */
export interface GuessResponse {
  isCorrect: boolean;
  guess: string;
  isFuzzy: boolean;
  fuzzyPositions: number[];
  gameOver: boolean;
  revealedClues: ClueKey[];
  score: ScoreResult | null;
  stats?: {
    games_played: number;
    games_won: number;
    current_streak: number;
    longest_streak: number;
    total_guesses: number;
    average_guesses_per_game: number;
    total_play_time_seconds: number;
    total_score: number;
    updated_at: string;
  };
}

/**
 * Game session state
 */
export interface GameSessionState {
  gameId: string;
  wordId: string;
  wordText: string;
  clues: Record<ClueKey, string>;
  guesses: string[];
  revealedClues: ClueKey[];
  clueStatus: Record<ClueKey, boolean>;
  isComplete: boolean;
  isWon: boolean;
  score: number | null;
  startTime: string;  // ISO string of game start time
}

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
  id: string;
  word_id: string;
  player_id: string;
  player_name: string;
  rank: number;
  guesses_used: number;
  completion_time_seconds: number;
  score: number;
  date: string;
  created_at: string;
  was_top_10: boolean;
  is_current_player?: boolean;
}

/**
 * Leaderboard response
 */
export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  playerRank: number | null;
} 