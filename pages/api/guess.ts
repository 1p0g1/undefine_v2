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
import { env } from '@/src/env.server';
import { validate as isUUID } from 'uuid';
import { ClueKey, CLUE_SEQUENCE } from '@/shared-types/src/clues';
import { withCors } from '@/lib/withCors';
import { submitGuess } from '@/src/game/guess';
import type { GuessRequest, GuessResponse, GameSession } from '@/src/types/guess';
import { normalizeText } from '@/src/utils/text';
import { calculateScore, type ScoreResult } from '@/shared-types/src/scoring';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Calculate Levenshtein distance between two strings after normalization
 * Note: This is currently unused as we use fuzzy position matching instead
 * Keeping for potential future use in difficulty calculation or word suggestions
 */
function levenshteinDistance(a: string, b: string): number {
  const normalizedA = normalizeText(a);
  const normalizedB = normalizeText(b);
  
  const matrix = Array(normalizedB.length + 1).fill(null).map(() => Array(normalizedA.length + 1).fill(null));

  for (let i = 0; i <= normalizedA.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= normalizedB.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= normalizedB.length; j++) {
    for (let i = 1; i <= normalizedA.length; i++) {
      const substitutionCost = normalizedA[i - 1] === normalizedB[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }

  return matrix[normalizedB.length][normalizedA.length];
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
 * Update user stats based on game outcome
 */
async function updateUserStats(
  playerId: string,
  isWon: boolean,
  guessesUsed: number,
  completionTimeSeconds: number | null,
  scoreResult: ScoreResult
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
    total_score: (stats?.total_score || 0) + scoreResult.score,
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
  isWon: boolean,
  scoreResult: ScoreResult
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
      score: scoreResult.score,
      base_score: scoreResult.baseScore,
      guess_penalty: scoreResult.guessPenalty,
      time_penalty: scoreResult.timePenalty,
      hint_penalty: scoreResult.hintPenalty,
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
  completionTimeSeconds: number | null,
  scoreResult: ScoreResult
) {
  if (!completionTimeSeconds) {
    throw new Error('Completion time is required for updating leaderboard');
  }

  const { data: leaderboard, error: leaderboardError } = await supabase
    .from('leaderboard_summary')
    .select('*')
    .eq('word_id', wordId)
    .order('score', { ascending: false })
    .order('completion_time_seconds', { ascending: true })
    .limit(10);

  if (leaderboardError) {
    console.error('[updateLeaderboardSummary] Failed to fetch leaderboard:', leaderboardError);
    throw leaderboardError;
  }

  const isTop10 = leaderboard.length < 10 || 
    scoreResult.score > leaderboard[leaderboard.length - 1].score ||
    (scoreResult.score === leaderboard[leaderboard.length - 1].score && 
     completionTimeSeconds < leaderboard[leaderboard.length - 1].completion_time_seconds);

  if (isTop10) {
    const { error: insertError } = await supabase
      .from('leaderboard_summary')
      .insert([{
        player_id: playerId,
        word_id: wordId,
        rank: leaderboard.length + 1,
        was_top_10: true,
        score: scoreResult.score,
        guesses_used: guessesUsed,
        completion_time_seconds: completionTimeSeconds,
        created_at: new Date().toISOString()
      }]);

    if (insertError) {
      console.error('[updateLeaderboardSummary] Failed to insert leaderboard entry:', insertError);
      throw insertError;
    }
  }
}

interface GameSessionWithWord extends GameSession {
  words: {
    word: string;
    definition: string;
    etymology: string | null;
    first_letter: string;
    in_a_sentence: string;
    number_of_letters: number;
    equivalents: string[] | null;
    difficulty: number | null;
    date: string | null;
  };
  clue_status?: Record<string, boolean>;
}

export default withCors(async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GuessResponse | { error: string, details?: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { guess, gameId, wordId, start_time } = req.body;
    // TODO: Replace with strict player validation before production
    const playerId = (req.headers['player-id'] as string) ?? 'anonymous';
    console.log('[/api/guess] Processing guess:', { guess, gameId, playerId, wordId });

    // Validate all required fields
    if (!guess || !gameId || !wordId || !start_time) {
      const missingFields = [
        !guess && 'guess',
        !gameId && 'gameId',
        !wordId && 'wordId',
        !start_time && 'start_time'
      ].filter(Boolean);
      
      console.error('[/api/guess] Missing required fields:', missingFields);
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: `Missing: ${missingFields.join(', ')}`
      });
    }

    // Validate game session exists and matches
    const { data: gameSession, error: sessionError } = await supabase
      .from('game_sessions')
      .select(`
        id,
        word_id,
        revealed_clues,
        guesses,
        is_complete,
        start_time,
        clue_status,
        words:word_id (
          word,
          definition,
          etymology,
          first_letter,
          in_a_sentence,
          number_of_letters,
          equivalents,
          difficulty,
          date
        )
      `)
      .eq('id', gameId)
      .eq('word_id', wordId)  // Ensure word_id matches
      .single() as unknown as { data: GameSessionWithWord | null, error: any };

    if (sessionError || !gameSession) {
      console.error('[/api/guess] Failed to fetch game session:', {
        error: sessionError,
        details: sessionError?.details,
        hint: sessionError?.hint,
        code: sessionError?.code,
        gameId,
        wordId
      });
      return res.status(404).json({ 
        error: 'Game session not found',
        details: 'Invalid game session or word ID'
      });
    }

    if (gameSession.is_complete) {
      return res.status(400).json({ error: 'Game session is already complete' });
    }

    // Validate start_time matches
    if (gameSession.start_time !== start_time) {
      console.error('[/api/guess] Start time mismatch:', {
        session: gameSession.start_time,
        request: start_time
      });
      return res.status(400).json({ 
        error: 'Invalid start time',
        details: 'Start time does not match game session'
      });
    }

    const result = await submitGuess({
      guess,
      gameId,
      playerId,
      wordId: gameSession.word_id,
      start_time: gameSession.start_time
    }, gameSession.words.word, gameSession.revealed_clues || []);

    // Calculate completion time and score if game is over
    const completionTimeSeconds = result.gameOver ? 
      Math.floor((Date.now() - new Date(gameSession.start_time).getTime()) / 1000) : null;

    const scoreResult = result.gameOver ? calculateScore({
      guessesUsed: (gameSession.guesses || []).length + 1,
      completionTimeSeconds: completionTimeSeconds || 0,
      usedHint: false, // Hints are not implemented yet
      isWon: result.isCorrect
    }) : null;

    // Update game session with new state
    const { error: updateError } = await supabase
      .from('game_sessions')
      .update({
        word: gameSession.words.word,
        guesses: [...(gameSession.guesses || []), result.guess],
        revealed_clues: result.revealedClues.map(() => true),  // Convert to boolean array
        clue_status: result.revealedClues.reduce((acc, key) => ({ ...acc, [key]: true }), gameSession.clue_status || {}),
        is_complete: result.gameOver,
        is_won: result.isCorrect,
        end_time: result.gameOver ? new Date().toISOString() : null,
        score: scoreResult?.score || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', gameId);

    if (updateError) {
      console.error('[/api/guess] Failed to update game session:', updateError);
      return res.status(500).json({ error: 'Failed to update game session' });
    }

    // If game is complete, update stats and create score entry
    if (result.gameOver && completionTimeSeconds && scoreResult) {
      const stats = await updateUserStats(
        playerId,
        result.isCorrect,
        gameSession.guesses.length + 1,
        completionTimeSeconds,
        scoreResult
      );

      await createScoreEntry(
        playerId,
        gameSession.word_id,
        gameSession.guesses.length + 1,
        completionTimeSeconds,
        result.isCorrect,
        scoreResult
      );

      await updateLeaderboardSummary(
        playerId,
        gameSession.word_id,
        gameSession.guesses.length + 1,
        completionTimeSeconds,
        scoreResult
      );

      return res.status(200).json({
        ...result,
        score: scoreResult,
        stats
      });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('[/api/guess] Error:', error);
    res.status(500).json({ error: 'Failed to submit guess' });
  }
}); 