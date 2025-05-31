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

  const { playerId } = req.query;

  if (!playerId || typeof playerId !== 'string') {
    return res.status(400).json({ error: 'playerId is required' });
  }

  try {
    console.log('[/api/debug-player] Checking player:', playerId);

    // Get player info
    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();

    // Get recent game sessions
    const { data: sessions } = await supabase
      .from('game_sessions')
      .select(`
        id,
        word_id,
        is_complete,
        is_won,
        guesses_used,
        start_time,
        end_time,
        words (word, date)
      `)
      .eq('player_id', playerId)
      .order('start_time', { ascending: false })
      .limit(10);

    // Get recent scores
    const { data: scores } = await supabase
      .from('scores')
      .select(`
        id,
        word_id,
        score,
        completion_time_seconds,
        guesses_used,
        correct,
        submitted_at,
        words (word, date)
      `)
      .eq('player_id', playerId)
      .order('submitted_at', { ascending: false })
      .limit(10);

    // Get leaderboard entries
    const { data: leaderboard } = await supabase
      .from('leaderboard_summary')
      .select(`
        id,
        word_id,
        rank,
        best_time,
        guesses_used,
        date,
        words (word)
      `)
      .eq('player_id', playerId)
      .order('date', { ascending: false })
      .limit(10);

    // Get user stats
    const { data: stats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('player_id', playerId)
      .single();

    // Check for DEFINE word specifically
    const { data: defineWord } = await supabase
      .from('words')
      .select('*')
      .eq('word', 'DEFINE')
      .single();

    // Check for DEFINE completions
    let defineCompletions = null;
    if (defineWord) {
      const { data: defineSessionsData } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('player_id', playerId)
        .eq('word_id', defineWord.id);

      const { data: defineScoresData } = await supabase
        .from('scores')
        .select('*')
        .eq('player_id', playerId)
        .eq('word_id', defineWord.id);

      defineCompletions = {
        sessions: defineSessionsData,
        scores: defineScoresData
      };
    }

    return res.status(200).json({
      player,
      sessions,
      scores,
      leaderboard,
      stats,
      defineWord,
      defineCompletions,
      debug: {
        timestamp: new Date().toISOString(),
        playerId
      }
    });
  } catch (err) {
    console.error('[/api/debug-player] Error:', err);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
  }
} 