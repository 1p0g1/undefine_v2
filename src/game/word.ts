import { createClient } from '@supabase/supabase-js';
import { env } from '@/src/env.server';
import { WordResponseShape } from '@/shared-types/src/word';
import { mapWordRowToResponse } from '@/server/src/utils/wordMapper';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Get a new word for the game
 * In production: Returns today's word
 * In development: Falls back to random word if no word set for today
 */
export async function getNewWord(): Promise<{ word: WordResponseShape; isFallback: boolean }> {
  try {
    // Get today's date in YYYY-MM-DD format
    const now = new Date();
    const today = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    
    // Try to get today's word first - only select columns that exist
    const { data: todayWord, error: todayError } = await supabase
      .from('words')
      .select(`
        id,
        word,
        definition,
        date,
        theme
      `)
      .eq('date', today)
      .single();

    if (todayError) {
      console.error('[getNewWord] Failed to get word of the day:', todayError);
      throw new Error('Failed to get word of the day');
    }

    if (!todayWord) {
      console.error('[getNewWord] No word found for today:', today);
      throw new Error('No word found for today');
    }

    return {
      word: mapWordRowToResponse(todayWord),
      isFallback: false
    };
  } catch (error) {
    console.error('[getNewWord] Error:', error);
    throw error;
  }
} 