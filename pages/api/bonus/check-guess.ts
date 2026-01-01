/**
 * Bonus Round API: POST /api/bonus/check-guess
 * 
 * Checks a player's bonus round guess against the dictionary.
 * Calculates distance from today's word using lex_rank.
 * 
 * Features:
 * - Algorithmic British→American spelling conversion (no static table needed)
 * - ONLY accepts real dictionary words (no made-up words)
 * - Target word position can be estimated if needed (for words not linked to dictionary)
 * 
 * Scoring:
 * - Distance ≤ 10: Perfect (Gold) - 100 points
 * - Distance ≤ 25: Good (Silver) - 50 points
 * - Distance ≤ 50: Average (Bronze) - 25 points
 * - Distance > 50: Miss - 0 points
 */

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/src/env.server';
import { withCors } from '@/lib/withCors';
import { generateAllLookupVariants } from '@/src/utils/spelling';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Scoring tiers (loosened for word derivatives like love/lovely/loving)
const SCORING = {
  PERFECT: { maxDistance: 10, tier: 'perfect', points: 100, color: 'gold' },
  GOOD: { maxDistance: 25, tier: 'good', points: 50, color: 'silver' },
  AVERAGE: { maxDistance: 50, tier: 'average', points: 25, color: 'bronze' },
  MISS: { maxDistance: Infinity, tier: 'miss', points: 0, color: 'gray' },
} as const;

type Tier = 'perfect' | 'good' | 'average' | 'miss';

