/**
 * Theme-related types for the Theme of the Week feature
 */

/**
 * Theme progress for a player
 */
export interface ThemeProgress {
  theme: string;
  totalWords: number;
  completedWords: number;
  themeGuess: string | null;
  hasGuessedTheme: boolean;
  canGuessTheme: boolean; // Can guess after completing any word
}

/**
 * Theme validation result
 */
export interface ThemeValidationResult {
  isCorrect: boolean;
  similarity: number; // 0-1 similarity score
  matchReason?: string; // e.g., "exact", "synonym", "fuzzy"
}

/**
 * Theme statistics for leaderboard
 */
export interface ThemeStats {
  playerId: string;
  playerName: string;
  themesGuessed: number;
  correctThemeGuesses: number;
  themeAccuracy: number; // percentage
  averageGuessDay: number; // average day of week when they guess themes
} 