import { createClient } from '@supabase/supabase-js';
import { NextApiRequest } from 'next';
import { LeaderboardResponse, ApiResponse, LeaderboardEntry } from 'types/api';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: ApiResponse<LeaderboardResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get wordId from query parameters
  const { wordId, playerId } = req.query;
  if (!wordId) {
    return res.status(400).json({ error: 'Missing wordId parameter' });
  }

  try {
    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Fetch all entries for this word and date to calculate ranks
    const { data: allEntries, error } = await supabase
      .from('leaderboard_summary')
      .select('*')
      .eq('word_id', wordId)
      .eq('date', today)
      .order('guesses_used', { ascending: true })
      .order('completion_time_seconds', { ascending: true });

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return res.status(500).json({ error: 'Failed to fetch leaderboard data' });
    }

    // Find the player's entry and rank if they provided a playerId
    let playerEntry: LeaderboardEntry | null = null;
    let playerRank: number | null = null;

    if (playerId && allEntries) {
      // Find the player's entry
      playerEntry = allEntries.find((entry) => entry.player_id === playerId) || null;
      
      // Calculate the player's rank if they have an entry
      if (playerEntry) {
        const index = allEntries.findIndex((entry) => entry.player_id === playerId);
        playerRank = index !== -1 ? index + 1 : null;
      }
    }

    // Return only the top 10 entries
    const topTen = allEntries ? allEntries.slice(0, 10) : [];
    
    return res.status(200).json({
      leaderboard: topTen,
      playerRank,
      totalEntries: allEntries ? allEntries.length : 0
    });
  } catch (error) {
    console.error('Error in leaderboard endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 