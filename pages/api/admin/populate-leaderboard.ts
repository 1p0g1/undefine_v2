import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/src/env.server';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

interface PopulationResult {
  success: boolean;
  message: string;
  stats: {
    processed: number;
    inserted: number;
    updated: number;
    skipped: number;
    errors: number;
  };
  details: Array<{
    player_id: string;
    word_id: string;
    action: 'inserted' | 'updated' | 'skipped' | 'error';
    reason?: string;
    error?: string;
  }>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PopulationResult>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      stats: { processed: 0, inserted: 0, updated: 0, skipped: 0, errors: 0 },
      details: []
    });
  }

  const { wordId, playerId, backfill, validate } = req.body;

  console.log('[/api/admin/populate-leaderboard] Starting leaderboard population:', {
    wordId,
    playerId,
    backfill,
    validate
  });

  try {
    const result = await populateLeaderboard({
      wordId,
      playerId,
      backfill: backfill || false,
      validate: validate || false
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('[/api/admin/populate-leaderboard] Population failed:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      stats: { processed: 0, inserted: 0, updated: 0, skipped: 0, errors: 1 },
      details: [{
        player_id: playerId || 'unknown',
        word_id: wordId || 'unknown',
        action: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }]
    });
  }
}

/**
 * Robust leaderboard population function
 * This is the core function that can be called from triggers, manual endpoints, or batch jobs
 */
