import { createClient } from '@supabase/supabase-js';
import { env } from '@/src/env.server';
import { WordResponse, WordResponseShape } from '@/shared-types/src/word';
import { mapWordRowToResponse } from '@/server/src/utils/wordMapper';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Get a new word for the game
 * In production: Returns today's word
 * In development: Falls back to random word if no word set for today
 */
export async function getNewWord(): Promise<WordResponse> {
  try {
    // Get today's date in YYYY-MM-DD format
    const now = new Date();
    const today = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    
    // Try to get today's word first
    const { data: todayWord, error: todayError } = await supabase
      .from('words')
      .select('*')
      .eq('date', today)
      .single();

    const isProd = process.env.NODE_ENV === 'production';
    if (todayError && isProd) {
      throw new Error('Failed to get word of the day');
    }

    // In development, fall back to random word if no word set for today
    if (!todayWord && !isProd) {
      const { data: randomWord, error: randomError } = await supabase
        .from('words')
        .select('*')
        .limit(1)
        .single();

      if (randomError) {
        throw new Error('Failed to get random word');
      }

      return {
        word: mapWordRowToResponse(randomWord),
        gameId: crypto.randomUUID(),
        isFallback: true
      };
    }

    if (!todayWord) {
      throw new Error('No word available');
    }

    return {
      word: mapWordRowToResponse(todayWord),
      gameId: crypto.randomUUID(),
      isFallback: false
    };

  } catch (error) {
    console.error('[getNewWord] Error:', error);
    throw error;
  }
} 