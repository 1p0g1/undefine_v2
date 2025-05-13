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
    // Get today's date in UTC
    const today = new Date();
    const todayUTC = new Date(Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate()
    )).toISOString().slice(0, 10);

    console.log('Fetching word for date:', todayUTC);

    let word: any; // Will be properly typed by Supabase response

    // First try to get today's word
    const { data: todayWord, error: todayWordError } = await supabase
      .from('words')
      .select('*')
      .eq('date', todayUTC)
      .single();

    if (todayWordError) {
      console.error('Error fetching today\'s word:', todayWordError);
      
      // In development, fall back to a random word
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: falling back to random word');
        const { data: randomWord, error: randomWordError } = await supabase
          .from('words')
          .select('*')
          .order('random()')
          .limit(1)
          .single();

        if (randomWordError) {
          console.error('Error fetching random word:', randomWordError);
          return res.status(500).json({ error: 'Error fetching word' });
        }
        word = randomWord;
      } else {
        return res.status(500).json({ error: 'Error fetching today\'s word' });
      }
    } else {
      word = todayWord;
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
  } catch (error) {
    console.error('Error in word endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 