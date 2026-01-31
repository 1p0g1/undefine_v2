import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/src/env.server';
import { withCors } from '@/lib/withCors';

// Initialize Supabase client
const supabase = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);

interface DailyLeaderboardEntry {
  rank: number;
  displayName: string;
  guesses: number;
  timeSeconds: number;
  playerId: string;
}

interface DailyLeaderboardResponse {
  entries: DailyLeaderboardEntry[];
  totalPlayers: number;
  wordId?: string;
}

/**
 * Get today's leaderboard without requiring wordId
 * Used for intro page mini leaderboard
 */
async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DailyLeaderboardResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const today = getCurrentUTCDate();
    
    console.log('[/api/daily-leaderboard] Fetching leaderboard for:', today);

    // First, get today's word
    const { data: wordData, error: wordError } = await supabase
      .from('words')
      .select('id')
      .eq('date', today)
      .single();

    if (wordError || !wordData) {
      console.log('[/api/daily-leaderboard] No word found for today:', today);
      return res.status(200).json({ entries: [], totalPlayers: 0 });
    }

    const wordId = wordData.id;

    // Get leaderboard entries from leaderboard_summary
    const { data: entries, error: entriesError } = await supabase
      .from('leaderboard_summary')
      .select('player_id, rank, guesses_used, best_time')
      .eq('word_id', wordId)
      .order('rank', { ascending: true })
      .limit(10);

    if (entriesError) {
      console.error('[/api/daily-leaderboard] Error fetching entries:', entriesError);
      return res.status(200).json({ entries: [], totalPlayers: 0, wordId });
    }

    if (!entries || entries.length === 0) {
      return res.status(200).json({ entries: [], totalPlayers: 0, wordId });
    }

    // Get total count
    const { count } = await supabase
      .from('leaderboard_summary')
      .select('*', { count: 'exact', head: true })
      .eq('word_id', wordId);

    // Get player display names
    const playerIds = entries.map(e => e.player_id);
    const { data: playersData } = await supabase
      .from('players')
      .select('id, display_name')
      .in('id', playerIds);

    const playerNames = new Map(
      playersData?.map(p => [p.id, p.display_name || `Player ${p.id.slice(-4)}`]) || []
    );

    // Transform to response format
    const transformedEntries: DailyLeaderboardEntry[] = entries.map(entry => ({
      rank: entry.rank || 0,
      displayName: playerNames.get(entry.player_id) || `Player ${entry.player_id.slice(-4)}`,
      guesses: entry.guesses_used || 0,
      timeSeconds: entry.best_time || 0,
      playerId: entry.player_id
    }));

    console.log('[/api/daily-leaderboard] Returning', transformedEntries.length, 'entries');

    return res.status(200).json({
      entries: transformedEntries,
      totalPlayers: count || transformedEntries.length,
      wordId
    });

  } catch (error) {
    console.error('[/api/daily-leaderboard] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function getCurrentUTCDate(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

export default withCors(handler);
