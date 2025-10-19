/**
 * @fileoverview
 * Next.js API route for submitting theme guesses for the Theme of the Week feature.
 * 
 * Updated 2025-01-08: Now includes AI-powered fuzzy matching with detailed feedback
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
 * @apiSuccess {Object} response.fuzzyMatch Fuzzy matching details
 * @apiSuccess {string} response.fuzzyMatch.method How the match was determined ('exact', 'synonym', 'semantic', 'error')
 * @apiSuccess {number} response.fuzzyMatch.confidence Confidence score (0-100)
 * @apiSuccess {number} response.fuzzyMatch.similarity Semantic similarity score (0-1, if applicable)
 * @apiError {Object} error Error response
 * @apiError {string} error.error Error message
 */

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '../../src/env.server';
import { withCors } from '@/lib/withCors';
import { getCurrentTheme, submitThemeAttempt, getThemeProgress, isThemeGuessCorrect } from '../../src/game/theme';

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
  fuzzyMatch: {
    method: 'exact' | 'synonym' | 'semantic' | 'error';
    confidence: number;
    similarity?: number;
  };
  // NEW: Sunday failure revelation
  shouldRevealTheme?: boolean;
  revelationReason?: 'sunday_failure';
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

    console.log('[/api/theme-guess] Submitting theme attempt:', { 
      guess, 
      currentTheme 
    });

    // Get fuzzy matching details before submitting (for API response)
    const fuzzyMatchResult = await isThemeGuessCorrect(guess, currentTheme);
    
    console.log('[/api/theme-guess] Fuzzy matching result:', fuzzyMatchResult);

    // Submit theme attempt (handles validation and daily constraint)
    const attemptResult = await submitThemeAttempt(player_id, currentTheme, guess);

    if (!attemptResult.success) {
      if (attemptResult.alreadyGuessedToday) {
        return res.status(400).json({ 
          error: 'Already guessed today',
          details: { message: 'You can only make one theme guess per day' }
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to submit theme attempt'
      });
    }

    // Get updated theme progress
    const progress = await getThemeProgress(player_id, currentTheme);

    console.log('[/api/theme-guess] Theme guess processed:', {
      isCorrect: attemptResult.isCorrect,
      guess,
      currentTheme,
      progress,
      fuzzyMatch: fuzzyMatchResult
    });

    // Prepare response with fuzzy matching details
    const response: ThemeGuessResponse = {
      isCorrect: attemptResult.isCorrect,
      guess: guess.trim(),
      progress,
      fuzzyMatch: {
        method: fuzzyMatchResult.method,
        confidence: fuzzyMatchResult.confidence,
        similarity: fuzzyMatchResult.similarity
      }
    };

    // Only reveal actual theme if guess was correct
    if (attemptResult.isCorrect) {
      response.actualTheme = currentTheme;
    }

    // NEW: Check if this is a Sunday failure (incorrect guess on Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const isSunday = dayOfWeek === 0;
    
    if (!attemptResult.isCorrect && isSunday) {
      response.shouldRevealTheme = true;
      response.revelationReason = 'sunday_failure';
      response.actualTheme = currentTheme; // Reveal theme on Sunday failure
      
      console.log('[/api/theme-guess] Sunday failure revelation triggered:', {
        guess,
        actualTheme: currentTheme,
        dayOfWeek
      });
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