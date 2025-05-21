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
    // Get player ID from headers
    const playerId = req.headers['player-id'] || req.headers['Player-Id'] || req.headers['playerId'] || req.headers['playerid'];
    if (!playerId || typeof playerId !== 'string') {
      return res.status(400).json({ error: 'Missing player ID' });
    }

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

    // Ensure user_stats record exists
    console.log('[api/word] Ensuring user_stats record exists for player:', playerId);
    const { data: existingStats, error: statsError } = await supabase
      .from('user_stats')
      .select('player_id')
      .eq('player_id', playerId)
      .single();

    if (!existingStats) {
      console.log('[api/word] Creating new user_stats record for player:', playerId);
      const { error: createError } = await supabase
        .from('user_stats')
        .insert([{
          player_id: playerId,
          games_played: 0,
          games_won: 0,
          current_streak: 0,
          longest_streak: 0,
          total_guesses: 0,
          average_guesses_per_game: 0,
          average_completion_time: 0,
          total_play_time_seconds: 0
        }]);

      if (createError) {
        console.error('[api/word] Failed to create user stats:', createError);
        return res.status(500).json({ 
          error: 'Unexpected error', 
          details: 'Failed to create user stats: ' + createError.message 
        });
  }
    }

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
        word: fallbackWord,
        isFallback: true
      });
    }

    // Return today's word
    return res.status(200).json({
      word: todayWord,
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