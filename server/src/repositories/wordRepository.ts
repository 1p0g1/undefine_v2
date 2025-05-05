/**
 * Word repository for Un-Define v2
 */

import { supabase } from '../config/SupabaseClient.js';
import { WordEntry } from '../types/database.js';
import { logger } from '../utils/logger.js';
import { Errors } from '../utils/errors.js';

// Define the clue order as a constant
export const CLUE_ORDER = ['D', 'E', 'F', 'I', 'N', 'E2'] as const;

/**
 * Validate that a word has all required DEFINE clues
 */
const validateWordClues = (word: WordEntry): void => {
  if (!word.definition) throw Errors.InternalServer('Word missing definition (D)');
  if (!word.equivalents) throw Errors.InternalServer('Word missing equivalents (E)');
  if (!word.first_letter) throw Errors.InternalServer('Word missing first letter (F)');
  if (!word.in_a_sentence) throw Errors.InternalServer('Word missing usage example (I)');
  if (!word.number_of_letters) throw Errors.InternalServer('Word missing letter count (N)');
  if (!word.etymology) throw Errors.InternalServer('Word missing etymology (E2)');
};

/**
 * Get the word of the day
 */
export const getWordOfTheDay = async (): Promise<WordEntry> => {
  try {
    logger.info('Fetching word of the day');

    // DEV MODE: Always return sweet
    if (process.env.NODE_ENV !== 'production') {
      return {
        id: 'dev-sweet',
        word: 'sweet',
        definition:
          'Having the pleasant taste characteristic of sugar or honey; pleasing to the senses. (adjective)',
        equivalents: 'Sugary,honeyed,pleasant,delightful,agreeable',
        first_letter: 'S',
        in_a_sentence:
          'The cake was so ______ that everyone wanted a second slice.',
        number_of_letters: 5,
        difficulty: 'Easy',
        etymology:
          "Old English swete, of Germanic origin; related to Dutch zoet and German süß.",
        created_at: new Date().toISOString(),
        is_word_of_day: true,
        word_of_day_date: null,
      };
    }

    if (!supabase) {
      logger.error('Supabase client not initialized');
      throw Errors.InternalServer('Database client not initialized');
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().slice(0, 10);

    // Query the words table for today's word using the 'date' column
    const { data } = await supabase.from('words').select('*').eq('date', today).maybeSingle();

    if (!data) {
      logger.warn('No word found for today, using fallback', { date: today });
      // Provide a hardcoded fallback WordEntry
      return {
        id: 'fallback',
        word: 'fallback',
        definition: 'Temporary word used when the daily one is missing.',
        equivalents: 'example,placeholder',
        first_letter: 'f',
        in_a_sentence: 'This is a ___________ definition.',
        number_of_letters: 8,
        difficulty: 'Easy',
        etymology: 'Artificially generated.',
        created_at: new Date().toISOString(),
        is_word_of_day: false,
        word_of_day_date: null,
      };
    }

    validateWordClues(data as WordEntry);
    logger.info('Word of the day fetched successfully', { wordId: data.id });
    return data as WordEntry;
  } catch (error) {
    console.error('Error in getWordOfTheDay:', error);
    throw error;
  }
};

/**
 * Get a random word for testing
 */
export const getRandomWord = async (): Promise<WordEntry> => {
  try {
    logger.info('Fetching random word for testing');

    if (!supabase) {
      logger.error('Supabase client not initialized');
      throw Errors.InternalServer('Database client not initialized');
    }

    // Query the words table for a random word with all required fields
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .not('definition', 'is', null)
      .not('equivalents', 'is', null)
      .not('first_letter', 'is', null)
      .not('in_a_sentence', 'is', null)
      .not('number_of_letters', 'is', null)
      .not('etymology', 'is', null)
      .limit(1)
      .order('id', { ascending: false });

    if (error) {
      logger.error('Error fetching random word', { error });
      throw Errors.InternalServer('Failed to fetch random word');
    }

    if (!data || data.length === 0) {
      logger.warn('No words found in the database');
      throw Errors.NotFound('No words found in the database');
    }

    // Validate that the word has all required clues
    validateWordClues(data[0] as WordEntry);

    logger.info('Random word fetched successfully', { wordId: data[0].id });
    return data[0] as WordEntry;
  } catch (error) {
    console.error('Error in getRandomWord:', error);
    throw error;
  }
};

/**
 * Get a word by ID
 */
export const getWordById = async (id: string): Promise<WordEntry> => {
  try {
    logger.info('Fetching word by ID', { id });

    if (!supabase) {
      logger.error('Supabase client not initialized');
      throw Errors.InternalServer('Database client not initialized');
    }

    // Query the words table for the word with the given ID
    const { data, error } = await supabase.from('words').select('*').eq('id', id).single();

    if (error) {
      logger.error('Error fetching word by ID', { error, id });
      throw Errors.InternalServer('Failed to fetch word');
    }

    if (!data) {
      logger.warn('Word not found', { id });
      throw Errors.NotFound('Word not found');
    }

    // Validate that the word has all required clues
    validateWordClues(data as WordEntry);

    logger.info('Word fetched successfully', { id });
    return data as WordEntry;
  } catch (error) {
    console.error('Error in getWordById:', error);
    throw error;
  }
};

export async function getWordByText(word: string): Promise<WordEntry | null> {
  if (!supabase) throw new Error('Supabase client not initialized');
  const { data, error } = await supabase.from('words').select('*').eq('word', word).single();
  if (error && error.code !== 'PGRST116') return null;
  return data || null;
}
