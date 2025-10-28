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

  const { wordId, playerId, date } = req.query;

  if (!wordId || typeof wordId !== 'string') {
    return res.status(400).json({ error: 'wordId is required' });
  }

  try {
    const targetDate = date && typeof date === 'string' ? date : getCurrentUTCDate();
    const isCurrentDay = targetDate === getCurrentUTCDate();
    
    console.log('[/api/leaderboard] Fetching leaderboard for:', {
      wordId,
      playerId: typeof playerId === 'string' ? playerId : undefined,
      targetDate,
      isCurrentDay
    });

    let leaderboardEntries: LeaderboardEntry[] = [];
    let totalEntries = 0;

    if (isCurrentDay) {
      // Current day: Use real-time leaderboard_summary
      const currentResult = await getCurrentDayLeaderboard(wordId, typeof playerId === 'string' ? playerId : undefined);
      leaderboardEntries = currentResult.entries;
      totalEntries = currentResult.totalEntries;
    } else {
      // Historical date: Use immutable snapshots
      const historicalResult = await getHistoricalLeaderboard(wordId, targetDate, typeof playerId === 'string' ? playerId : undefined);
      leaderboardEntries = historicalResult.entries;
      totalEntries = historicalResult.totalEntries;
    }

    // Find player's rank
    const playerEntry = leaderboardEntries.find(entry => entry.player_id === (typeof playerId === 'string' ? playerId : undefined));
    const playerRank = playerEntry?.rank || null;

    console.log('[/api/leaderboard] Successfully returning leaderboard:', {
      entryCount: leaderboardEntries.length,
      totalEntries,
      playerRank,
      source: isCurrentDay ? 'real-time' : 'snapshot'
    });

    return res.status(200).json({
      leaderboard: leaderboardEntries,
      playerRank,
      totalEntries
    });

  } catch (err) {
    console.error('[/api/leaderboard] Unexpected error in leaderboard handler:', {
      error: err,
      message: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined
    });
    return res.status(500).json({ 
      error: 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error') 
    });
  }
}

/**
 * Get current day leaderboard using real-time data
 */
async function getCurrentDayLeaderboard(
  wordId: string, 
  playerId?: string
): Promise<{ entries: LeaderboardEntry[]; totalEntries: number }> {
  console.log('[getCurrentDayLeaderboard] Fetching real-time data for:', wordId);

  // Get entries from leaderboard_summary and fetch fuzzy data separately
  const { data: allEntries, error: allEntriesError } = await supabase
    .from('leaderboard_summary')
    .select(`
      id,
      player_id,
      word_id,
      rank,
      best_time,
      guesses_used,
      was_top_10,
      date
    `)
    .eq('word_id', wordId)
    .order('rank', { ascending: true });

  if (allEntriesError) {
    console.error('[getCurrentDayLeaderboard] Query failed:', allEntriesError.message);
    throw new Error(`Failed to fetch current leaderboard: ${allEntriesError.message}`);
  }

  if (!allEntries || allEntries.length === 0) {
    console.log('[getCurrentDayLeaderboard] No entries found for current day');
    return { entries: [], totalEntries: 0 };
  }

  // Get player display names
  const playerIds = allEntries.map(entry => entry.player_id);
  const { data: playersData } = await supabase
    .from('players')
    .select('id, display_name')
    .in('id', playerIds);

  const playerNames = new Map(
    playersData?.map(p => [p.id, p.display_name || `Player ${p.id.slice(-4)}`]) || []
  );

  // Get fuzzy data from scores table
  const { data: scoresData } = await supabase
    .from('scores')
    .select('player_id, word_id, fuzzy_bonus')
    .eq('word_id', wordId)
    .in('player_id', playerIds);

  const fuzzyDataMap = new Map(
    (scoresData || []).map(score => [
      score.player_id, 
      {
        fuzzy_bonus: score.fuzzy_bonus || 0,
        fuzzy_matches: Math.floor((score.fuzzy_bonus || 0) / 25)
      }
    ])
  );

  // Get theme guess data for current week
  const { data: wordData } = await supabase
    .from('words')
    .select('theme, date')
    .eq('id', wordId)
    .single();

  let themeDataMap = new Map<string, { hasGuessed: boolean; isCorrect: boolean; confidence: number | null }>();
  
  if (wordData?.theme) {
    // Get theme attempts for all players for this theme
    const { data: themeAttempts } = await supabase
      .from('theme_attempts')
      .select('player_id, theme, is_correct, confidence_percentage')
      .eq('theme', wordData.theme)
      .in('player_id', playerIds);

    if (themeAttempts) {
      for (const attempt of themeAttempts) {
        themeDataMap.set(attempt.player_id, {
          hasGuessed: true,
          isCorrect: attempt.is_correct,
          confidence: attempt.confidence_percentage
        });
      }
    }
  }

  // Transform entries
  const transformedEntries: LeaderboardEntry[] = allEntries.map((entry) => {
    const fuzzyData = fuzzyDataMap.get(entry.player_id);
    const themeData = themeDataMap.get(entry.player_id);
    return {
      id: entry.id,
      word_id: entry.word_id,
      player_id: entry.player_id,
      player_name: playerNames.get(entry.player_id) || `Player ${entry.player_id.slice(-4)}`,
      rank: entry.rank || 0,
      guesses_used: entry.guesses_used || 0,
      best_time: entry.best_time || 0,
      date: entry.date || getCurrentUTCDate(),
      created_at: new Date().toISOString(),
      was_top_10: entry.was_top_10 || false,
      is_current_player: entry.player_id === playerId,
      fuzzy_matches: fuzzyData?.fuzzy_matches || 0,
      fuzzy_bonus: fuzzyData?.fuzzy_bonus || 0,
      theme_guess_data: themeData ? {
        has_guessed: themeData.hasGuessed,
        is_correct: themeData.isCorrect,
        confidence_percentage: themeData.confidence
      } : undefined
    };
  });

  // Get top 10 + player's entry if not in top 10
  const topEntries = transformedEntries.slice(0, 10);
  const playerEntry = transformedEntries.find(entry => entry.player_id === playerId);
  
  const leaderboardEntries = [...topEntries];
  if (playerEntry && !topEntries.find(entry => entry.player_id === playerId)) {
    leaderboardEntries.push(playerEntry);
  }

  return {
    entries: leaderboardEntries,
    totalEntries: transformedEntries.length
  };
}

