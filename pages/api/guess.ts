/**
 * @fileoverview
 * Next.js API route for submitting a guess and updating game state in Supabase.
 * 
 * @api {post} /api/guess Submit a guess
 * @apiBody {string} player_id UUID of the player
 * @apiBody {string} guess The word being guessed
 * @apiBody {string} gameId Current game session ID
 * @apiSuccess {Object} response
 * @apiSuccess {boolean} response.isCorrect Whether the guess was correct
 * @apiSuccess {string} response.guess The submitted guess
 * @apiSuccess {boolean} response.isFuzzy Whether the guess was a fuzzy match
 * @apiSuccess {number[]} response.fuzzyPositions Positions of fuzzy matches
 * @apiSuccess {boolean} response.gameOver Whether the game is complete
 * @apiSuccess {Object} response.stats Player statistics
 * @apiError {Object} error Error response
 * @apiError {string} error.error Error message
 * @apiError {string} [error.details] Additional error details if available
 */

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { GuessRequest, GuessResponse, ApiResponse } from 'types/api';
import { env } from '../../src/env.server';
import { validate as isUUID } from 'uuid';
import { ClueKey, CLUE_SEQUENCE } from '@/src/types/clues';
import { withCors } from '@/lib/withCors';
import { submitGuess } from '@/game/guess';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate fuzzy match positions between two strings
 */
function getFuzzyPositions(guess: string, word: string): number[] {
  const positions: number[] = [];
  const guessLower = guess.toLowerCase();
  const wordLower = word.toLowerCase();
  
  for (let i = 0; i < guess.length; i++) {
    if (i < word.length && guessLower[i] === wordLower[i]) {
      positions.push(i);
      continue;
    }
    if (wordLower.includes(guessLower[i])) {
      positions.push(i);
    }
  }
  
  return positions;
}

/**
 * Get the next clue to reveal based on current revealed clues
 */
function getNextClueKey(revealedClues: ClueKey[]): ClueKey | null {
  for (const clue of CLUE_SEQUENCE) {
    if (!revealedClues.includes(clue)) {
      return clue;
    }
  }
  return null;
}

/**
 * Calculate score based on game session
 */
function calculateScore(
  guessesUsed: number,
  completionTimeSeconds: number,
  isWon: boolean
): number {
  if (!isWon) return 0;
  const baseScore = 1000;
  const guessDeduction = (guessesUsed - 1) * 100;
  const timeDeduction = Math.floor(completionTimeSeconds / 10);
  return Math.max(0, baseScore - guessDeduction - timeDeduction);
}

/**
 * Update user stats based on game outcome
 */
async function updateUserStats(
  playerId: string,
  isWon: boolean,
  guessesUsed: number,
  completionTimeSeconds: number | null
) {
  if (!completionTimeSeconds) {
    throw new Error('Completion time is required for updating stats');
  }

  const { data: stats, error: statsError } = await supabase
    .from('user_stats')
    .select('*')
    .eq('player_id', playerId)
    .single();

  if (statsError) {
    console.error('[updateUserStats] Failed to fetch stats:', statsError);
    throw statsError;
  }

  const newStats = {
    games_played: (stats?.games_played || 0) + 1,
    games_won: isWon ? (stats?.games_won || 0) + 1 : (stats?.games_won || 0),
    current_streak: isWon ? (stats?.current_streak || 0) + 1 : 0,
    longest_streak: isWon 
      ? Math.max(stats?.longest_streak || 0, (stats?.current_streak || 0) + 1) 
      : (stats?.longest_streak || 0),
    total_guesses: (stats?.total_guesses || 0) + guessesUsed,
    average_guesses_per_game: ((stats?.total_guesses || 0) + guessesUsed) / ((stats?.games_played || 0) + 1),
    total_play_time_seconds: (stats?.total_play_time_seconds || 0) + completionTimeSeconds,
    updated_at: new Date().toISOString()
  };

  const { error: updateError } = await supabase
    .from('user_stats')
    .update(newStats)
    .eq('player_id', playerId);

  if (updateError) {
    console.error('[updateUserStats] Failed to update stats:', updateError);
    throw updateError;
  }

  return newStats;
}

/**
 * Create a score entry for a completed game
 */
async function createScoreEntry(
  playerId: string,
  wordId: string,
  guessesUsed: number,
  completionTimeSeconds: number | null,
  isWon: boolean
) {
  if (!completionTimeSeconds) {
    throw new Error('Completion time is required for creating score entry');
  }

  const { error: scoreError } = await supabase
    .from('scores')
    .insert([{
      player_id: playerId,
      word_id: wordId,
      guesses_used: guessesUsed,
      completion_time_seconds: completionTimeSeconds,
      was_correct: isWon,
      submitted_at: new Date().toISOString()
    }]);

  if (scoreError) {
    console.error('[createScoreEntry] Failed to create score:', scoreError);
    throw scoreError;
  }
}

/**
 * Update leaderboard summary if score is in top 10
 */
async function updateLeaderboardSummary(
  playerId: string,
  wordId: string,
  guessesUsed: number,
  completionTimeSeconds: number | null
) {
  if (!completionTimeSeconds) {
    throw new Error('Completion time is required for updating leaderboard');
  }

  // Get current top 10 for this word
  const { data: leaderboard, error: leaderboardError } = await supabase
    .from('leaderboard_summary')
    .select('*')
    .eq('word_id', wordId)
    .order('completion_time_seconds', { ascending: true })
    .order('guesses_used', { ascending: true })
    .limit(10);

  if (leaderboardError) {
    console.error('[updateLeaderboardSummary] Failed to fetch leaderboard:', leaderboardError);
    throw leaderboardError;
  }

  // Check if score qualifies for top 10
  const isTop10 = leaderboard.length < 10 || 
    completionTimeSeconds < leaderboard[leaderboard.length - 1].completion_time_seconds ||
    (completionTimeSeconds === leaderboard[leaderboard.length - 1].completion_time_seconds && 
     guessesUsed < leaderboard[leaderboard.length - 1].guesses_used);

  if (isTop10) {
    const { error: insertError } = await supabase
      .from('leaderboard_summary')
      .insert([{
        player_id: playerId,
        word_id: wordId,
        rank: leaderboard.length + 1,
        was_top_10: true,
        best_time_seconds: completionTimeSeconds,
        guesses_used: guessesUsed,
        created_at: new Date().toISOString()
      }]);

    if (insertError) {
      console.error('[updateLeaderboardSummary] Failed to insert leaderboard entry:', insertError);
      throw insertError;
    }
  }
}

export default withCors(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { guess, gameId } = req.body;
    const playerId = req.headers['player-id'] as string;

    if (!guess || !gameId || !playerId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await submitGuess({ guess, gameId, playerId });
    res.status(200).json(result);
  } catch (error) {
    console.error('[/api/guess] Error:', error);
    res.status(500).json({ error: 'Failed to submit guess' });
  }
}); 