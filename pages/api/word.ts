// Vercel-native serverless API route for fetching the word of the day from Supabase.
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
    // Explicitly get today's date in YYYY-MM-DD format
    const now = new Date();
    const today = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    
    console.log('[api/word] Current server time:', now.toISOString());
    console.log('[api/word] Requesting word for date:', today);

    // First check if we have a word with today's exact date
    const { data: todayWord, error: todayWordError } = await supabase
      .from('words')
      .select('*')
      .eq('date', today)
      .single();
    
    if (todayWordError) {
      console.error(`[api/word] Error fetching word for date ${today}:`, todayWordError);
      
      // Try fetching any word as a last resort
      console.log('[api/word] No word found for today, trying to find any word');
      const { data: anyWord, error: anyWordError } = await supabase
        .from('words')
        .select('*')
        .limit(1)
        .single();
      
      if (anyWordError || !anyWord) {
        console.error('[api/word] Failed to fetch any word:', anyWordError);
        res.status(404).json({ error: 'No words found in database' });
        console.log('[api/word] Response status: 404 (No words found)');
        return;
      }
      
      console.log('[api/word] Using fallback word:', anyWord.word);
      
      // Create game session with the fallback word
      const { data: session, error: sessionError } = await supabase
        .from('game_sessions')
        .insert([
          {
            word_id: anyWord.id,
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
        console.log('[api/word] Response status: 500 (Session creation failed)');
        return;
      }

      // Return fallback word with flag
      res.status(200).json({
        word: {
          id: anyWord.id,
          word: anyWord.word,
          definition: anyWord.definition,
          first_letter: anyWord.first_letter,
          in_a_sentence: anyWord.in_sentence,
          equivalents: anyWord.equivalents,
          number_of_letters: anyWord.num_letters,
          etymology: anyWord.etymology,
          difficulty: anyWord.difficulty,
          date: anyWord.date,
        },
        gameId: session.id,
        isFallback: true,
      });
      console.log('[api/word] Response status: 200 (Using fallback word)');
      return;
    }
    
    console.log('[api/word] Found word for today:', todayWord.word);
    
    // Create game session linked to today's word
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .insert([
        {
          word_id: todayWord.id,
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
      console.log('[api/word] Response status: 500 (Session creation failed)');
      return;
    }

    // Return today's word
    res.status(200).json({
      word: {
        id: todayWord.id,
        word: todayWord.word,
        definition: todayWord.definition,
        first_letter: todayWord.first_letter,
        in_a_sentence: todayWord.in_sentence,
        equivalents: todayWord.equivalents,
        number_of_letters: todayWord.num_letters,
        etymology: todayWord.etymology,
        difficulty: todayWord.difficulty,
        date: todayWord.date,
      },
      gameId: session.id,
      isFallback: false,
    });
    console.log('[api/word] Response status: 200 (Using today\'s word)');
  } catch (error) {
    console.error('[api/word] Error in word endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
    console.log('[api/word] Response status: 500 (Internal error)');
  }
} 