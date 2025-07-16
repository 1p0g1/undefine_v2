import { calculateScore, SCORING } from '../scoring';

/**
 * UPDATED TESTS FOR IMPROVED SCORING SYSTEM
 * 
 * Key changes:
 * - Start with perfect score (1000), subtract penalty for extra guesses
 * - Fuzzy matches give BONUS points
 * - Time penalty: 1 point per 10 seconds
 * - Removed phantom hint penalty
 */

describe('calculateScore - IMPROVED SYSTEM', () => {
  it('returns 0 for lost games', () => {
    const result = calculateScore({
      guessesUsed: 3,
      completionTimeSeconds: 60,
      isWon: false
    });

    expect(result.score).toBe(0);
    expect(result.baseScore).toBe(0);
    expect(result.fuzzyBonus).toBe(0);
    expect(result.timePenalty).toBe(0);
    expect(result.hintPenalty).toBe(0);
    expect(result.guessPenalty).toBe(0); // Legacy field, always 0
  });

  it('returns correct score for perfect game (1 guess)', () => {
    const result = calculateScore({
      guessesUsed: 1,
      completionTimeSeconds: 30,
      isWon: true
    });

    expect(result.baseScore).toBe(1000); // Perfect score - 0 penalty = 1000 points
    expect(result.fuzzyBonus).toBe(0);
    expect(result.timePenalty).toBe(3); // 30 seconds / 10 = 3 points
    expect(result.score).toBe(997); // 1000 + 0 - 3
  });

  it('applies base scores correctly by guess number', () => {
    // Test each guess number with penalty system
    const testCases = [
      { guesses: 1, expectedBase: 1000 }, // 1000 - 0*100 = 1000
      { guesses: 2, expectedBase: 900 },  // 1000 - 1*100 = 900
      { guesses: 3, expectedBase: 800 },  // 1000 - 2*100 = 800
      { guesses: 4, expectedBase: 700 },  // 1000 - 3*100 = 700
      { guesses: 5, expectedBase: 600 },  // 1000 - 4*100 = 600
      { guesses: 6, expectedBase: 500 },  // 1000 - 5*100 = 500
      { guesses: 7, expectedBase: 400 },  // 1000 - 6*100 = 400
    ];

    testCases.forEach(({ guesses, expectedBase }) => {
      const result = calculateScore({
        guessesUsed: guesses,
        completionTimeSeconds: 0, // No time penalty for clean test
        isWon: true
      });

      expect(result.baseScore).toBe(expectedBase);
      expect(result.score).toBe(expectedBase); // No penalties in this test
    });
  });

  it('gives fuzzy BONUS points (not penalties)', () => {
    const result = calculateScore({
      guessesUsed: 2,
      fuzzyMatches: 2,
      completionTimeSeconds: 30,
      isWon: true
    });

    expect(result.baseScore).toBe(900); // 1000 - 1*100 = 900
    expect(result.fuzzyBonus).toBe(100); // 2 fuzzy × 50 points each
    expect(result.timePenalty).toBe(3); // 30 seconds / 10
    expect(result.score).toBe(997); // 900 + 100 - 3
  });

  it('applies CORRECTED time penalty (1 point per 10 seconds)', () => {
    const result = calculateScore({
      guessesUsed: 1,
      completionTimeSeconds: 120, // 2 minutes
      isWon: true
    });

    expect(result.timePenalty).toBe(12); // 120 / 10 = 12 points
    expect(result.score).toBe(988); // 1000 - 12
  });

  it('combines all factors correctly in complex scenario', () => {
    const result = calculateScore({
      guessesUsed: 3,      // 1000 - 2*100 = 800 base points
      fuzzyMatches: 2,     // +100 bonus points
      completionTimeSeconds: 90, // -9 time penalty
      isWon: true
    });

    expect(result.baseScore).toBe(800);
    expect(result.fuzzyBonus).toBe(100); // 2 × 50 points each
    expect(result.timePenalty).toBe(9);
    expect(result.hintPenalty).toBe(0); // Always 0 (no hints)
    expect(result.score).toBe(891); // 800 + 100 - 9
  });

  it('never returns negative score', () => {
    const result = calculateScore({
      guessesUsed: 6,        // 1000 - 5*100 = 500 base points
      fuzzyMatches: 0,       // No bonus
      completionTimeSeconds: 1000, // -100 time penalty
      isWon: true
    });

    expect(result.score).toBe(400); // 500 - 100 = 400
    expect(result.baseScore).toBe(500);
    expect(result.timePenalty).toBe(100);
    expect(result.hintPenalty).toBe(0);
  });

  it('handles extreme time penalty that would go negative', () => {
    const result = calculateScore({
      guessesUsed: 6,         // 1000 - 5*100 = 500 base points
      fuzzyMatches: 0,        // No bonus
      completionTimeSeconds: 10000, // -1000 time penalty
      isWon: true
    });

    // 500 + 0 - 1000 = -500, should be clamped to 0
    expect(result.score).toBe(0);
  });

  it('handles fuzzy matches with default value of 0', () => {
    const result = calculateScore({
      guessesUsed: 2,
      // fuzzyMatches not provided - should default to 0
      completionTimeSeconds: 30,
      isWon: true
    });

    expect(result.fuzzyBonus).toBe(0);
    expect(result.score).toBe(897); // 900 - 3
  });

  it('demonstrates superiority of fuzzy help over no help', () => {
    const withFuzzyHelp = calculateScore({
      guessesUsed: 2,
      fuzzyMatches: 1,     // Got a helpful fuzzy match
      completionTimeSeconds: 30,
      isWon: true
    });

    const withoutHelp = calculateScore({
      guessesUsed: 2,
      fuzzyMatches: 0,     // No fuzzy help
      completionTimeSeconds: 30,
      isWon: true
    });

    // Player with fuzzy help should score higher!
    expect(withFuzzyHelp.score).toBe(947); // 900 + 50 - 3
    expect(withoutHelp.score).toBe(897);   // 900 + 0 - 3
    expect(withFuzzyHelp.score).toBeGreaterThan(withoutHelp.score);
  });

  it('validates hint penalty is always 0 (no hints implemented)', () => {
    const result = calculateScore({
      guessesUsed: 3,
      fuzzyMatches: 1,
      completionTimeSeconds: 60,
      isWon: true
    });

    expect(result.hintPenalty).toBe(0);
  });
}); 