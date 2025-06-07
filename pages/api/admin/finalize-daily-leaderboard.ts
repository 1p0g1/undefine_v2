import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/src/env.server';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

interface FinalizationResult {
  success: boolean;
  message: string;
  finalized: Array<{
    word_id: string;
    date: string;
    total_players: number;
    top_10_count: number;
    message: string;
  }>;
  errors: Array<{
    word_id?: string;
    date?: string;
    error: string;
  }>;
  stats: {
    totalProcessed: number;
    successCount: number;
    errorCount: number;
    finalizationDate: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FinalizationResult>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      finalized: [],
      errors: [],
      stats: {
        totalProcessed: 0,
        successCount: 0,
        errorCount: 0,
        finalizationDate: new Date().toISOString()
      }
    });
  }

  const { wordId, date, autoFinalize } = req.body;

  console.log('[/api/admin/finalize-daily-leaderboard] Starting finalization:', {
    wordId,
    date,
    autoFinalize
  });

  try {
    const result = await finalizeDailyLeaderboards({
      wordId,
      date,
      autoFinalize: autoFinalize || false
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('[/api/admin/finalize-daily-leaderboard] Finalization failed:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      finalized: [],
      errors: [{
        error: error instanceof Error ? error.message : 'Unknown error'
      }],
      stats: {
        totalProcessed: 0,
        successCount: 0,
        errorCount: 1,
        finalizationDate: new Date().toISOString()
      }
    });
  }
}

/**
 * Finalize daily leaderboards creating immutable snapshots
 */
async function finalizeDailyLeaderboards(options: {
  wordId?: string;
  date?: string;
  autoFinalize?: boolean;
}): Promise<FinalizationResult> {
  const { wordId, date, autoFinalize = false } = options;
  
  const result: FinalizationResult = {
    success: true,
    message: '',
    finalized: [],
    errors: [],
    stats: {
      totalProcessed: 0,
      successCount: 0,
      errorCount: 0,
      finalizationDate: new Date().toISOString()
    }
  };

  console.log('[finalizeDailyLeaderboards] Starting with options:', options);

  try {
    if (autoFinalize) {
      // Auto-finalize all old unfinalized snapshots
      const { data: autoResults, error: autoError } = await supabase
        .rpc('auto_finalize_old_snapshots');

      if (autoError) {
        throw new Error(`Auto-finalization failed: ${autoError.message}`);
      }

      // Process auto-finalization results
      for (const autoResult of autoResults || []) {
        result.stats.totalProcessed++;
        
        if (autoResult.success) {
          result.finalized.push({
            word_id: autoResult.word_id,
            date: autoResult.date,
            total_players: 0, // Will be filled from snapshot
            top_10_count: 0,   // Will be filled from snapshot
            message: autoResult.message
          });
          result.stats.successCount++;
        } else {
          result.errors.push({
            word_id: autoResult.word_id,
            date: autoResult.date,
            error: autoResult.message
          });
          result.stats.errorCount++;
        }
      }

    } else if (wordId && date) {
      // Finalize specific word and date
      const { data: singleResult, error: singleError } = await supabase
        .rpc('finalize_daily_leaderboard', {
          target_word_id: wordId,
          target_date: date
        });

      if (singleError) {
        throw new Error(`Finalization failed: ${singleError.message}`);
      }

      const finalizationResult = singleResult?.[0];
      result.stats.totalProcessed = 1;

      if (finalizationResult?.success) {
        result.finalized.push({
          word_id: wordId,
          date: date,
          total_players: finalizationResult.total_players,
          top_10_count: finalizationResult.top_10_count,
          message: finalizationResult.message
        });
        result.stats.successCount = 1;
      } else {
        result.errors.push({
          word_id: wordId,
          date: date,
          error: finalizationResult?.message || 'Unknown error'
        });
        result.stats.errorCount = 1;
      }

    } else if (wordId) {
      // Finalize specific word for yesterday (if not finalized)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDate = yesterday.toISOString().split('T')[0];

      const { data: singleResult, error: singleError } = await supabase
        .rpc('finalize_daily_leaderboard', {
          target_word_id: wordId,
          target_date: yesterdayDate
        });

      if (singleError) {
        throw new Error(`Finalization failed: ${singleError.message}`);
      }

      const finalizationResult = singleResult?.[0];
      result.stats.totalProcessed = 1;

      if (finalizationResult?.success) {
        result.finalized.push({
          word_id: wordId,
          date: yesterdayDate,
          total_players: finalizationResult.total_players,
          top_10_count: finalizationResult.top_10_count,
          message: finalizationResult.message
        });
        result.stats.successCount = 1;
      } else {
        result.errors.push({
          word_id: wordId,
          date: yesterdayDate,
          error: finalizationResult?.message || 'Unknown error'
        });
        result.stats.errorCount = 1;
      }

    } else {
      throw new Error('Must provide either wordId, date, or autoFinalize=true');
    }

    // Build result message
    if (result.stats.successCount > 0 && result.stats.errorCount === 0) {
      result.message = `Successfully finalized ${result.stats.successCount} leaderboard(s)`;
    } else if (result.stats.successCount > 0 && result.stats.errorCount > 0) {
      result.message = `Finalized ${result.stats.successCount} leaderboard(s) with ${result.stats.errorCount} error(s)`;
    } else {
      result.message = `Failed to finalize any leaderboards (${result.stats.errorCount} error(s))`;
      result.success = false;
    }

    console.log('[finalizeDailyLeaderboards] Completed:', result.stats);
    return result;

  } catch (error) {
    console.error('[finalizeDailyLeaderboards] Fatal error:', error);
    result.success = false;
    result.message = error instanceof Error ? error.message : 'Unknown error';
    result.stats.errorCount++;
    return result;
  }
}

/**
 * Get historical leaderboard from snapshots
 */
export async function getHistoricalLeaderboard(
  wordId: string,
  date?: string
): Promise<Array<{
  player_id: string;
  player_name: string;
  rank: number;
  best_time: number;
  guesses_used: number;
  was_top_10: boolean;
}>> {
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .rpc('get_historical_leaderboard', {
      target_word_id: wordId,
      target_date: targetDate
    });

  if (error) {
    console.error('[getHistoricalLeaderboard] Error:', error);
    throw new Error(`Failed to get historical leaderboard: ${error.message}`);
  }

  return data || [];
}

/**
 * Check if a date should be finalized
 */
export async function shouldFinalizeDate(date?: string): Promise<boolean> {
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .rpc('should_finalize_date', {
      check_date: targetDate
    });

  if (error) {
    console.error('[shouldFinalizeDate] Error:', error);
    return false;
  }

  return data === true;
} 