interface BonusGuessRequest {
  guess: string;
  wordId: string;
  playerId: string;
  attemptNumber: number;
  gameSessionId?: string; // Optional - for persisting to database
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
  isEstimated?: boolean; // True if lex_rank was estimated (word not in dictionary)
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
 * Uses algorithmic British→American conversion (pattern-based, not lookup table)
 * Returns the first match from any variant
 */
async function getWordLexRank(word: string): Promise<{ lexRank: number; word: string; isEstimated: boolean } | null> {
  // Generate all possible lookup variants (including American spellings)
  const variants = generateAllLookupVariants(word);
  console.log(`[bonus/check-guess] Looking up variants for "${word}":`, variants);
  
  // Try each variant until we find a match
  for (const variant of variants) {
    const { data, error } = await supabase
      .from('dictionary')
      .select('lex_rank, word, normalized_word')
      .eq('normalized_word', variant)
      .limit(1)
      .single();

    if (!error && data) {
      console.log(`[bonus/check-guess] Found match: "${variant}" → ${data.word} (rank ${data.lex_rank})`);
      return { lexRank: data.lex_rank, word: data.word, isEstimated: false };
    }
  }

  console.log(`[bonus/check-guess] No exact match found for "${word}", estimating position...`);
  return null;
}

/**
 * Estimate where a word would appear in the dictionary (by lex_rank)
 * Uses binary search to find the nearest neighbors
 * 
 * This ensures the bonus round ALWAYS works, even for words not in the dictionary
 */
async function estimateWordLexRank(word: string): Promise<{ lexRank: number; word: string; isEstimated: boolean }> {
  const normalized = normalizeWord(word);
  
  // Find the word that would come immediately after this one alphabetically
  const { data: nextWord } = await supabase
    .from('dictionary')
    .select('lex_rank, word, normalized_word')
    .gt('normalized_word', normalized)
    .order('normalized_word', { ascending: true })
    .limit(1)
    .single();

  // Find the word that would come immediately before this one alphabetically
  const { data: prevWord } = await supabase
    .from('dictionary')
    .select('lex_rank, word, normalized_word')
    .lt('normalized_word', normalized)
    .order('normalized_word', { ascending: false })
    .limit(1)
    .single();

  let estimatedRank: number;
  
  if (nextWord && prevWord) {
    // Word would be between these two - use midpoint
    estimatedRank = Math.round((prevWord.lex_rank + nextWord.lex_rank) / 2);
    console.log(`[bonus/check-guess] Estimated rank for "${normalized}": ${estimatedRank} (between "${prevWord.normalized_word}" at ${prevWord.lex_rank} and "${nextWord.normalized_word}" at ${nextWord.lex_rank})`);
  } else if (nextWord) {
    // Word would be at the very beginning
    estimatedRank = nextWord.lex_rank - 1;
    console.log(`[bonus/check-guess] Estimated rank for "${normalized}": ${estimatedRank} (before "${nextWord.normalized_word}")`);
  } else if (prevWord) {
    // Word would be at the very end
    estimatedRank = prevWord.lex_rank + 1;
    console.log(`[bonus/check-guess] Estimated rank for "${normalized}": ${estimatedRank} (after "${prevWord.normalized_word}")`);
  } else {
    // Empty dictionary - shouldn't happen
    estimatedRank = 1;
    console.log(`[bonus/check-guess] Dictionary appears empty, using rank 1`);
  }

  return { lexRank: estimatedRank, word: normalized, isEstimated: true };
}

/**
 * Get the target word's lex_rank from today's word
 * First tries dictionary_id FK, then falls back to word lookup, then estimation
 */
async function getTargetLexRank(wordId: string): Promise<{ lexRank: number; word: string; isEstimated: boolean } | null> {
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

  // If dictionary_id is set, use it directly (fastest path)
  if (wordData.dictionary_id) {
    const { data: dictData, error: dictError } = await supabase
      .from('dictionary')
      .select('lex_rank, word')
      .eq('id', wordData.dictionary_id)
      .single();

    if (!dictError && dictData) {
      console.log(`[bonus/check-guess] Target word via FK: ${dictData.word} (rank ${dictData.lex_rank})`);
      return { lexRank: dictData.lex_rank, word: dictData.word, isEstimated: false };
    }
  }

  // Fallback: lookup by word (with algorithmic variant matching)
  const lookupResult = await getWordLexRank(wordData.word);
  if (lookupResult) {
    return lookupResult;
  }

  // Final fallback: estimate position
  console.log(`[bonus/check-guess] Target word "${wordData.word}" not in dictionary, estimating position`);
  return estimateWordLexRank(wordData.word);
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

  const { guess, wordId, playerId, attemptNumber, gameSessionId } = req.body as BonusGuessRequest;

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
    // Get the target word's lex_rank (always succeeds via estimation fallback)
    const targetResult = await getTargetLexRank(wordId);
    if (!targetResult) {
      return res.status(400).json({
        valid: false,
        error: 'target_not_found',
        message: 'Could not find target word. Please try again.'
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

    // Get the guessed word's lex_rank - MUST be a real dictionary word
    const guessResult = await getWordLexRank(guess);
    if (!guessResult) {
      // Word not in dictionary - reject it (no made-up words allowed)
      return res.status(400).json({
        valid: false,
        error: 'not_in_dictionary',
        message: `"${guess}" is not in our dictionary. Try a real word!`
      });
    }

    // Calculate distance and tier
    const distance = Math.abs(guessResult.lexRank - targetResult.lexRank);
    const tierInfo = calculateTier(distance);

    console.log(`[bonus/check-guess] Result: ${guess} (rank ${guessResult.lexRank}${guessResult.isEstimated ? ' est.' : ''}) vs ${targetResult.word} (rank ${targetResult.lexRank}${targetResult.isEstimated ? ' est.' : ''}) = distance ${distance} = ${tierInfo.tier}`);

    // Save to database if gameSessionId provided
    if (gameSessionId) {
      const { error: insertError } = await supabase
        .from('bonus_round_guesses')
        .insert({
          game_session_id: gameSessionId,
          player_id: playerId,
          word_id: wordId,
          attempt_number: attemptNumber,
          guess: guessResult.word,
          guess_lex_rank: guessResult.lexRank,
          target_lex_rank: targetResult.lexRank,
          distance,
          tier: tierInfo.tier,
          is_valid: true
        });

      if (insertError) {
        // Log but don't fail - storage is optional
        console.error('[bonus/check-guess] Failed to save guess:', insertError);
      } else {
        console.log('[bonus/check-guess] Saved bonus guess to database');
      }
    }

    return res.status(200).json({
      valid: true,
      guessedWord: guessResult.word,
      guessLexRank: guessResult.lexRank,
      targetWord: targetResult.word,
      targetLexRank: targetResult.lexRank,
      distance,
      tier: tierInfo.tier as Tier,
      points: tierInfo.points,
      color: tierInfo.color,
      isEstimated: guessResult.isEstimated || targetResult.isEstimated
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

