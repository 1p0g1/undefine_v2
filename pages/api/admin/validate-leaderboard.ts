import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/src/env.server';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

interface ValidationResult {
  valid: boolean;
  message: string;
  missingCount: number;
  missingPlayers: Array<{
    player_id: string;
    player_name: string;
    word_id: string;
    completion_time: number;
    guesses_used: number;
    completed_at: string;
  }>;
  stats: {
    totalCompletedGames: number;
    totalLeaderboardEntries: number;
    missingEntries: number;
    validationDate: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ValidationResult>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      valid: false,
      message: 'Method not allowed',
      missingCount: 0,
      missingPlayers: [],
      stats: {
        totalCompletedGames: 0,
        totalLeaderboardEntries: 0,
        missingEntries: 0,
        validationDate: new Date().toISOString()
      }
    });
  }

  const { wordId } = req.query;

  console.log('[/api/admin/validate-leaderboard] Starting validation:', { wordId });

  try {
    const validation = await validateLeaderboardCompleteness(
      typeof wordId === 'string' ? wordId : undefined
    );

    return res.status(200).json(validation);
  } catch (error) {
    console.error('[/api/admin/validate-leaderboard] Validation failed:', error);
    return res.status(500).json({
      valid: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      missingCount: 0,
      missingPlayers: [],
      stats: {
        totalCompletedGames: 0,
        totalLeaderboardEntries: 0,
        missingEntries: 0,
        validationDate: new Date().toISOString()
      }
    });
  }
}

/**
 * Comprehensive validation of leaderboard completeness
 */
async function validateLeaderboardCompleteness(wordId?: string): Promise<ValidationResult> {
  console.log('[validateLeaderboardCompleteness] Starting validation for wordId:', wordId);

  // Build queries
  let gameQuery = supabase
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

  let leaderboardQuery = supabase
    .from('leaderboard_summary')
    .select('player_id, word_id');

  if (wordId) {
    gameQuery = gameQuery.eq('word_id', wordId);
    leaderboardQuery = leaderboardQuery.eq('word_id', wordId);
  }

  // Execute queries
  const [gamesResult, leaderboardResult, playersResult] = await Promise.all([
    gameQuery,
    leaderboardQuery,
    supabase.from('players').select('id, display_name')
  ]);

  if (gamesResult.error || leaderboardResult.error || playersResult.error) {
    throw new Error('Failed to fetch validation data');
  }

  const completedGames = gamesResult.data || [];
  const leaderboardEntries = leaderboardResult.data || [];
  const players = playersResult.data || [];

  // Create lookup maps
  const playersMap = new Map(
    players.map(p => [p.id, p.display_name || `Player ${p.id.slice(-4)}`])
  );

  const leaderboardKeys = new Set(
    leaderboardEntries.map(l => `${l.player_id}:${l.word_id}`)
  );

  // Find missing players
  const missingPlayers: ValidationResult['missingPlayers'] = [];

  for (const game of completedGames) {
    const gameKey = `${game.player_id}:${game.word_id}`;
    
    if (!leaderboardKeys.has(gameKey)) {
      // Calculate game metrics
      const completionTime = game.start_time && game.end_time
        ? Math.floor((new Date(game.end_time).getTime() - new Date(game.start_time).getTime()) / 1000)
        : 0;
        
      const guessesUsed = game.guesses_used || (game.guesses ? game.guesses.length : 0);

      missingPlayers.push({
        player_id: game.player_id,
        player_name: playersMap.get(game.player_id) || `Player ${game.player_id.slice(-4)}`,
        word_id: game.word_id,
        completion_time: completionTime,
        guesses_used: guessesUsed,
        completed_at: game.end_time || game.start_time || ''
      });
    }
  }

  const result: ValidationResult = {
    valid: missingPlayers.length === 0,
    message: missingPlayers.length === 0 
      ? 'All completed games are present in leaderboard'
      : `${missingPlayers.length} completed games missing from leaderboard`,
    missingCount: missingPlayers.length,
    missingPlayers: missingPlayers.sort((a, b) => 
      new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
    ),
    stats: {
      totalCompletedGames: completedGames.length,
      totalLeaderboardEntries: leaderboardEntries.length,
      missingEntries: missingPlayers.length,
      validationDate: new Date().toISOString()
    }
  };

  console.log('[validateLeaderboardCompleteness] Validation complete:', {
    valid: result.valid,
    missingCount: result.missingCount,
    totalGames: result.stats.totalCompletedGames
  });

  return result;
} 