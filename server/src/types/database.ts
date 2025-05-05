/**
 * Database types for Un-Define v2
 * Based on the schema in ARCHITECTURE.md
 */

// Word entry type
export interface WordEntry {
  id: string;
  word: string;
  definition: string;
  equivalents?: string | null;
  first_letter?: string | null;
  in_a_sentence?: string | null;
  number_of_letters?: number | null;
  etymology?: string | null;
  difficulty?: 'Easy' | 'Medium' | 'Hard' | null;
  created_at: string;
  is_word_of_day: boolean;
  word_of_day_date?: string | null;
}

// Game session type
export interface GameSessionEntry {
  id: string;
  word: string;
  player_id: string;
  guesses: string[];
  revealed_clues: string[];
  clue_status: Record<string, boolean>;
  is_complete: boolean;
  is_won: boolean;
  created_at: string;
  start_time: string;
  end_time?: string | null;
}

// Score entry type
export interface ScoreEntry {
  id: string;
  player_id: string;
  word: string;
  guesses_used: number;
  completion_time_seconds: number;
  was_correct: boolean;
  nickname?: string | null;
  submitted_at: string;
}

// User stats type
export interface UserStatsEntry {
  player_id: string;
  games_played: number;
  games_won: number;
  current_streak: number;
  longest_streak: number;
  average_guesses: number;
  average_completion_time: number;
  fastest_win_seconds?: number | null;
  total_play_time_seconds: number;
  last_played_word?: string | null;
  created_at: string;
  updated_at: string;
}

// Leaderboard summary type
export interface LeaderboardSummaryEntry {
  id: string;
  player_id: string;
  word_id: string;
  rank: number;
  was_top_10: boolean;
  best_time_seconds?: number | null;
  guesses_used: number;
  created_at: string;
}

// API response types
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

export interface GuessRequest {
  gameId: string;
  guess: string;
}

export interface GuessResponse {
  isCorrect: boolean;
  guess: string;
  isFuzzy: boolean;
  fuzzyPositions: number[];
  gameOver: boolean;
  revealedClues: string[];
  usedHint: boolean;
}
