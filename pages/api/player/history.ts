import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { withCors } from '@/lib/withCors';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Define proper types for the Supabase response
interface GameSessionHistory {
  id: string;
  word_id: string;
  is_complete: boolean;
  is_won: boolean;
  is_archive_play: boolean;
  game_date: string;
  end_time: string;
  guesses: string[];
  words: {
    word: string;
    date: string;
  } | null;
}

interface LeaderboardEntry {
  date: string;
  rank: number;
  guesses_used: number;
  best_time: number;
}

export default withCors(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { player_id, months = 2 } = req.query;

  if (!player_id) {
    return res.status(400).json({ error: 'Player ID is required' });
  }

  try {
    console.log('[/api/player/history] Fetching play history for player:', player_id);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - parseInt(months as string));

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get ALL completed game sessions (both wins AND losses)
    // This is the source of truth for play history
    const { data: gameSessionData, error: sessionError } = await supabase
      .from('game_sessions')
      .select(`
        id,
        word_id,
        is_complete,
        is_won,
        is_archive_play,
        game_date,
        end_time,
        guesses,
        words (
          word,
          date
        )
      `)
      .eq('player_id', player_id)
      .eq('is_complete', true)
      .eq('is_archive_play', false)  // Only show live plays in history
      .gte('game_date', startDateStr)
      .lte('game_date', endDateStr)
      .order('game_date', { ascending: true }) as { data: GameSessionHistory[] | null, error: any };

    if (sessionError) {
      console.error('[/api/player/history] Error fetching game sessions:', sessionError);
      return res.status(500).json({ error: 'Failed to fetch play history' });
    }

    // Also get leaderboard data for ranks (wins only)
    const { data: leaderboardData, error: leaderboardError } = await supabase
      .from('leaderboard_summary')
      .select('date, rank, guesses_used, best_time')
      .eq('player_id', player_id)
      .gte('date', startDateStr)
      .lte('date', endDateStr) as { data: LeaderboardEntry[] | null, error: any };

    if (leaderboardError) {
      console.warn('[/api/player/history] Warning fetching leaderboard data:', leaderboardError);
      // Continue without rank data
    }

    // Create a map of dates to ranks
    const rankMap = new Map<string, number>();
    leaderboardData?.forEach(entry => {
      rankMap.set(entry.date, entry.rank);
    });

    // Deduplicate by game_date (keep most recent session per date)
    const dateMap = new Map<string, GameSessionHistory>();
    gameSessionData?.forEach(session => {
      const date = session.game_date || session.words?.date;
      if (date) {
        const existing = dateMap.get(date);
        if (!existing || new Date(session.end_time) > new Date(existing.end_time)) {
          dateMap.set(date, session);
        }
      }
    });

    // Transform data into the format expected by the calendar
    const history = Array.from(dateMap.entries()).map(([date, session]) => ({
      date,
      played: true,
      won: session.is_won,  // FIXED: Now correctly reports wins AND losses
      rank: session.is_won ? rankMap.get(date) : undefined,
      guesses: session.guesses?.length || 0,
      word: session.words?.word || 'Unknown'
    }));

    // Sort by date
    history.sort((a, b) => a.date.localeCompare(b.date));

    console.log(`[/api/player/history] Found ${history.length} play records (${history.filter(h => h.won).length} wins, ${history.filter(h => !h.won).length} losses)`);

    return res.status(200).json({
      history,
      dateRange: {
        start: startDateStr,
        end: endDateStr
      }
    });

  } catch (error) {
    console.error('[/api/player/history] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}); 