import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/src/env.server';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

interface CronResult {
  success: boolean;
  message: string;
  finalized: Array<{
    word_id: string;
    date: string;
    total_players: number;
    top_10_count: number;
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
    executionTime: string;
    cronTime: string;
  };
}

/**
 * Automated daily leaderboard finalization cron job
 * Runs at midnight UTC to create immutable snapshots
 * 
 * Vercel Cron: Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/finalize-daily-leaderboards",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CronResult>
) {
  const startTime = Date.now();
  const cronTime = new Date().toISOString();
  
  console.log('[/api/cron/finalize-daily-leaderboards] Starting daily finalization at:', cronTime);

  // Verify this is a cron request (Vercel sets specific headers)
  const isVercelCron = req.headers['user-agent']?.includes('vercel-cron') || 
                       req.headers['x-vercel-cron'] === '1';
  
  // Allow manual testing in development
  const isDevelopment = env.NODE_ENV === 'development';
  
  if (!isVercelCron && !isDevelopment) {
    console.log('[/api/cron/finalize-daily-leaderboards] Unauthorized cron request');
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: This endpoint is only accessible via Vercel Cron',
      finalized: [],
      errors: [{ error: 'Unauthorized cron request' }],
      stats: {
        totalProcessed: 0,
        successCount: 0,
        errorCount: 1,
        executionTime: '0ms',
        cronTime
      }
    });
  }

  try {
    const result = await autoFinalizeYesterdaysLeaderboards();
    
    const executionTime = `${Date.now() - startTime}ms`;
    
    console.log('[/api/cron/finalize-daily-leaderboards] Completed in:', executionTime, 'Stats:', result.stats);

    return res.status(200).json({
      ...result,
      stats: {
        ...result.stats,
        executionTime,
        cronTime
      }
    });

  } catch (error) {
    const executionTime = `${Date.now() - startTime}ms`;
    
    console.error('[/api/cron/finalize-daily-leaderboards] Fatal error:', error);
    
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      finalized: [],
      errors: [{ error: error instanceof Error ? error.message : 'Unknown error' }],
      stats: {
        totalProcessed: 0,
        successCount: 0,
        errorCount: 1,
        executionTime,
        cronTime
      }
    });
  }
}

/**
 * Auto-finalize yesterday's leaderboards
 * This runs at midnight UTC, so "yesterday" is the day that just ended
 */
async function autoFinalizeYesterdaysLeaderboards(): Promise<{
  success: boolean;
  message: string;
  finalized: Array<{
    word_id: string;
    date: string;
    total_players: number;
    top_10_count: number;
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
  };
}> {
  const result = {
    success: true,
    message: '',
    finalized: [] as Array<{
      word_id: string;
      date: string;
      total_players: number;
      top_10_count: number;
    }>,
    errors: [] as Array<{
      word_id?: string;
      date?: string;
      error: string;
    }>,
    stats: {
      totalProcessed: 0,
      successCount: 0,
      errorCount: 0
    }
  };

  try {
    // Calculate yesterday's date (the day that just ended at midnight UTC)
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];

    console.log('[autoFinalizeYesterdaysLeaderboards] Finalizing leaderboards for date:', yesterdayDate);

    // Find all words that had games yesterday but don't have finalized snapshots
    const { data: wordsToFinalize, error: wordsError } = await supabase
      .from('leaderboard_summary')
      .select('word_id')
      .eq('date', yesterdayDate);

    if (wordsError) {
      throw new Error(`Failed to find words to finalize: ${wordsError.message}`);
    }

    if (!wordsToFinalize || wordsToFinalize.length === 0) {
      result.message = `No words found for ${yesterdayDate} - nothing to finalize`;
      return result;
    }

    // Get unique word IDs
    const uniqueWordIds = Array.from(new Set(wordsToFinalize.map(w => w.word_id)));
    console.log('[autoFinalizeYesterdaysLeaderboards] Found', uniqueWordIds.length, 'unique words to finalize');

    // Check which words already have finalized snapshots
    const { data: existingSnapshots } = await supabase
      .from('daily_leaderboard_snapshots')
      .select('word_id')
      .in('word_id', uniqueWordIds)
      .eq('date', yesterdayDate)
      .eq('is_finalized', true);

    const alreadyFinalized = new Set(existingSnapshots?.map(s => s.word_id) || []);
    const wordsNeedingFinalization = uniqueWordIds.filter(wordId => !alreadyFinalized.has(wordId));

    console.log('[autoFinalizeYesterdaysLeaderboards] Words needing finalization:', wordsNeedingFinalization.length);

    // Finalize each word
    for (const wordId of wordsNeedingFinalization) {
      try {
        const { data: finalizeResult, error: finalizeError } = await supabase
          .rpc('finalize_daily_leaderboard', {
            target_word_id: wordId,
            target_date: yesterdayDate
          });

        if (finalizeError) {
          console.error('[autoFinalizeYesterdaysLeaderboards] Finalization failed for word:', wordId, finalizeError.message);
          result.errors.push({
            word_id: wordId,
            date: yesterdayDate,
            error: finalizeError.message
          });
          continue;
        }

        const finalizationResult = finalizeResult?.[0];
        if (finalizationResult?.success) {
          result.finalized.push({
            word_id: wordId,
            date: yesterdayDate,
            total_players: finalizationResult.total_players,
            top_10_count: finalizationResult.top_10_count
          });
          console.log('[autoFinalizeYesterdaysLeaderboards] Successfully finalized:', wordId, 'with', finalizationResult.total_players, 'players');
        } else {
          result.errors.push({
            word_id: wordId,
            date: yesterdayDate,
            error: finalizationResult?.message || 'Unknown finalization error'
          });
        }

      } catch (wordError) {
        console.error('[autoFinalizeYesterdaysLeaderboards] Error processing word:', wordId, wordError);
        result.errors.push({
          word_id: wordId,
          date: yesterdayDate,
          error: wordError instanceof Error ? wordError.message : 'Unknown error'
        });
      }
    }

    // Build result message
    const totalProcessed = result.finalized.length + result.errors.length;
    const successCount = result.finalized.length;
    const errorCount = result.errors.length;

    result.stats = {
      totalProcessed,
      successCount,
      errorCount
    };

    if (successCount > 0 && errorCount === 0) {
      result.message = `Successfully finalized ${successCount} leaderboard(s) for ${yesterdayDate}`;
    } else if (successCount > 0 && errorCount > 0) {
      result.message = `Finalized ${successCount} leaderboard(s) for ${yesterdayDate} with ${errorCount} error(s)`;
    } else if (totalProcessed === 0) {
      result.message = `All leaderboards for ${yesterdayDate} were already finalized`;
    } else {
      result.message = `Failed to finalize any leaderboards for ${yesterdayDate} (${errorCount} error(s))`;
      result.success = false;
    }

    return result;

  } catch (error) {
    console.error('[autoFinalizeYesterdaysLeaderboards] Fatal error:', error);
    result.success = false;
    result.message = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return result;
  }
}

/**
 * Manual trigger for testing (development only)
 */
export async function manualTriggerFinalization(): Promise<CronResult> {
  if (env.NODE_ENV !== 'development') {
    throw new Error('Manual trigger only available in development');
  }

  const startTime = Date.now();
  const result = await autoFinalizeYesterdaysLeaderboards();
  
  return {
    ...result,
    stats: {
      ...result.stats,
      executionTime: `${Date.now() - startTime}ms`,
      cronTime: new Date().toISOString()
    }
  };
} 