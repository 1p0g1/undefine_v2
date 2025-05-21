// Vercel-native serverless API route for fetching the word of the day from Supabase.
import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, player-id, Player-Id, playerId, playerid');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[api/word] Initializing Supabase client');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get today's date in YYYY-MM-DD format
    const now = new Date();
    const today = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    
    console.log('[api/word] Fetching word for date:', today);

    // Try to get today's word
    const { data: todayWord, error: todayWordError } = await supabase
      .from('words')
      .select('*')
      .eq('date', today)
      .single();

    console.log('[api/word] Today\'s word query result:', {
      hasWord: !!todayWord,
      error: todayWordError?.message,
      date: today
    });

    // If no word for today, get the most recent word
    if (todayWordError || !todayWord) {
      console.log('[api/word] No word for today, fetching most recent word');
      
      const { data: fallbackWord, error: fallbackError } = await supabase
        .from('words')
        .select('*')
        .order('date', { ascending: false })
        .limit(1)
        .single();
        
      if (fallbackError || !fallbackWord) {
        console.error('[api/word] Failed to fetch any word:', fallbackError);
        return res.status(404).json({ error: 'No words available' });
      }

      return res.status(200).json({
        word: {
          id: fallbackWord.id,
          word: fallbackWord.word,
          definition: fallbackWord.definition,
          first_letter: fallbackWord.first_letter,
          in_a_sentence: fallbackWord.in_a_sentence,
          equivalents: fallbackWord.equivalents,
          number_of_letters: fallbackWord.number_of_letters,
          etymology: fallbackWord.etymology,
          difficulty: fallbackWord.difficulty,
          date: fallbackWord.date
        },
        gameId: 'temp-session-' + new Date().getTime(), // Temporary game ID
        isFallback: true
      });
    }

    // Return today's word
    return res.status(200).json({
      word: {
        id: todayWord.id,
        word: todayWord.word,
        definition: todayWord.definition,
        first_letter: todayWord.first_letter,
        in_a_sentence: todayWord.in_a_sentence,
        equivalents: todayWord.equivalents,
        number_of_letters: todayWord.number_of_letters,
        etymology: todayWord.etymology,
        difficulty: todayWord.difficulty,
        date: todayWord.date
      },
      gameId: 'temp-session-' + new Date().getTime(), // Temporary game ID
      isFallback: false
    });

  } catch (err) {
    console.error('[api/word] Unexpected error:', err);
    return res.status(500).json({ 
      error: 'Unexpected error',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
} 