export async function populateLeaderboard(options: {
  wordId?: string;
  playerId?: string;
  backfill?: boolean;
  validate?: boolean;
}): Promise<PopulationResult> {
  const { wordId, playerId, backfill = false, validate = false } = options;
  
  const result: PopulationResult = {
    success: true,
    message: '',
    stats: { processed: 0, inserted: 0, updated: 0, skipped: 0, errors: 0 },
    details: []
  };

  console.log('[populateLeaderboard] Starting with options:', options);

  try {
    // Step 1: Build query for completed, winning games
    let query = supabase
      .from('game_sessions')
      .select(`
        id,
        player_id,
        word_id,
        start_time,
        end_time,
        guesses,
        guesses_used,
        is_complete,
        is_won
      `)
      .eq('is_complete', true)
      .eq('is_won', true);

    // Apply filters
    if (wordId) {
      query = query.eq('word_id', wordId);
    }
    if (playerId) {
      query = query.eq('player_id', playerId);
    }
    if (!backfill) {
      // Only process recent games (last 7 days) unless backfill is requested
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      query = query.gte('end_time', sevenDaysAgo.toISOString());
    }

    const { data: completedGames, error: gamesError } = await query;

    if (gamesError) {
      throw new Error(`Failed to fetch completed games: ${gamesError.message}`);
    }

    if (!completedGames || completedGames.length === 0) {
      result.message = 'No completed games found to process';
      return result;
    }

    console.log(`[populateLeaderboard] Found ${completedGames.length} completed games to process`);

    // Step 2: Process each completed game
    for (const game of completedGames) {
      try {
        result.stats.processed++;
        
        // Validate game data
        if (!game.start_time || !game.end_time) {
          result.details.push({
            player_id: game.player_id,
            word_id: game.word_id,
            action: 'skipped',
            reason: 'Missing start_time or end_time'
          });
          result.stats.skipped++;
          continue;
        }

        // Calculate metrics
        const completionTimeSeconds = Math.floor(
          (new Date(game.end_time).getTime() - new Date(game.start_time).getTime()) / 1000
        );
        
        const guessesUsed = game.guesses_used || (game.guesses ? game.guesses.length : 0);

        if (completionTimeSeconds <= 0 || guessesUsed <= 0) {
          result.details.push({
            player_id: game.player_id,
            word_id: game.word_id,
            action: 'skipped',
            reason: `Invalid metrics: time=${completionTimeSeconds}s, guesses=${guessesUsed}`
          });
          result.stats.skipped++;
          continue;
        }

        // Step 3: Ensure user_stats entry exists (required for foreign key)
        await ensureUserStatsExists(game.player_id);

        // Step 4: Insert or update leaderboard entry
        const action = await upsertLeaderboardEntry({
          player_id: game.player_id,
          word_id: game.word_id,
          best_time: completionTimeSeconds,
          guesses_used: guessesUsed,
          date: new Date(game.end_time).toISOString().split('T')[0]
        });

        result.details.push({
          player_id: game.player_id,
          word_id: game.word_id,
          action
        });

        if (action === 'inserted') {
          result.stats.inserted++;
        } else if (action === 'updated') {
          result.stats.updated++;
        } else {
          result.stats.skipped++;
        }

      } catch (error) {
        console.error(`[populateLeaderboard] Error processing game ${game.id}:`, error);
        result.stats.errors++;
        result.details.push({
          player_id: game.player_id,
          word_id: game.word_id,
          action: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Step 5: Update rankings for affected words
    const affectedWords = Array.from(new Set(completedGames.map(g => g.word_id)));
    console.log(`[populateLeaderboard] Updating rankings for ${affectedWords.length} words`);
    
    for (const affectedWordId of affectedWords) {
      try {
        await updateRankingsForWord(affectedWordId);
      } catch (error) {
        console.error(`[populateLeaderboard] Failed to update rankings for word ${affectedWordId}:`, error);
        result.stats.errors++;
      }
    }

    // Step 6: Validation (if requested)
    if (validate) {
      const validationResult = await validateLeaderboardCompleteness(wordId);
      result.message += ` Validation: ${validationResult.message}`;
    }

    result.message = result.message || 
      `Successfully processed ${result.stats.processed} games. ` +
      `Inserted: ${result.stats.inserted}, Updated: ${result.stats.updated}, ` +
      `Skipped: ${result.stats.skipped}, Errors: ${result.stats.errors}`;

    result.success = result.stats.errors === 0;

    console.log('[populateLeaderboard] Completed:', result.stats);
    return result;

  } catch (error) {
    console.error('[populateLeaderboard] Fatal error:', error);
    result.success = false;
    result.message = error instanceof Error ? error.message : 'Unknown error';
    result.stats.errors++;
    return result;
  }
}

/**
 * Ensure user_stats entry exists for the player (required for foreign key)
 */
async function ensureUserStatsExists(playerId: string): Promise<void> {
  // REMOVED: user_stats upsert - table dropped, FK now points to players.id
  console.log('[ensureUserStatsEntry] Skipping user_stats - foreign key points to players.id');
  return;
}

/**
 * Insert or update leaderboard entry with proper conflict handling
 */
async function upsertLeaderboardEntry(entry: {
  player_id: string;
  word_id: string;
  best_time: number;
  guesses_used: number;
  date: string;
}): Promise<'inserted' | 'updated' | 'skipped'> {
  
  // First, check if entry already exists
  const { data: existing } = await supabase
    .from('leaderboard_summary')
    .select('id, best_time, guesses_used')
    .eq('player_id', entry.player_id)
    .eq('word_id', entry.word_id)
    .single();

  if (existing) {
    // Only update if new time is better
    if (entry.best_time < existing.best_time || 
        (entry.best_time === existing.best_time && entry.guesses_used < existing.guesses_used)) {
      
      const { error } = await supabase
        .from('leaderboard_summary')
        .update({
          best_time: entry.best_time,
          guesses_used: entry.guesses_used,
          date: entry.date
        })
        .eq('player_id', entry.player_id)
        .eq('word_id', entry.word_id);

      if (error) {
        throw new Error(`Failed to update leaderboard entry: ${error.message}`);
      }

      return 'updated';
    } else {
      return 'skipped'; // Existing time is better
    }
  } else {
    // Insert new entry
    const { error } = await supabase
      .from('leaderboard_summary')
      .insert({
        player_id: entry.player_id,
        word_id: entry.word_id,
        rank: 1, // Will be updated by ranking function
        was_top_10: true, // Will be updated by ranking function
        best_time: entry.best_time,
        guesses_used: entry.guesses_used,
        date: entry.date
      });

    if (error) {
      throw new Error(`Failed to insert leaderboard entry: ${error.message}`);
    }

    return 'inserted';
  }
}

/**
 * Update rankings for all entries of a specific word
 */
async function updateRankingsForWord(wordId: string): Promise<void> {
  // Get all entries for this word, ordered by performance
  const { data: entries, error: fetchError } = await supabase
    .from('leaderboard_summary')
    .select('id, player_id, best_time, guesses_used')
    .eq('word_id', wordId)
    .order('best_time', { ascending: true })
    .order('guesses_used', { ascending: true });

  if (fetchError) {
    throw new Error(`Failed to fetch leaderboard entries: ${fetchError.message}`);
  }

  if (!entries || entries.length === 0) {
    return; // No entries to rank
  }

  // Update each entry with correct rank
  for (let i = 0; i < entries.length; i++) {
    const rank = i + 1;
    const wasTop10 = rank <= 10;

    const { error: updateError } = await supabase
      .from('leaderboard_summary')
      .update({
        rank,
        was_top_10: wasTop10
      })
      .eq('id', entries[i].id);

    if (updateError) {
      console.error(`Failed to update rank for entry ${entries[i].id}:`, updateError);
      // Continue with other entries rather than failing completely
    }
  }
}

/**
 * Validate that all completed games appear in leaderboard
 */
async function validateLeaderboardCompleteness(wordId?: string): Promise<{
  valid: boolean;
  message: string;
  missingCount: number;
}> {
  let gameQuery = supabase
    .from('game_sessions')
    .select('player_id, word_id')
    .eq('is_complete', true)
    .eq('is_won', true);

  let leaderboardQuery = supabase
    .from('leaderboard_summary')
    .select('player_id, word_id');

  if (wordId) {
    gameQuery = gameQuery.eq('word_id', wordId);
    leaderboardQuery = leaderboardQuery.eq('word_id', wordId);
  }

  const [gamesResult, leaderboardResult] = await Promise.all([
    gameQuery,
    leaderboardQuery
  ]);

  if (gamesResult.error || leaderboardResult.error) {
    return {
      valid: false,
      message: 'Failed to fetch validation data',
      missingCount: 0
    };
  }

  const gameKeys = new Set(
    gamesResult.data?.map(g => `${g.player_id}:${g.word_id}`) || []
  );
  const leaderboardKeys = new Set(
    leaderboardResult.data?.map(l => `${l.player_id}:${l.word_id}`) || []
  );

  const missing = Array.from(gameKeys).filter(key => !leaderboardKeys.has(key));

  return {
    valid: missing.length === 0,
    message: missing.length === 0 
      ? 'All completed games are present in leaderboard'
      : `${missing.length} completed games missing from leaderboard`,
    missingCount: missing.length
  };
} 