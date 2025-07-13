import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '../../src/env.server';
import { withCors } from '../../lib/withCors';
import { getPlayerThemeStats } from '../../src/game/theme';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

interface ThemeStatsResponse {
  totalThemeAttempts: number;
  correctThemeGuesses: number;
  averageAttemptsPerTheme: number;
  averageWordsCompletedWhenGuessing: number;
  themesGuessed: string[];
}

async function handler(req: NextApiRequest, res: NextApiResponse<ThemeStatsResponse | { error: string }>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { player_id } = req.query;

    if (!player_id || typeof player_id !== 'string') {
      return res.status(400).json({ error: 'player_id is required' });
    }

    console.log('[/api/theme-stats] Getting theme statistics for player:', player_id);

    // REMOVED: user_stats query - table was dropped
    // Calculate stats from actual game data instead
    const { data: playerGames, error: playerError } = await supabase
      .from('game_sessions')
      .select('is_won')
      .eq('player_id', player_id);

    if (playerError) {
      console.error('[/api/theme-stats] Error getting player games:', playerError);
      return res.status(404).json({ error: 'Player not found' });
    }

    // Get theme statistics
    const stats = await getPlayerThemeStats(player_id);

    console.log('[/api/theme-stats] Theme statistics retrieved:', stats);

    return res.status(200).json(stats);
  } catch (error) {
    console.error('[/api/theme-stats] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withCors(handler); 