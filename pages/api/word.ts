// Vercel-native serverless API route for fetching the word of the day from Supabase.
import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Default clue status structure matching game logic
const DEFAULT_CLUE_STATUS = {
  D: false, // Definition
  E: false, // Equivalents
  F: false, // First Letter
  I: false, // In a Sentence
  N: false, // Number of Letters
  E2: false, // Etymology
};

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse & { status: (code: number) => any, json: (body: any) => void }} res
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Log environment variables (without exposing secrets)
    console.log('[api/word] Using SUPABASE_URL:', !!process.env.SUPABASE_URL);
    console.log('[api/word] Using SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Use UTC date string (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    console.log('[api/word] Fetching word for date:', today);

    // Query for today's word
    const { data: word, error: wordError } = await supabase
      .from('words')
      .select('*')
      .eq('date', today)
      .single();
    console.log('[api/word] Word query result:', word || wordError);

    if (wordError || !word) {
      console.error('[api/word] No word found for today:', wordError);
      res.status(404).json({ error: 'No word found for today' });
      console.log('[api/word] Response status: 404');
      return;
    }

    // Create game session linked to correct word_id
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .insert([
        {
          word_id: word.id,
          start_time: new Date().toISOString(),
          clue_status: DEFAULT_CLUE_STATUS,
          guesses: [],
          is_complete: false,
        },
      ])
      .select()
      .single();

    if (sessionError) {
      console.error('[api/word] Error creating game session:', sessionError);
      res.status(500).json({ error: 'Error creating game session' });
      console.log('[api/word] Response status: 500');
      return;
    }

    // Return word and session data
    res.status(200).json({
      word: {
        id: word.id,
        word: word.word,
        definition: word.definition,
        first_letter: word.first_letter,
        in_a_sentence: word.in_sentence,
        equivalents: word.equivalents,
        number_of_letters: word.num_letters,
        etymology: word.etymology,
        difficulty: word.difficulty,
        date: word.date,
      },
      gameId: session.id,
    });
    console.log('[api/word] Response status: 200');
  } catch (error) {
    console.error('[api/word] Error in word endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
    console.log('[api/word] Response status: 500');
  }
} 