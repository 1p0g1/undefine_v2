// Vercel-native serverless API route for fetching a random word from Supabase.
// Replaces the old Node backend `/api/word` route.
import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
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
    // Get today's word
    const { data: word, error: wordError } = await supabase
      .from('words')
      .select('*')
      .eq('date', new Date().toISOString().split('T')[0])
      .single();

    if (wordError) {
      console.error('Error fetching word:', wordError);
      return res.status(500).json({ error: 'Error fetching word' });
    }

    // Create game session
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
      console.error('Error creating game session:', sessionError);
      return res.status(500).json({ error: 'Error creating game session' });
    }

    // Return word and session data
    return res.status(200).json({
      id: word.id,
      word: word.word,
      gameId: session.id,
      clues: {
        D: word.definition,
        E: word.equivalents,
        F: word.first_letter,
        I: word.in_sentence,
        N: word.num_letters,
        E2: word.etymology,
      },
      // DEV ONLY: include solution in development
      ...(process.env.NODE_ENV === 'development' && { solution: word.word }),
    });
  } catch (error) {
    console.error('Error in word endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 