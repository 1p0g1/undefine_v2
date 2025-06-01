/**
 * Shared scoring types and constants for Un-Define v2
 * 
 * MAJOR CHANGE (December 2024): Simplified from penalty-based to positive reward system
 * 
 * OLD SYSTEM: score = 1000 - penalties
 * NEW SYSTEM: score = base_points_for_guess + bonuses - time_penalty
 */

/**
 * NEW SIMPLIFIED SCORING CONSTANTS
 * 
 * Philosophy:
 * - Reward early guessing with higher base scores
 * - Reward fuzzy matches with bonus points (not penalties!)
 * - Only penalize for time (encourages quick thinking)
 */
export const SCORING = {
  // Base scores by guess number (index 0 = guess 1, index 1 = guess 2, etc.)
  GUESS_BASE_SCORES: [1000, 900, 800, 700, 600, 500],
  
  // Bonus points for helpful fuzzy matches
  FUZZY_BONUS: 25,
  
  // Time penalty (FIXED: was 10x too high, now correctly 1 point per 10 seconds)
  TIME_PENALTY_PER_10_SECONDS: 1,
  
  // Future: Hint penalty (when hints are implemented)
  HINT_PENALTY: 200,
} as const;

/**
 * UPDATED: Input parameters for score calculation
 */
export interface ScoreParams {
  guessesUsed: number;
  fuzzyMatches?: number;
  completionTimeSeconds: number;
  usedHint?: boolean;  // Made optional since hints not implemented yet
  isWon: boolean;
}

/**
 * UPDATED: Score calculation result with new positive structure
 */
export interface ScoreResult {
  score: number;
  baseScore: number;        // Points for guess number (1000 for guess 1, 900 for guess 2, etc.)
  fuzzyBonus: number;       // CHANGED: From penalty to bonus!
  timePenalty: number;      // FIXED: Now correctly 1 point per 10 seconds
  hintPenalty: number;      // Kept for future hint implementation
  
  // Legacy fields for backward compatibility (will be removed later)
  guessPenalty: number;     // DEPRECATED: Always 0 in new system
}

/**
 * COMPLETELY REWRITTEN: Calculate game score using simplified positive system
 * 
 * NEW FORMULA:
 * - Base score depends on guess number: [1000, 900, 800, 700, 600, 500]
 * - Fuzzy matches ADD bonus points (reward close attempts)
 * - Time penalty subtracts 1 point per 10 seconds
 * - Hints subtract 200 points (when implemented)
 * 
 * EXAMPLES:
 * - Perfect game (1 guess, 30s): 1000 + 0 - 3 = 997 points
 * - Good game (2 guesses, 1 fuzzy, 30s): 900 + 25 - 3 = 922 points
 * - Average game (2 guesses, no fuzzy, 30s): 900 + 0 - 3 = 897 points
 * - Slower game (3 guesses, 2 fuzzy, 60s): 800 + 50 - 6 = 844 points
 */
export function calculateScore(params: ScoreParams): ScoreResult {
  const { guessesUsed, fuzzyMatches = 0, completionTimeSeconds, usedHint = false, isWon } = params;

  // No score if game not won
  if (!isWon) {
    return {
      score: 0,
      baseScore: 0,
      fuzzyBonus: 0,
      timePenalty: 0,
      hintPenalty: 0,
      guessPenalty: 0  // Legacy compatibility
    };
  }

  // NEW: Base score depends on guess number (earlier guesses = more points)
  const guessIndex = Math.min(guessesUsed - 1, SCORING.GUESS_BASE_SCORES.length - 1);
  const baseScore = SCORING.GUESS_BASE_SCORES[guessIndex];

  // NEW: Fuzzy matches give BONUS points (reward close attempts)
  const fuzzyBonus = fuzzyMatches * SCORING.FUZZY_BONUS;

  // FIXED: Time penalty now correctly 1 point per 10 seconds (was 10x too high)
  const timePenalty = Math.floor(completionTimeSeconds / 10) * SCORING.TIME_PENALTY_PER_10_SECONDS;

  // Future: Hint penalty
  const hintPenalty = usedHint ? SCORING.HINT_PENALTY : 0;

  // Calculate final score (ensure it's never negative)
  const score = Math.max(0, baseScore + fuzzyBonus - timePenalty - hintPenalty);

  return {
    score,
    baseScore,
    fuzzyBonus,
    timePenalty,
    hintPenalty,
    guessPenalty: 0  // DEPRECATED: Always 0 in new system, kept for backward compatibility
  };
} 