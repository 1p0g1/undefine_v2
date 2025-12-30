/**
 * Admin API: POST /api/admin/dictionary/validate
 * 
 * Validates a word against the dictionary for bonus round compatibility.
 * Proactively checks for issues BEFORE words become the word of the day.
 * 
 * Features:
 * - Checks if word exists in dictionary (exact match)
 * - Checks algorithmic variants (British→American)
 * - Shows estimated position if not found
 * - Flags potential British spellings
 * - Shows nearby dictionary words
 */

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/src/env.server';
import { withCors } from '@/lib/withCors';
import { withAdminAuth } from '@/lib/withAdminAuth';
import { 
  analyzeWordForDictionary, 
  generateAllLookupVariants,
  detectPotentialBritishSpelling 
} from '@/src/utils/spelling';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

interface ValidationResult {
  word: string;
  normalized: string;
  
  // Dictionary match status
  foundInDictionary: boolean;
  matchedVariant?: string;
  matchedWord?: string;
  lexRank?: number;
  definition?: string;
  
  // Estimation if not found
  estimatedLexRank?: number;
  positionDescription?: string;
  
  // Warnings
  warnings: string[];
  
  // Analysis
  hasSpecialChars: boolean;
  hasDiacritics: boolean;
  potentialBritish: {
    isBritish: boolean;
    pattern?: string;
    suggestedAmerican?: string;
  };
  variantsChecked: string[];
  
  // Nearby words (for context)
  nearbyWords: Array<{
    word: string;
    lexRank: number;
    distance: number;
  }>;
  
  // Bonus round compatibility
  bonusRoundCompatible: boolean;
  bonusRoundNote: string;
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

async function handler(req: NextApiRequest, res: NextApiResponse<ValidationResult | { error: string }>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { word } = req.body;

  if (!word || typeof word !== 'string') {
    return res.status(400).json({ error: 'Missing required field: word' });
  }

  const normalized = normalizeWord(word);
  const analysis = analyzeWordForDictionary(word);
  const variants = generateAllLookupVariants(word);
  const warnings: string[] = [];

  // Check for potential issues
  if (analysis.hasSpecialChars) {
    warnings.push('Word contains special characters that will be stripped during normalization');
  }
  if (analysis.hasDiacritics) {
    warnings.push('Word contains diacritics/accents that will be converted to ASCII');
  }
  if (analysis.potentialBritish.isBritish) {
    warnings.push(`Potential British spelling detected (${analysis.potentialBritish.pattern}). American equivalent: "${analysis.potentialBritish.suggestedAmerican}"`);
  }

  // Try to find the word in dictionary
  let foundInDictionary = false;
  let matchedVariant: string | undefined;
  let matchedWord: string | undefined;
  let lexRank: number | undefined;
  let definition: string | undefined;

  for (const variant of variants) {
    const { data, error } = await supabase
      .from('dictionary')
      .select('word, normalized_word, lex_rank, definition')
      .eq('normalized_word', variant)
      .limit(1)
      .single();

    if (!error && data) {
      foundInDictionary = true;
      matchedVariant = variant;
      matchedWord = data.word;
      lexRank = data.lex_rank;
      definition = data.definition?.substring(0, 200) + (data.definition?.length > 200 ? '...' : '');
      break;
    }
  }

  // If not found, estimate position
  let estimatedLexRank: number | undefined;
  let positionDescription: string | undefined;

  if (!foundInDictionary) {
    // Find neighbors
    const { data: nextWord } = await supabase
      .from('dictionary')
      .select('lex_rank, word, normalized_word')
      .gt('normalized_word', normalized)
      .order('normalized_word', { ascending: true })
      .limit(1)
      .single();

    const { data: prevWord } = await supabase
      .from('dictionary')
      .select('lex_rank, word, normalized_word')
      .lt('normalized_word', normalized)
      .order('normalized_word', { ascending: false })
      .limit(1)
      .single();

    if (nextWord && prevWord) {
      estimatedLexRank = Math.round((prevWord.lex_rank + nextWord.lex_rank) / 2);
      positionDescription = `Would appear between "${prevWord.word}" and "${nextWord.word}"`;
    } else if (nextWord) {
      estimatedLexRank = nextWord.lex_rank - 1;
      positionDescription = `Would appear before "${nextWord.word}"`;
    } else if (prevWord) {
      estimatedLexRank = prevWord.lex_rank + 1;
      positionDescription = `Would appear after "${prevWord.word}"`;
    }

    warnings.push('Word not found in dictionary - bonus round will use estimated position');
  }

  // Get nearby words for context
  const targetRank = lexRank || estimatedLexRank || 1;
  const { data: nearbyWordsData } = await supabase
    .from('dictionary')
    .select('word, lex_rank')
    .gte('lex_rank', targetRank - 15)
    .lte('lex_rank', targetRank + 15)
    .order('lex_rank', { ascending: true })
    .limit(31);

  const nearbyWords = (nearbyWordsData || []).map(w => ({
    word: w.word,
    lexRank: w.lex_rank,
    distance: Math.abs(w.lex_rank - targetRank)
  }));

  // Determine bonus round compatibility
  const bonusRoundCompatible = foundInDictionary || (estimatedLexRank !== undefined);
  const bonusRoundNote = foundInDictionary 
    ? `✓ Exact match found at rank ${lexRank}. Bonus round will work perfectly.`
    : estimatedLexRank !== undefined
      ? `⚠ Not in dictionary, but will use estimated rank ${estimatedLexRank}. Bonus round will still work, but with less precision.`
      : `✗ Could not determine position. Bonus round may not work correctly.`;

  return res.status(200).json({
    word,
    normalized,
    foundInDictionary,
    matchedVariant,
    matchedWord,
    lexRank,
    definition,
    estimatedLexRank,
    positionDescription,
    warnings,
    hasSpecialChars: analysis.hasSpecialChars,
    hasDiacritics: analysis.hasDiacritics,
    potentialBritish: analysis.potentialBritish,
    variantsChecked: variants,
    nearbyWords,
    bonusRoundCompatible,
    bonusRoundNote
  });
}

export default withCors(withAdminAuth(handler));

