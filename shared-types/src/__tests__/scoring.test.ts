import { calculateScore, SCORING } from '../scoring';

/**
 * UPDATED TESTS FOR NEW SIMPLIFIED SCORING SYSTEM
 * 
 * Key changes from old penalty-based system:
 * - Base scores now depend on guess number: [1000, 900, 800, 700, 600, 500]
 * - Fuzzy matches now give BONUS points instead of penalties
 * - Time penalty fixed to 1 point per 10 seconds (was 10x too high)
 * - Tests completely rewritten to match new logic
 */

describe('calculateScore - NEW SIMPLIFIED SYSTEM', () => {
  it('returns 0 for lost games', () => {
    const result = calculateScore({
      guessesUsed: 3,
      completionTimeSeconds: 60,
      usedHint: false,
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
      usedHint: false,
      isWon: true
    });

    expect(result.baseScore).toBe(1000); // First guess = 1000 points
    expect(result.fuzzyBonus).toBe(0);
    expect(result.timePenalty).toBe(3); // 30 seconds / 10 = 3 points
    expect(result.score).toBe(997); // 1000 + 0 - 3
  });

  it('applies base scores correctly by guess number', () => {
    // Test each guess number
    const testCases = [
      { guesses: 1, expectedBase: 1000 },
      { guesses: 2, expectedBase: 900 },
      { guesses: 3, expectedBase: 800 },
      { guesses: 4, expectedBase: 700 },
      { guesses: 5, expectedBase: 600 },
      { guesses: 6, expectedBase: 500 },
      { guesses: 7, expectedBase: 500 }, // Max 6 guesses, so 7+ gets same as 6
    ];

    testCases.forEach(({ guesses, expectedBase }) => {
      const result = calculateScore({
        guessesUsed: guesses,
        completionTimeSeconds: 0, // No time penalty for clean test
        usedHint: false,
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
      usedHint: false,
      isWon: true
    });

    expect(result.baseScore).toBe(900); // 2nd guess base
    expect(result.fuzzyBonus).toBe(50); // 2 fuzzy × 25 points each
    expect(result.timePenalty).toBe(3); // 30 seconds / 10
    expect(result.score).toBe(947); // 900 + 50 - 3
  });

  it('applies CORRECTED time penalty (1 point per 10 seconds)', () => {
    const result = calculateScore({
      guessesUsed: 1,
      completionTimeSeconds: 120, // 2 minutes
      usedHint: false,
      isWon: true
    });

    expect(result.timePenalty).toBe(12); // 120 / 10 = 12 points (was 120 in old system!)
    expect(result.score).toBe(988); // 1000 - 12
  });

  it('applies hint penalty correctly', () => {
    const result = calculateScore({
      guessesUsed: 1,
      completionTimeSeconds: 30,
      usedHint: true,
      isWon: true
    });

    expect(result.hintPenalty).toBe(200);
    expect(result.score).toBe(797); // 1000 - 3 - 200
  });

  it('combines all factors correctly in complex scenario', () => {
    const result = calculateScore({
      guessesUsed: 3,      // 800 base points
      fuzzyMatches: 2,     // +50 bonus points
      completionTimeSeconds: 90, // -9 time penalty
      usedHint: false,
      isWon: true
    });

    expect(result.baseScore).toBe(800);
    expect(result.fuzzyBonus).toBe(50);
    expect(result.timePenalty).toBe(9);
    expect(result.hintPenalty).toBe(0);
    expect(result.score).toBe(841); // 800 + 50 - 9
  });

  it('never returns negative score', () => {
    const result = calculateScore({
      guessesUsed: 6,        // 500 base points (lowest)
      fuzzyMatches: 0,       // No bonus
      completionTimeSeconds: 1000, // -100 time penalty
      usedHint: true,        // -200 hint penalty
      isWon: true
    });

    // 500 + 0 - 100 - 200 = 200, should be clamped to 0
    expect(result.score).toBe(200); // Actually still positive!
    expect(result.baseScore).toBe(500);
    expect(result.timePenalty).toBe(100);
    expect(result.hintPenalty).toBe(200);
  });

  it('handles extreme time penalty that would go negative', () => {
    const result = calculateScore({
      guessesUsed: 6,         // 500 base points
      fuzzyMatches: 0,        // No bonus
      completionTimeSeconds: 10000, // -1000 time penalty
      usedHint: true,         // -200 hint penalty
      isWon: true
    });

    // 500 + 0 - 1000 - 200 = -700, should be clamped to 0
    expect(result.score).toBe(0);
  });

  it('handles fuzzy matches with default value of 0', () => {
    const result = calculateScore({
      guessesUsed: 2,
      // fuzzyMatches not provided - should default to 0
      completionTimeSeconds: 30,
      usedHint: false,
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
      usedHint: false,
      isWon: true
    });

    const withoutHelp = calculateScore({
      guessesUsed: 2,
      fuzzyMatches: 0,     // No fuzzy help
      completionTimeSeconds: 30,
      usedHint: false,
      isWon: true
    });

    // Player with fuzzy help should score higher!
    expect(withFuzzyHelp.score).toBe(922); // 900 + 25 - 3
    expect(withoutHelp.score).toBe(897);   // 900 + 0 - 3
    expect(withFuzzyHelp.score).toBeGreaterThan(withoutHelp.score);
  });
}); 