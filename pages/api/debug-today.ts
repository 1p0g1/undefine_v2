import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/src/env.server';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const today = new Date();
    const todayUTC = today.toISOString().split('T')[0]; // YYYY-MM-DD format

    console.log('[/api/debug-today] Checking for date:', todayUTC);

    // Check what word should be today
    const { data: todayWord, error: todayError } = await supabase
      .from('words')
      .select('*')
      .eq('date', todayUTC)
      .single();

    // Check all recent words
    const { data: recentWords, error: recentError } = await supabase
      .from('words')
      .select('id, word, date')
      .order('date', { ascending: false })
      .limit(10);

    // Check DEFINE word specifically
    const { data: defineWord, error: defineError } = await supabase
      .from('words')
      .select('*')
      .eq('word', 'DEFINE')
      .single();

    // Check clear word specifically  
    const { data: clearWord, error: clearError } = await supabase
      .from('words')
      .select('*')
      .eq('word', 'clear')
      .single();

    // Check leaderboard for DEFINE
    const { data: defineLeaderboard } = await supabase
      .from('leaderboard_summary')
      .select(`
        id,
        player_id,
        rank,
        best_time,
        guesses_used,
        date,
        words (word)
      `)
      .eq('word_id', defineWord?.id)
      .order('rank');

    // Check leaderboard for clear
    const { data: clearLeaderboard } = await supabase
      .from('leaderboard_summary')
      .select(`
        id,
        player_id,
        rank,
        best_time,
        guesses_used,
        date,
        words (word)
      `)
      .eq('word_id', clearWord?.id)
      .order('rank');

    return res.status(200).json({
      todayUTC,
      todayWord: {
        data: todayWord,
        error: todayError?.message
      },
      defineWord: {
        data: defineWord,
        error: defineError?.message
      },
      clearWord: {
        data: clearWord,
        error: clearError?.message
      },
      recentWords: {
        data: recentWords,
        error: recentError?.message
      },
      leaderboards: {
        define: defineLeaderboard,
        clear: clearLeaderboard
      }
    });
  } catch (err) {
    console.error('[/api/debug-today] Error:', err);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
  }
} 