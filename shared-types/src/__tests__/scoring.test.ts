import { calculateScore, SCORING } from '../scoring';

describe('calculateScore', () => {
  it('returns 0 for lost games', () => {
    const result = calculateScore({
      guessesUsed: 3,
      completionTimeSeconds: 60,
      usedHint: false,
      isWon: false
    });

    expect(result.score).toBe(0);
    expect(result.baseScore).toBe(SCORING.BASE_SCORE);
    expect(result.guessPenalty).toBe(0);
    expect(result.fuzzyPenalty).toBe(0);
    expect(result.timePenalty).toBe(0);
    expect(result.hintPenalty).toBe(0);
  });

  it('returns full score for perfect game', () => {
    const result = calculateScore({
      guessesUsed: 1,
      completionTimeSeconds: 5,
      usedHint: false,
      isWon: true
    });

    expect(result.score).toBe(SCORING.BASE_SCORE);
    expect(result.guessPenalty).toBe(0);
    expect(result.fuzzyPenalty).toBe(0);
    expect(result.timePenalty).toBe(0);
    expect(result.hintPenalty).toBe(0);
  });

  it('applies guess penalty correctly', () => {
    const result = calculateScore({
      guessesUsed: 3,
      completionTimeSeconds: 5,
      usedHint: false,
      isWon: true
    });

    expect(result.guessPenalty).toBe(SCORING.GUESS_PENALTY * 2); // 2 guesses after first
    expect(result.score).toBe(SCORING.BASE_SCORE - (SCORING.GUESS_PENALTY * 2));
  });

  it('applies fuzzy penalty correctly', () => {
    const result = calculateScore({
      guessesUsed: 2,
      fuzzyMatches: 3,
      completionTimeSeconds: 5,
      usedHint: false,
      isWon: true
    });

    expect(result.fuzzyPenalty).toBe(SCORING.FUZZY_PENALTY * 3);
    expect(result.score).toBe(
      SCORING.BASE_SCORE - 
      SCORING.GUESS_PENALTY - // 1 extra guess
      (SCORING.FUZZY_PENALTY * 3) // 3 fuzzy matches
    );
  });

  it('applies time penalty correctly', () => {
    const result = calculateScore({
      guessesUsed: 1,
      completionTimeSeconds: 100,
      usedHint: false,
      isWon: true
    });

    expect(result.timePenalty).toBe(SCORING.TIME_PENALTY_PER_10_SECONDS * 10); // 100 seconds = 10 * 10s
    expect(result.score).toBe(SCORING.BASE_SCORE - (SCORING.TIME_PENALTY_PER_10_SECONDS * 10));
  });

  it('applies hint penalty correctly', () => {
    const result = calculateScore({
      guessesUsed: 1,
      completionTimeSeconds: 5,
      usedHint: true,
      isWon: true
    });

    expect(result.hintPenalty).toBe(SCORING.HINT_PENALTY);
    expect(result.score).toBe(SCORING.BASE_SCORE - SCORING.HINT_PENALTY);
  });

  it('combines all penalties correctly including fuzzy matches', () => {
    const result = calculateScore({
      guessesUsed: 3,      // 2 extra guesses
      fuzzyMatches: 2,     // 2 fuzzy matches
      completionTimeSeconds: 100, // 10 * 10s
      usedHint: true,      // Used hint
      isWon: true
    });

    const expectedPenalties = {
      guess: SCORING.GUESS_PENALTY * 2,
      fuzzy: SCORING.FUZZY_PENALTY * 2,
      time: SCORING.TIME_PENALTY_PER_10_SECONDS * 10,
      hint: SCORING.HINT_PENALTY
    };

    expect(result.guessPenalty).toBe(expectedPenalties.guess);
    expect(result.fuzzyPenalty).toBe(expectedPenalties.fuzzy);
    expect(result.timePenalty).toBe(expectedPenalties.time);
    expect(result.hintPenalty).toBe(expectedPenalties.hint);
    expect(result.score).toBe(
      SCORING.BASE_SCORE - 
      expectedPenalties.guess - 
      expectedPenalties.fuzzy -
      expectedPenalties.time - 
      expectedPenalties.hint
    );
  });

  it('never returns negative score', () => {
    const result = calculateScore({
      guessesUsed: 20,     // Lots of guesses
      fuzzyMatches: 10,    // Lots of fuzzy matches
      completionTimeSeconds: 1000, // Long time
      usedHint: true,      // Used hint
      isWon: true
    });

    expect(result.score).toBe(0);
    expect(result.guessPenalty).toBeGreaterThan(0);
    expect(result.fuzzyPenalty).toBeGreaterThan(0);
    expect(result.timePenalty).toBeGreaterThan(0);
    expect(result.hintPenalty).toBeGreaterThan(0);
  });

  it('handles fuzzy matches with default value of 0', () => {
    const result = calculateScore({
      guessesUsed: 2,
      // fuzzyMatches not provided - should default to 0
      completionTimeSeconds: 30,
      usedHint: false,
      isWon: true
    });

    expect(result.fuzzyPenalty).toBe(0);
    expect(result.score).toBe(
      SCORING.BASE_SCORE - 
      SCORING.GUESS_PENALTY - // 1 extra guess
      30 // 3 * 10 second penalty
    );
  });
}); 