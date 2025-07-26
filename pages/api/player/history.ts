import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Define proper types for the Supabase response
interface LeaderboardWithWord {
  date: string;
  rank: number;
  was_top_10: boolean;
  best_time: number;
  guesses_used: number;
  word_id: string;
  words: {
    word: string;
    date: string;
  } | null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 🔧 FIX: Accept GET requests (not POST) since calendar modal uses GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 🔧 FIX: Get parameters from query string (not request body)
  const { player_id, months = 2 } = req.query;

  if (!player_id) {
    return res.status(400).json({ error: 'Player ID is required' });
  }

  try {
    console.log('[/api/player/history] Fetching play history for player:', player_id);

    // Calculate date range (e.g., last 2 months)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - parseInt(months as string));

    // Get leaderboard data for the player within date range
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
      .order('date', { ascending: true }) as { data: LeaderboardWithWord[] | null, error: any };

    if (leaderboardError) {
      console.error('[/api/player/history] Error fetching leaderboard data:', leaderboardError);
      return res.status(500).json({ error: 'Failed to fetch play history' });
    }

    // Transform data into the format expected by the calendar
    const history = leaderboardData?.map(entry => ({
      date: entry.date,
      played: true,
      won: entry.rank === 1, // Won if rank is 1
      rank: entry.rank,
      guesses: entry.guesses_used,
      time: entry.best_time,
      word: entry.words?.word || 'Unknown'
    })) || [];

    console.log(`[/api/player/history] Found ${history.length} play records for player ${player_id}`);

    return res.status(200).json({
      history,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('[/api/player/history] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 