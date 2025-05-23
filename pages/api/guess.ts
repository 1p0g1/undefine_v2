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
import type { NextApiRequest } from 'next';
import type { GuessRequest, GuessResponse, ApiResponse, ErrorResponse } from 'types/api';
import { env } from '../../src/env.server';
import { validate as isUUID } from 'uuid';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(
  req: NextApiRequest,
  res: ApiResponse<GuessResponse>
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, player-id, Player-Id, playerId, playerid');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      details: 'Only POST requests are allowed'
    });
  }

  try {
    let body = '';
    await new Promise<void>((resolve) => {
      req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
      req.on('end', () => resolve());
    });
    
    const { gameId, guess, playerId } = JSON.parse(body) as GuessRequest;

    // Validate required fields
    if (!gameId || !guess || !playerId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'gameId, guess, and playerId are required'
      });
    }

    // Validate player_id is UUID
    if (!isUUID(playerId)) {
      return res.status(400).json({
        error: 'Invalid player ID',
        details: 'player_id must be a valid UUID'
      });
    }

    // Validate guess is non-empty string
    if (typeof guess !== 'string' || !guess.trim()) {
      return res.status(400).json({
        error: 'Invalid guess',
        details: 'guess must be a non-empty string'
      });
    }

    // Get the game session
    const { data: gameSession, error: gameError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !gameSession) {
      return res.status(404).json({ 
        error: 'Game session not found',
        details: gameError?.message
      });
    }

    // Get the word
    const { data: word, error: wordError } = await supabase
      .from('words')
      .select('*')
      .eq('id', gameSession.word_id)
      .single();

    if (wordError || !word) {
      return res.status(404).json({ 
        error: 'Word not found',
        details: wordError?.message
      });
    }

    const isCorrect = guess.toLowerCase() === word.word.toLowerCase();
    const isFuzzy = !isCorrect && guess.toLowerCase().includes(word.word.toLowerCase());
    const fuzzyPositions = isFuzzy ? Array.from({ length: word.word.length }, (_, i) => i) : [];

    // Update game session
    const updatedGuesses = [...(gameSession.guesses || []), guess];
    const isComplete = isCorrect || updatedGuesses.length >= 6;
    const completionTimeSeconds = isComplete ? Math.floor((Date.now() - new Date(gameSession.start_time).getTime()) / 1000) : null;

    const { error: updateError } = await supabase
      .from('game_sessions')
      .update({
        guesses: updatedGuesses,
        is_complete: isComplete,
        is_won: isCorrect,
        completion_time_seconds: completionTimeSeconds
      })
      .eq('id', gameId);

    if (updateError) {
      return res.status(500).json({ 
        error: 'Failed to update game session',
        details: updateError.message
      });
    }

    // Get current stats
    const { data: stats, error: statsError } = await supabase
      .from('user_stats')
      .select('games_played,games_won,current_streak,longest_streak,total_guesses,average_guesses_per_game,total_play_time_seconds')
      .eq('player_id', playerId)
      .single();

    if (statsError) {
      return res.status(500).json({ 
        error: 'Failed to fetch stats',
        details: statsError.message
      });
    }

    // Update stats if game is complete
    if (isComplete) {
      const newStats = {
        games_played: (stats.games_played || 0) + 1,
        games_won: isCorrect ? (stats.games_won || 0) + 1 : (stats.games_won || 0),
        current_streak: isCorrect ? (stats.current_streak || 0) + 1 : 0,
        longest_streak: isCorrect ? Math.max(stats.longest_streak || 0, (stats.current_streak || 0) + 1) : (stats.longest_streak || 0),
        total_guesses: (stats.total_guesses || 0) + updatedGuesses.length,
        average_guesses_per_game: ((stats.total_guesses || 0) + updatedGuesses.length) / ((stats.games_played || 0) + 1),
        total_play_time_seconds: (stats.total_play_time_seconds || 0) + (completionTimeSeconds || 0),
        last_played_word: word.word,
        updated_at: new Date().toISOString()
      };

      const { error: statsUpdateError } = await supabase
        .from('user_stats')
        .update(newStats)
        .eq('player_id', playerId);

      if (statsUpdateError) {
        console.error('[api/guess] Failed to update user stats:', statsUpdateError);
        return res.status(500).json({ 
          error: 'Failed to update user stats',
          details: statsUpdateError.message
        });
      }

      // Also create a score entry
      const { error: scoreError } = await supabase
        .from('scores')
        .insert([{
          player_id: playerId,
          word_id: word.id,
          guesses_used: updatedGuesses.length,
          completion_time_seconds: completionTimeSeconds,
          was_correct: isCorrect,
          submitted_at: new Date().toISOString()
        }]);

      if (scoreError) {
        console.error('[api/guess] Failed to create score entry:', scoreError);
        // Don't fail the request, just log the error
      }

      // Return updated stats
      return res.status(200).json({
        isCorrect,
        guess,
        isFuzzy,
        fuzzyPositions,
        gameOver: isComplete,
        revealedClues: [],
        usedHint: false,
        score: null,
        stats: {
          games_played: newStats.games_played,
          games_won: newStats.games_won,
          current_streak: newStats.current_streak,
          longest_streak: newStats.longest_streak
        }
      });
    }

    // Return current stats if game is not complete
    return res.status(200).json({
      isCorrect,
      guess,
      isFuzzy,
      fuzzyPositions,
      gameOver: isComplete,
      revealedClues: [],
      usedHint: false,
      score: null,
      stats: {
        games_played: stats.games_played ?? 0,
        games_won: stats.games_won ?? 0,
        current_streak: stats.current_streak ?? 0,
        longest_streak: stats.longest_streak ?? 0
      }
    });
  } catch (err) {
    console.error('[api/guess] Unexpected error:', err);
    return res.status(500).json({ 
      error: 'Unexpected error',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
} 