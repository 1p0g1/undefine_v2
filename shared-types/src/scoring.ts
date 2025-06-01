/**
 * Shared scoring types and constants for Un-Define v2
 */

/**
 * Base score and penalty constants
 */
export const SCORING = {
  BASE_SCORE: 1000,
  GUESS_PENALTY: 100,
  FUZZY_PENALTY: 25,                    // Small penalty for fuzzy matches (25% of wrong guess)
  TIME_PENALTY_PER_10_SECONDS: 10,
  HINT_PENALTY: 200,
} as const;

/**
 * Input parameters for score calculation
 */
export interface ScoreParams {
  guessesUsed: number;
  fuzzyMatches?: number;                // Optional: number of fuzzy matches made
  completionTimeSeconds: number;
  usedHint: boolean;
  isWon: boolean;
}

/**
 * Score calculation result
 */
export interface ScoreResult {
  score: number;
  baseScore: number;
  guessPenalty: number;
  fuzzyPenalty: number;                 // New: penalty for fuzzy matches
  timePenalty: number;
  hintPenalty: number;
}

/**
 * Calculate game score based on performance metrics
 * 
 * Formula:
 * - Base score: 1000 points
 * - Guess penalty: -100 points per guess after first
 * - Fuzzy penalty: -25 points per fuzzy match (encourages precision)
 * - Time penalty: -1 point per 10 seconds
 * - Hint penalty: -200 points if hint used
 * - Score is 0 if game not won
 */
export function calculateScore(params: ScoreParams): ScoreResult {
  const { guessesUsed, fuzzyMatches = 0, completionTimeSeconds, usedHint, isWon } = params;

  // No score if game not won
  if (!isWon) {
    return {
      score: 0,
      baseScore: SCORING.BASE_SCORE,
      guessPenalty: 0,
      fuzzyPenalty: 0,
      timePenalty: 0,
      hintPenalty: 0
    };
  }

  // Calculate penalties
  const guessPenalty = Math.max(0, (guessesUsed - 1) * SCORING.GUESS_PENALTY);
  const fuzzyPenalty = fuzzyMatches * SCORING.FUZZY_PENALTY;
  const timePenalty = Math.floor(completionTimeSeconds / 10) * SCORING.TIME_PENALTY_PER_10_SECONDS;
  const hintPenalty = usedHint ? SCORING.HINT_PENALTY : 0;

  // Calculate final score
  const score = Math.max(0, SCORING.BASE_SCORE - guessPenalty - fuzzyPenalty - timePenalty - hintPenalty);

  return {
    score,
    baseScore: SCORING.BASE_SCORE,
    guessPenalty,
    fuzzyPenalty,
    timePenalty,
    hintPenalty
  };
} 