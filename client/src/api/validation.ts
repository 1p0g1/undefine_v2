import { z } from 'zod';

/**
 * Validates an API response against a Zod schema
 * @param data The response data to validate
 * @param schema The Zod schema to validate against
 * @returns The validated and typed data
 * @throws {Error} if validation fails
 */
export function validateApiResponse<T>(data: unknown, schema: z.ZodType<T>): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('API Response Validation Error:', {
        errors: error.errors,
        received: data,
      });
      throw new Error(`Invalid API response: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

// Common response schemas
export const WordResponseSchema = z.object({
  word: z.object({
    id: z.string(),
    word: z.string(),
    definition: z.string(),
    first_letter: z.string(),
    in_a_sentence: z.string(),
    equivalents: z.string(),
    number_of_letters: z.number(),
    etymology: z.string(),
    difficulty: z.string(),
    date: z.string(),
  }),
  gameId: z.string(),
  isFallback: z.boolean(),
});

export const GuessResponseSchema = z.object({
  isCorrect: z.boolean(),
  score: z.number(),
  guess: z.string(),
  isFuzzy: z.boolean(),
  fuzzyPositions: z.array(z.number()),
  message: z.string().optional(),
  gameId: z.string(),
  wordId: z.string(),
  gameOver: z.boolean(),
  revealedClues: z.array(z.string()),
  usedHint: z.boolean(),
});

export const LeaderboardResponseSchema = z.object({
  leaderboard: z.object({
    entries: z.array(z.object({
      playerId: z.string(),
      score: z.number(),
      rank: z.number(),
    })),
    playerRank: z.object({
      rank: z.number(),
      score: z.number(),
    }).optional(),
  }),
  playerRank: z.object({
    rank: z.number(),
    score: z.number(),
  }),
}); 