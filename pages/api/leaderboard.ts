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

    // Try to get entries from leaderboard_summary first
    let { data: allEntries, error: allEntriesError } = await supabase
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

    console.log('[/api/leaderboard] Leaderboard_summary query result:', { 
      success: !allEntriesError, 
      entryCount: allEntries?.length || 0,
      error: allEntriesError?.message 
    });

    // If leaderboard_summary is empty or has errors, try to get from scores table as fallback
    if (allEntriesError || !allEntries || allEntries.length === 0) {
      console.log('[/api/leaderboard] Falling back to scores table...');
      
      const { data: scoresData, error: scoresError } = await supabase
        .from('scores')
        .select(`
          id,
          player_id,
          word_id,
          score,
          completion_time_seconds,
          guesses_used,
          submitted_at
        `)
        .eq('word_id', wordId)
        .eq('was_correct', true)
        .order('score', { ascending: false })
        .order('completion_time_seconds', { ascending: true });

      console.log('[/api/leaderboard] Scores table query result:', { 
        success: !scoresError, 
        entryCount: scoresData?.length || 0,
        error: scoresError?.message 
      });

      if (scoresError) {
        console.error('[/api/leaderboard] Both leaderboard_summary and scores failed:', {
          leaderboardError: allEntriesError?.message,
          scoresError: scoresError.message
        });
        return res.status(500).json({ error: 'Database access failed: ' + scoresError.message });
      }

      // Transform scores data to leaderboard format
      allEntries = (scoresData || []).map((score, index) => ({
        id: score.id,
        player_id: score.player_id,
        word_id: score.word_id,
        rank: index + 1,
        score: score.score || 0,
        completion_time_seconds: score.completion_time_seconds,
        guesses_used: score.guesses_used,
        was_top_10: index < 10,
        created_at: score.submitted_at || new Date().toISOString()
      }));
    }

    console.log('[/api/leaderboard] Final data:', { entryCount: allEntries?.length || 0 });

    // Handle empty results
    if (!allEntries || allEntries.length === 0) {
      console.log('[/api/leaderboard] No entries found for word:', wordId);
      return res.status(200).json({
        leaderboard: [],
        playerRank: null,
        totalEntries: 0
      });
    }

    // Transform entries to match expected format
    const transformedEntries: LeaderboardEntry[] = allEntries.map((entry, index) => ({
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
    if (playerId && typeof playerId === 'string') {
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

    console.log('[/api/leaderboard] Successfully returning leaderboard with', leaderboardEntries.length, 'entries');

    return res.status(200).json({
      leaderboard: leaderboardEntries,
      playerRank,
      totalEntries: transformedEntries.length
    });
  } catch (err) {
    console.error('[/api/leaderboard] Unexpected error in leaderboard handler:', {
      error: err,
      message: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined
    });
    return res.status(500).json({ error: 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error') });
  }
}

// Export the handler wrapped with CORS middleware
export default withCors(handler); 