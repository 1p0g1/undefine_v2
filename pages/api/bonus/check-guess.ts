/**
 * Bonus Round API: POST /api/bonus/check-guess
 * 
 * Checks a player's bonus round guess against the dictionary.
 * Calculates distance from today's word using lex_rank.
 * 
 * Scoring:
 * - Distance ≤ 10: Perfect (Gold) - 100 points
 * - Distance ≤ 20: Good (Silver) - 50 points
 * - Distance ≤ 30: Average (Bronze) - 25 points
 * - Distance > 30: Miss - 0 points
 */

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/src/env.server';
import { withCors } from '@/lib/withCors';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Scoring tiers
const SCORING = {
  PERFECT: { maxDistance: 10, tier: 'perfect', points: 100, color: 'gold' },
  GOOD: { maxDistance: 20, tier: 'good', points: 50, color: 'silver' },
  AVERAGE: { maxDistance: 30, tier: 'average', points: 25, color: 'bronze' },
  MISS: { maxDistance: Infinity, tier: 'miss', points: 0, color: 'gray' },
} as const;

type Tier = 'perfect' | 'good' | 'average' | 'miss';

interface BonusGuessRequest {
  guess: string;
  wordId: string;
  playerId: string;
  attemptNumber: number;
}

interface BonusGuessResponse {
  valid: boolean;
  guessedWord?: string;
  guessLexRank?: number;
  targetWord?: string;
  targetLexRank?: number;
  distance?: number;
  tier?: Tier;
  points?: number;
  color?: string;
  error?: string;
  message?: string;
}

/**
 * Normalize a word for dictionary lookup
 */
function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z]/g, ''); // Remove non-alpha
}

/**
 * Get the lex_rank for a word from the dictionary
 */
async function getWordLexRank(word: string): Promise<{ lexRank: number; word: string } | null> {
  const normalized = normalizeWord(word);
  
  const { data, error } = await supabase
    .from('dictionary')
    .select('lex_rank, word, normalized_word')
    .eq('normalized_word', normalized)
    .limit(1)
    .single();

  if (error || !data) {
    console.log(`[bonus/check-guess] Word not found in dictionary: ${word} (normalized: ${normalized})`);
    return null;
  }

  return { lexRank: data.lex_rank, word: data.word };
}

/**
 * Get the target word's lex_rank from today's word
 * First tries dictionary_id FK, then falls back to word lookup
 */
async function getTargetLexRank(wordId: string): Promise<{ lexRank: number; word: string } | null> {
  // First, get the word entry
  const { data: wordData, error: wordError } = await supabase
    .from('words')
    .select('word, dictionary_id')
    .eq('id', wordId)
    .single();

  if (wordError || !wordData) {
    console.error('[bonus/check-guess] Failed to fetch word:', wordError);
    return null;
  }

  // If dictionary_id is set, use it directly
  if (wordData.dictionary_id) {
    const { data: dictData, error: dictError } = await supabase
      .from('dictionary')
      .select('lex_rank, word')
      .eq('id', wordData.dictionary_id)
      .single();

    if (!dictError && dictData) {
      return { lexRank: dictData.lex_rank, word: dictData.word };
    }
  }

  // Fallback: lookup by normalized word
  return getWordLexRank(wordData.word);
}

/**
 * Calculate scoring tier based on distance
 */
function calculateTier(distance: number): typeof SCORING[keyof typeof SCORING] {
  if (distance <= SCORING.PERFECT.maxDistance) return SCORING.PERFECT;
  if (distance <= SCORING.GOOD.maxDistance) return SCORING.GOOD;
  if (distance <= SCORING.AVERAGE.maxDistance) return SCORING.AVERAGE;
  return SCORING.MISS;
}

async function handler(req: NextApiRequest, res: NextApiResponse<BonusGuessResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ valid: false, error: 'method_not_allowed', message: 'Method not allowed' });
  }

  const { guess, wordId, playerId, attemptNumber } = req.body as BonusGuessRequest;

  // Validate required fields
  if (!guess || !wordId || !playerId) {
    return res.status(400).json({
      valid: false,
      error: 'missing_fields',
      message: 'Missing required fields: guess, wordId, playerId'
    });
  }

  // Normalize and validate guess
  const normalizedGuess = normalizeWord(guess);
  if (!normalizedGuess || normalizedGuess.length < 2) {
    return res.status(400).json({
      valid: false,
      error: 'invalid_guess',
      message: 'Please enter a valid word (at least 2 letters)'
    });
  }

  console.log(`[bonus/check-guess] Processing guess: ${guess} (normalized: ${normalizedGuess}) for wordId: ${wordId}`);

  try {
    // Get the target word's lex_rank
    const targetResult = await getTargetLexRank(wordId);
    if (!targetResult) {
      return res.status(400).json({
        valid: false,
        error: 'target_not_found',
        message: 'Could not find target word in dictionary. Bonus round unavailable.'
      });
    }

    // Check if player is guessing the exact word (not allowed)
    if (normalizedGuess === normalizeWord(targetResult.word)) {
      return res.status(400).json({
        valid: false,
        error: 'same_word',
        message: "You already guessed today's word! Try a nearby word."
      });
    }

    // Get the guessed word's lex_rank
    const guessResult = await getWordLexRank(guess);
    if (!guessResult) {
      return res.status(200).json({
        valid: false,
        error: 'word_not_found',
        message: 'Word not found in dictionary. Try another word!'
      });
    }

    // Calculate distance and tier
    const distance = Math.abs(guessResult.lexRank - targetResult.lexRank);
    const tierInfo = calculateTier(distance);

    console.log(`[bonus/check-guess] Result: ${guess} (rank ${guessResult.lexRank}) vs ${targetResult.word} (rank ${targetResult.lexRank}) = distance ${distance} = ${tierInfo.tier}`);

    return res.status(200).json({
      valid: true,
      guessedWord: guessResult.word,
      guessLexRank: guessResult.lexRank,
      targetWord: targetResult.word,
      targetLexRank: targetResult.lexRank,
      distance,
      tier: tierInfo.tier as Tier,
      points: tierInfo.points,
      color: tierInfo.color
    });

  } catch (error) {
    console.error('[bonus/check-guess] Unexpected error:', error);
    return res.status(500).json({
      valid: false,
      error: 'server_error',
      message: 'An unexpected error occurred'
    });
  }
}

export default withCors(handler);

