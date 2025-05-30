import { ClueKey } from '@/shared-types/src/clues';
import { ScoreResult } from '@/shared-types/src/scoring';

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
 * Game session state from database
 */
export interface GameSession {
  id: string;
  player_id: string;
  word_id: string;
  guesses: string[];
  revealed_clues: ClueKey[];
  is_complete: boolean;
  is_won: boolean;
  score: number | null;
  start_time: string;
  end_time: string | null;
  created_at: string;
  updated_at: string;
}

interface GameSessionWithWord extends GameSession {
  words: {
    word: string;
    definition: string;
    etymology: string | null;
    first_letter: string;
    in_a_sentence: string;
    number_of_letters: number;
    equivalents: string[] | null;
    difficulty: number | null;
    date: string | null;
  };
} 