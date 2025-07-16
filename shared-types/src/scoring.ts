/**
 * Shared scoring types and constants for Un-Define v2
 * 
 * MAJOR CHANGE (December 2024): Simplified from penalty-based to positive reward system
 * 
 * OLD SYSTEM: score = 1000 - penalties
 * NEW SYSTEM: score = base_points_for_guess + bonuses - time_penalty
 */

/**
 * IMPROVED SCORING CONSTANTS
 * 
 * Philosophy:
 * - Start perfect, lose points for inefficiency
 * - Reward fuzzy matches with bonus points
 * - Consistent penalty structure for all factors
 */
export const SCORING = {
  // Start with perfect score
  PERFECT_SCORE: 1000,
  
  // Penalty for each guess after the first
  GUESS_PENALTY: 100,
  
  // Bonus points for helpful fuzzy matches
  FUZZY_BONUS: 50,
  
  // Time penalty (1 point per 10 seconds)
  TIME_PENALTY_PER_10_SECONDS: 1,
} as const;

/**
 * UPDATED: Input parameters for score calculation
 */
export interface ScoreParams {
  guessesUsed: number;
  fuzzyMatches?: number;
  completionTimeSeconds: number;
  isWon: boolean;
}

/**
 * UPDATED: Score calculation result with improved structure
 */
export interface ScoreResult {
  score: number;
  baseScore: number;        // Perfect score minus guess penalty
  fuzzyBonus: number;       // Bonus points for fuzzy matches
  timePenalty: number;      // Time penalty (1 point per 10 seconds)
  
  // Legacy fields for backward compatibility (will be removed later)
  guessPenalty: number;     // DEPRECATED: Always 0 in new system
  hintPenalty: number;      // DEPRECATED: Always 0 (hints not implemented)
}

/**
 * IMPROVED: Calculate game score using consistent penalty system
 * 
 * NEW FORMULA:
 * - Start with perfect score (1000)
 * - Subtract penalty for each guess after first (100 per guess)
 * - Add bonus for fuzzy matches (50 per match)
 * - Subtract time penalty (1 per 10 seconds)
 * 
 * EXAMPLES:
 * - Perfect game (1 guess, 30s): 1000 - 0 + 0 - 3 = 997 points
 * - Good game (2 guesses, 1 fuzzy, 30s): 1000 - 100 + 50 - 3 = 947 points
 * - Average game (2 guesses, no fuzzy, 30s): 1000 - 100 + 0 - 3 = 897 points
 * - Slower game (3 guesses, 2 fuzzy, 60s): 1000 - 200 + 100 - 6 = 894 points
 */
export function calculateScore(params: ScoreParams): ScoreResult {
  const { guessesUsed, fuzzyMatches = 0, completionTimeSeconds, isWon } = params;

  // No score if game not won
  if (!isWon) {
    return {
      score: 0,
      baseScore: 0,
      fuzzyBonus: 0,
      timePenalty: 0,
      guessPenalty: 0,  // Legacy compatibility
      hintPenalty: 0    // Legacy compatibility
    };
  }

  // Start with perfect score, subtract penalty for extra guesses
  const baseScore = SCORING.PERFECT_SCORE - (guessesUsed - 1) * SCORING.GUESS_PENALTY;

  // Fuzzy matches give BONUS points (reward close attempts)
  const fuzzyBonus = fuzzyMatches * SCORING.FUZZY_BONUS;

  // Time penalty (1 point per 10 seconds)
  const timePenalty = Math.floor(completionTimeSeconds / 10) * SCORING.TIME_PENALTY_PER_10_SECONDS;

  // Calculate final score (ensure it's never negative)
  const score = Math.max(0, baseScore + fuzzyBonus - timePenalty);

  return {
    score,
    baseScore,
    fuzzyBonus,
    timePenalty,
    guessPenalty: 0,  // DEPRECATED: Always 0 in new system, kept for backward compatibility
    hintPenalty: 0    // DEPRECATED: Always 0 (hints not implemented)
  };
} 