/**
 * Get historical leaderboard from immutable snapshots
 */
async function getHistoricalLeaderboard(
  wordId: string,
  date: string,
  playerId?: string
): Promise<{ entries: LeaderboardEntry[]; totalEntries: number }> {
  console.log('[getHistoricalLeaderboard] Fetching snapshot data for:', { wordId, date });

  try {
    // Try to get historical data from snapshots
    const { data: historicalData, error: historicalError } = await supabase
      .rpc('get_historical_leaderboard', {
        target_word_id: wordId,
        target_date: date
      });

    if (historicalError) {
      console.error('[getHistoricalLeaderboard] Snapshot query failed:', historicalError.message);
      // Fall back to current method for historical data
      return await getCurrentDayLeaderboard(wordId, playerId);
    }

    if (!historicalData || historicalData.length === 0) {
      console.log('[getHistoricalLeaderboard] No snapshot found, checking if day should be finalized');
      
      // Check if this date should be finalized
      const { data: shouldFinalize } = await supabase
        .rpc('should_finalize_date', { check_date: date });

      if (shouldFinalize) {
        console.log('[getHistoricalLeaderboard] Date should be finalized, attempting auto-finalization');
        
        // Try to finalize this date
        const { data: finalizeResult } = await supabase
          .rpc('finalize_daily_leaderboard', {
            target_word_id: wordId,
            target_date: date
          });

        if (finalizeResult?.[0]?.success) {
          console.log('[getHistoricalLeaderboard] Auto-finalization successful, retrying snapshot query');
          
          // Retry snapshot query
          const { data: retryData, error: retryError } = await supabase
            .rpc('get_historical_leaderboard', {
              target_word_id: wordId,
              target_date: date
            });

          if (!retryError && retryData && retryData.length > 0) {
            return transformHistoricalData(retryData, playerId);
          }
        }
      }

      // Still no data, fall back to current method
      console.log('[getHistoricalLeaderboard] No snapshot available, falling back to real-time query');
      return await getCurrentDayLeaderboard(wordId, playerId);
    }

    return transformHistoricalData(historicalData, playerId);

  } catch (error) {
    console.error('[getHistoricalLeaderboard] Error fetching historical data:', error);
    // Fall back to current method
    return await getCurrentDayLeaderboard(wordId, playerId);
  }
}

/**
 * Transform historical snapshot data to LeaderboardEntry format
 */
function transformHistoricalData(
  historicalData: any[],
  playerId?: string
): { entries: LeaderboardEntry[]; totalEntries: number } {
  const transformedEntries: LeaderboardEntry[] = historicalData.map((entry) => ({
    id: `snapshot-${entry.player_id}`, // Generate ID for snapshot entries
    word_id: entry.word_id || '',
    player_id: entry.player_id,
    player_name: entry.player_name,
    rank: entry.rank,
    guesses_used: entry.guesses_used,
    best_time: entry.best_time,
    date: getCurrentUTCDate(), // Will be set to actual date in future
    created_at: new Date().toISOString(),
    was_top_10: entry.was_top_10,
    is_current_player: entry.player_id === playerId,
    fuzzy_matches: entry.fuzzy_matches || 0,
    fuzzy_bonus: entry.fuzzy_bonus || 0
  }));

  // Get top 10 + player's entry if not in top 10
  const topEntries = transformedEntries.slice(0, 10);
  const playerEntry = transformedEntries.find(entry => entry.player_id === playerId);
  
  const leaderboardEntries = [...topEntries];
  if (playerEntry && !topEntries.find(entry => entry.player_id === playerId)) {
    leaderboardEntries.push(playerEntry);
  }

  return {
    entries: leaderboardEntries,
    totalEntries: transformedEntries.length
  };
}

/**
 * Get current UTC date in YYYY-MM-DD format
 */
function getCurrentUTCDate(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

// Export the handler wrapped with CORS middleware
export default withCors(handler); 