import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { withCors } from '../../../lib/withCors';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default withCors(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { player_id, months = 2 } = req.query;

  if (!player_id) {
    return res.status(400).json({ error: 'Player ID is required' });
  }

  try {
    console.log('[DEBUG] Player history debug for:', player_id);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - parseInt(months as string));

    console.log('[DEBUG] Date range:', {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    });

    // Check if player exists
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .select('id, display_name')
      .eq('id', player_id)
      .single();

    console.log('[DEBUG] Player lookup:', { playerData, playerError });

    // Check leaderboard_summary data
    const { data: leaderboardData, error: leaderboardError } = await supabase
      .from('leaderboard_summary')
      .select(`
        date,
        rank,
        was_top_10,
        best_time,
        guesses_used,
        word_id,
        words (
          word,
          date
        )
      `)
      .eq('player_id', player_id)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    console.log('[DEBUG] Leaderboard query result:', {
      count: leaderboardData?.length || 0,
      error: leaderboardError,
      sampleData: leaderboardData?.slice(0, 2)
    });

    // Check game_sessions data
    const { data: gameData, error: gameError } = await supabase
      .from('game_sessions')
      .select(`
        start_time,
        end_time,
        is_complete,
        is_won,
        guesses_used,
        word_id,
        words (
          word,
          date
        )
      `)
      .eq('player_id', player_id)
      .eq('is_complete', true)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: true });

    console.log('[DEBUG] Game sessions query result:', {
      count: gameData?.length || 0,
      error: gameError,
      sampleData: gameData?.slice(0, 2)
    });

    // Check recent activity (any table)
    const { data: recentLeaderboard, error: recentError } = await supabase
      .from('leaderboard_summary')
      .select('date, rank, word_id')
      .eq('player_id', player_id)
      .order('date', { ascending: false })
      .limit(5);

    console.log('[DEBUG] Recent leaderboard activity:', {
      count: recentLeaderboard?.length || 0,
      error: recentError,
      data: recentLeaderboard
    });

    return res.status(200).json({
      debug: true,
      player_id,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      },
      player: playerData,
      leaderboard: {
        count: leaderboardData?.length || 0,
        error: leaderboardError,
        data: leaderboardData
      },
      gameSessions: {
        count: gameData?.length || 0,
        error: gameError,
        data: gameData
      },
      recentActivity: {
        count: recentLeaderboard?.length || 0,
        error: recentError,
        data: recentLeaderboard
      }
    });

  } catch (error) {
    console.error('[DEBUG] Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
