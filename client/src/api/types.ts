/**
 * Client-side API types for Un-Define v2
 * ⚠️ Keep in sync with server/src/types/database.ts
 */

import { WordResponseShape } from '../../../shared-types/src/word';
import { ClueKey } from '../../../shared-types/src/clues';
import { GuessRequest, GuessResponse, GameSessionState } from '../../../shared-types/src/game';
import { ScoreResult } from '../../../shared-types/src/scoring';

/**
 * Word response type from /api/word endpoint
 */
export interface WordResponse {
  word: WordResponseShape;
  gameId: string;
  isFallback: boolean;
  start_time: string;  // ISO string of when the game session was created
}

export type { GuessRequest, GuessResponse, GameSessionState, ScoreResult };

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
  score: number;
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
