import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { LeaderboardResponse, ApiResponse } from 'types/api';
import type { LeaderboardEntry } from '@/shared-types/src/game';
import { env } from '@/src/env.server';
import { withCors } from '@/lib/withCors';

// Validate critical environment variables
if (!env.SUPABASE_URL) {
  console.error('❌ Missing SUPABASE_URL in env');
  throw new Error('Missing SUPABASE_URL');
}
if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in env');
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
}
if (!env.DB_PROVIDER) {
  console.error('❌ Missing DB_PROVIDER in env');
  throw new Error('Missing DB_PROVIDER');
}

// Log environment validation success
console.log('[/api/leaderboard] Environment validation passed:', {
  hasSupabaseUrl: !!env.SUPABASE_URL,
  hasServiceRoleKey: !!env.SUPABASE_SERVICE_ROLE_KEY,
  dbProvider: env.DB_PROVIDER,
  nodeEnv: env.NODE_ENV
});

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
    console.log('[/api/leaderboard] Fetching leaderboard for wordId:', wordId, 'playerId:', playerId);

    // Get all entries for this word with proper joins for player names
    const { data: allEntries, error: allEntriesError } = await supabase
      .from('leaderboard_summary')
      .select(`
        id,
        player_id,
        word_id,
        rank,
        score,
        completion_time_seconds,
        guesses_used,
        was_top_10,
        created_at
      `)
      .eq('word_id', wordId)
      .order('score', { ascending: false })
      .order('completion_time_seconds', { ascending: true });

    if (allEntriesError) {
      console.error('[/api/leaderboard] Error fetching all leaderboard entries:', allEntriesError);
      return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }

    console.log('[/api/leaderboard] Found entries:', allEntries?.length || 0);

    // Transform entries to match expected format
    const transformedEntries: LeaderboardEntry[] = (allEntries || []).map((entry, index) => ({
      id: entry.id,
      word_id: entry.word_id,
      player_id: entry.player_id,
      player_name: `Player ${entry.player_id.slice(-4)}`, // Use last 4 chars of player ID as name
      rank: index + 1, // Calculate rank based on order
      guesses_used: entry.guesses_used,
      completion_time_seconds: entry.completion_time_seconds,
      score: entry.score || 0,
      date: entry.created_at?.split('T')[0] || new Date().toISOString().split('T')[0], // Use created_at date or today
      created_at: entry.created_at || new Date().toISOString(),
      is_current_player: entry.player_id === playerId
    }));

    // Find player's entry and rank if playerId is provided
    let playerEntry: LeaderboardEntry | null = null;
    let playerRank: number | null = null;
    if (playerId && typeof playerId === 'string' && transformedEntries) {
      playerEntry = transformedEntries.find(entry => entry.player_id === playerId) ?? null;
      if (playerEntry) {
        playerRank = playerEntry.rank;
      }
    }

    // Get top 10 entries
    const topEntries = transformedEntries.slice(0, 10);

    // If player is not in top 10 but has an entry, add it to the response
    const leaderboardEntries = [...topEntries];
    if (playerEntry && !topEntries.find(entry => entry.player_id === playerId)) {
      leaderboardEntries.push(playerEntry);
    }

    console.log('[/api/leaderboard] Returning leaderboard with', leaderboardEntries.length, 'entries');

    return res.status(200).json({
      leaderboard: leaderboardEntries,
      playerRank,
      totalEntries: transformedEntries.length
    });
  } catch (err) {
    console.error('[/api/leaderboard] Error in leaderboard handler:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Export the handler wrapped with CORS middleware
export default withCors(handler); 