/**
 * Types shared between frontend and backend for Theme of the Week functionality
 */

/**
 * Theme guess request payload
 */
export interface ThemeGuessRequest {
  player_id: string;
  guess: string;
  gameId: string;
}

/**
 * Theme guess response
 */
export interface ThemeGuessResponse {
  isCorrect: boolean;
  guess: string;
  actualTheme?: string;
  progress: ThemeProgress;
}

/**
 * Theme status response
 */
export interface ThemeStatusResponse {
  currentTheme?: string | null;
  hasActiveTheme: boolean;
  progress: ThemeProgress;
}

/**
 * Theme progress information
 */
export interface ThemeProgress {
  totalWords: number;
  completedWords: number;
  themeGuess: string | null;
  canGuessTheme: boolean;
  isCorrectGuess?: boolean;
}

/**
 * Word with theme information
 */
export interface ThemedWord {
  id: string;
  word: string;
  date: string;
  theme?: string;
}

/**
 * Theme synonyms mapping for fuzzy matching
 */
export interface ThemeSynonyms {
  [theme: string]: string[];
} 