import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { withCors } from '../../lib/withCors';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface GameSessionWithWord {
  start_time: string;
  end_time: string | null;
  is_complete: boolean;
  is_won: boolean;
  guesses_used: number;
  word_id: string;
  words: {
    word: string;
    date: string;
  } | null;
}

interface PlayHistoryEntry {
  date: string;
  played: boolean;
  won: boolean;
  guesses?: number;
  time?: number;
  word?: string;
}

interface HistoryResponse {
  history: PlayHistoryEntry[];
  dateRange: {
    start: string;
    end: string;
  };
}

export default withCors(async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HistoryResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { player_id, months = 2 } = req.query;

  if (!player_id) {
    return res.status(400).json({ error: 'Player ID is required' });
  }

  try {
    console.log('[/api/player/history-improved] Fetching reliable play history for player:', player_id);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - parseInt(months as string));

    // Query game_sessions directly - more reliable than leaderboard_summary
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
      .eq('is_complete', true) // Only completed games
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: true }) as { 
        data: GameSessionWithWord[] | null, 
        error: any 
      };

    if (gameError) {
      console.error('[/api/player/history-improved] Error fetching game data:', gameError);
      return res.status(500).json({ error: 'Failed to fetch play history' });
    }

    // Transform game sessions into daily history
    const history: PlayHistoryEntry[] = [];
    const processedDates = new Set<string>();

    gameData?.forEach(session => {
      // Use word date if available, otherwise use session date
      const gameDate = session.words?.date || session.start_time.split('T')[0];
      
      // Only process each date once (in case of multiple attempts)
      if (!processedDates.has(gameDate)) {
        processedDates.add(gameDate);

        // Calculate completion time if available
        let completionTime: number | undefined;
        if (session.end_time && session.start_time) {
          const startTime = new Date(session.start_time).getTime();
          const endTime = new Date(session.end_time).getTime();
          completionTime = Math.floor((endTime - startTime) / 1000); // seconds
        }

        history.push({
          date: gameDate,
          played: true,
          won: session.is_won, // Use actual win status from game_sessions
          guesses: session.guesses_used,
          time: completionTime,
          word: session.words?.word || 'Unknown'
        });
      }
    });

    console.log(`[/api/player/history-improved] Found ${history.length} unique play dates for player ${player_id}`);

    return res.status(200).json({
      history,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('[/api/player/history-improved] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
