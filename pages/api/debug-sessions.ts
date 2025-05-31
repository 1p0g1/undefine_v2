import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/src/env.server';
import { withCors } from '@/lib/withCors';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

export default withCors(async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const playerId = (req.headers['player-id'] as string) ?? 'anonymous';
    
    // Get all recent sessions for this player
    const { data: sessions, error } = await supabase
      .from('game_sessions')
      .select('id, player_id, word_id, start_time, created_at, is_complete')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Also get total session count for this player
    const { count, error: countError } = await supabase
      .from('game_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', playerId);

    if (countError) {
      return res.status(500).json({ error: countError.message });
    }

    res.status(200).json({
      playerId,
      sessions,
      totalSessions: count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[/api/debug-sessions] Error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
}); 