import { createClient } from '@supabase/supabase-js';
import { env } from '@/src/env.server';
import { WordResponseShape } from '@/shared-types/src/word';
import { mapWordRowToResponse } from '@/server/src/utils/wordMapper';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Get a new word for the game
 * In production: Returns today's word, falls back to most recent word if none for today
 * In development: Falls back to random word if no word set for today
 */
export async function getNewWord(): Promise<{ word: WordResponseShape; isFallback: boolean }> {
  try {
    // Get today's date in YYYY-MM-DD format
    const now = new Date();
    const today = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    
    console.log('[getNewWord] Looking for word for date:', today);
    
    // Try to get today's word first
    const { data: todayWord, error: todayError } = await supabase
      .from('words')
      .select(`
        id,
        word,
        definition,
        first_letter,
        in_a_sentence,
        equivalents,
        number_of_letters,
        etymology,
        difficulty,
        date
      `)
      .eq('date', today)
      .single();

    if (!todayError && todayWord) {
      console.log('[getNewWord] Found word for today:', todayWord.word);
      return {
        word: mapWordRowToResponse(todayWord),
        isFallback: false
      };
    }

    console.log('[getNewWord] No word found for today, falling back to most recent word');
    
    // Fall back to most recent word
    const { data: fallbackWord, error: fallbackError } = await supabase
      .from('words')
      .select(`
        id,
        word,
        definition,
        first_letter,
        in_a_sentence,
        equivalents,
        number_of_letters,
        etymology,
        difficulty,
        date
      `)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (fallbackError || !fallbackWord) {
      console.error('[getNewWord] Failed to get fallback word:', fallbackError);
      throw new Error('No words available in database');
    }

    console.log('[getNewWord] Using fallback word:', fallbackWord.word, 'from date:', fallbackWord.date);
    
    return {
      word: mapWordRowToResponse(fallbackWord),
      isFallback: true
    };
  } catch (error) {
    console.error('[getNewWord] Error:', error);
    throw error;
  }
} 