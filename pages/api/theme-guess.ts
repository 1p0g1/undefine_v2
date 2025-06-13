/**
 * @fileoverview
 * Next.js API route for submitting theme guesses for the Theme of the Week feature.
 * 
 * @api {post} /api/theme-guess Submit a theme guess
 * @apiBody {string} player_id UUID of the player
 * @apiBody {string} guess The theme guess
 * @apiBody {string} gameId Current game session ID
 * @apiSuccess {Object} response
 * @apiSuccess {boolean} response.isCorrect Whether the theme guess was correct
 * @apiSuccess {string} response.guess The submitted guess
 * @apiSuccess {string} response.actualTheme The actual theme (if guess was correct)
 * @apiSuccess {Object} response.progress Theme progress information
 * @apiError {Object} error Error response
 * @apiError {string} error.error Error message
 */

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/src/env.server';
import { withCors } from '@/lib/withCors';
import { getCurrentTheme, isThemeGuessCorrect, getThemeProgress } from '@/src/game/theme';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

interface ThemeGuessRequest {
  player_id: string;
  guess: string;
  gameId: string;
}

interface ThemeGuessResponse {
  isCorrect: boolean;
  guess: string;
  actualTheme?: string;
  progress: {
    totalWords: number;
    completedWords: number;
    themeGuess: string | null;
    canGuessTheme: boolean;
  };
}

export default withCors(async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ThemeGuessResponse | { error: string, details?: any }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { player_id, guess, gameId } = req.body as ThemeGuessRequest;
    
    console.log('[/api/theme-guess] Processing theme guess:', { player_id, guess, gameId });

    // Validate required fields
    if (!player_id || !guess || !gameId) {
      const missing = [];
      if (!player_id) missing.push('player_id');
      if (!guess) missing.push('guess');
      if (!gameId) missing.push('gameId');
      
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: { missing }
      });
    }

    // Validate game session exists and belongs to player
    const { data: gameSession, error: sessionError } = await supabase
      .from('game_sessions')
      .select('id, player_id, word_id, theme_guess')
      .eq('id', gameId)
      .eq('player_id', player_id)
      .single();

    if (sessionError || !gameSession) {
      console.error('[/api/theme-guess] Game session not found:', sessionError);
      return res.status(404).json({ 
        error: 'Game session not found',
        details: sessionError?.message
      });
    }

    // Check if player has already made a theme guess
    if (gameSession.theme_guess) {
      return res.status(400).json({ 
        error: 'Theme guess already submitted',
        details: { existingGuess: gameSession.theme_guess }
      });
    }

    // Get current theme
    const currentTheme = await getCurrentTheme();
    if (!currentTheme) {
      return res.status(400).json({ 
        error: 'No active theme for this week' 
      });
    }

    console.log('[/api/theme-guess] Validating guess against theme:', { 
      guess, 
      currentTheme 
    });

    // Validate the theme guess
    const isCorrect = isThemeGuessCorrect(guess, currentTheme);

    // Store the theme guess in the game session
    const { error: updateError } = await supabase
      .from('game_sessions')
      .update({ 
        theme_guess: guess.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', gameId);

    if (updateError) {
      console.error('[/api/theme-guess] Failed to update game session:', updateError);
      return res.status(500).json({ 
        error: 'Failed to store theme guess',
        details: updateError.message
      });
    }

    // Get updated theme progress
    const progress = await getThemeProgress(player_id, currentTheme);

    console.log('[/api/theme-guess] Theme guess processed:', {
      isCorrect,
      guess,
      currentTheme,
      progress
    });

    // Prepare response
    const response: ThemeGuessResponse = {
      isCorrect,
      guess: guess.trim(),
      progress
    };

    // Only reveal actual theme if guess was correct
    if (isCorrect) {
      response.actualTheme = currentTheme;
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('[/api/theme-guess] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to process theme guess',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}); 