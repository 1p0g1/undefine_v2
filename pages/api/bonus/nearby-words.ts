/**
 * Bonus Round API: GET /api/bonus/nearby-words
 * 
 * Returns the 10 words above and below a target word in the dictionary.
 * Used to show players what the "correct" answers were in the bonus round.
 */

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/src/env.server';
import { withCors } from '@/lib/withCors';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

interface NearbyWordsResponse {
  above: string[];
  below: string[];
  targetWord?: string;
  targetLexRank?: number;
  error?: string;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NearbyWordsResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ above: [], below: [], error: 'Method not allowed' });
  }

  try {
    const { wordId } = req.query;

    if (!wordId || typeof wordId !== 'string') {
      return res.status(400).json({ above: [], below: [], error: 'Missing wordId' });
    }

    // Get the word's dictionary entry
    const { data: wordData, error: wordError } = await supabase
      .from('words')
      .select('word, dictionary_id')
      .eq('id', wordId)
      .single();

    if (wordError || !wordData) {
      return res.status(404).json({ above: [], below: [], error: 'Word not found' });
    }

    if (!wordData.dictionary_id) {
      return res.status(400).json({ above: [], below: [], error: 'Word not linked to dictionary' });
    }

    // Get the dictionary entry to find lex_rank
    const { data: dictEntry, error: dictError } = await supabase
      .from('dictionary')
      .select('lex_rank, normalized_word')
      .eq('id', wordData.dictionary_id)
      .single();

    if (dictError || !dictEntry) {
      return res.status(404).json({ above: [], below: [], error: 'Dictionary entry not found' });
    }

    const targetLexRank = dictEntry.lex_rank;

    // Get 10 words ABOVE (lower lex_rank)
    const { data: aboveWords, error: aboveError } = await supabase
      .from('dictionary')
      .select('normalized_word')
      .lt('lex_rank', targetLexRank)
      .order('lex_rank', { ascending: false })
      .limit(10);

    if (aboveError) {
      console.error('[nearby-words] Error fetching above words:', aboveError);
    }

    // Get 10 words BELOW (higher lex_rank)
    const { data: belowWords, error: belowError } = await supabase
      .from('dictionary')
      .select('normalized_word')
      .gt('lex_rank', targetLexRank)
      .order('lex_rank', { ascending: true })
      .limit(10);

    if (belowError) {
      console.error('[nearby-words] Error fetching below words:', belowError);
    }

    // Format response - reverse above words so closest is last
    const above = (aboveWords || []).map(w => w.normalized_word).reverse();
    const below = (belowWords || []).map(w => w.normalized_word);

    return res.status(200).json({
      above,
      below,
      targetWord: wordData.word,
      targetLexRank
    });

  } catch (error) {
    console.error('[nearby-words] Error:', error);
    return res.status(500).json({ above: [], below: [], error: 'Internal server error' });
  }
}

export default withCors(handler);

