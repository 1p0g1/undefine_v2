import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { LeaderboardResponse, ApiResponse, LeaderboardEntry } from 'types/api';
import { env } from '@/src/env.server';
import { withCors } from '@/lib/withCors';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function handler(
  req: NextApiRequest,
  res: ApiResponse<LeaderboardResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wordId, playerId } = req.query;

  if (!wordId || typeof wordId !== 'string') {
    return res.status(400).json({ error: 'wordId is required' });
  }

  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // First, get all entries for this word and date to find player's rank
    const { data: allEntries, error: allEntriesError } = await supabase
      .from('leaderboard_summary')
      .select('*')
      .eq('word_id', wordId)
      .eq('date', today)
      .order('guesses_used', { ascending: true })
      .order('completion_time_seconds', { ascending: true });

    if (allEntriesError) {
      console.error('Error fetching all leaderboard entries:', allEntriesError);
      return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }

    // Find player's entry and rank if playerId is provided
    let playerEntry: LeaderboardEntry | null = null;
    let playerRank: number | null = null;
    if (playerId && typeof playerId === 'string' && allEntries) {
      playerEntry = allEntries.find(entry => entry.player_id === playerId) ?? null;
      if (playerEntry) {
        const rank = allEntries.findIndex(entry => entry.player_id === playerId);
        playerRank = rank >= 0 ? rank + 1 : null;
      }
    }

    // Get top 10 entries
    const topEntries = allEntries?.slice(0, 10) ?? [];

    // If player is not in top 10 but has an entry, add it to the response
    const leaderboardEntries = [...topEntries];
    if (playerEntry && !topEntries.find(entry => entry.player_id === playerId)) {
      leaderboardEntries.push(playerEntry);
    }

    return res.status(200).json({
      leaderboard: leaderboardEntries,
      playerRank,
      totalEntries: allEntries?.length ?? 0
    });
  } catch (err) {
    console.error('Error in leaderboard handler:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Export the handler wrapped with CORS middleware
export default withCors(handler); 