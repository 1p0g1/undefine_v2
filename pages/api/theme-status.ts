/**
 * @fileoverview
 * Next.js API route for getting theme status and progress for the Theme of the Week feature.
 * 
 * @api {get} /api/theme-status Get theme status
 * @apiQuery {string} player_id UUID of the player
 * @apiSuccess {Object} response
 * @apiSuccess {string|null} response.currentTheme Current week's theme (only if already guessed correctly)
 * @apiSuccess {boolean} response.hasActiveTheme Whether there's an active theme this week
 * @apiSuccess {Object} response.progress Theme progress information
 * @apiSuccess {Array} response.weeklyThemedWords Player's completed themed words from current week
 * @apiError {Object} error Error response
 */

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '../../src/env.server';
import { withCors } from '@/lib/withCors';
import { 
  getThemeForDate,
  getThemeProgress, 
  isThemeGuessCorrect, 
  getPlayerWeeklyThemedWords 
} from '../../src/game/theme';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

interface ThemeStatusResponse {
  currentTheme?: string | null;
  hasActiveTheme: boolean;
  progress: {
    totalWords: number;
    completedWords: number;
    themeGuess: string | null;
    canGuessTheme: boolean;
    hasGuessedToday: boolean;
    isCorrectGuess: boolean;
  };
  weeklyThemedWords: Array<{
    id: string;
    word: string;
    date: string;
    completedOn: string;
    wasWon: boolean;
  }>;
}

export default withCors(async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ThemeStatusResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const playerId = (req.headers['player-id'] as string) ?? req.query.player_id as string;
    const requestedDate = req.query.date as string | undefined;
    
    if (!playerId) {
      return res.status(400).json({ error: 'Missing player_id' });
    }

    console.log('[/api/theme-status] Getting theme status for player:', playerId);

    const today = new Date().toISOString().split('T')[0];
    const themeContextDate = requestedDate || today;

    // Get theme for requested date's week (archive-safe)
    const currentTheme = await getThemeForDate(themeContextDate);
    console.log('[/api/theme-status] Theme context:', { requestedDate, today, themeContextDate, currentTheme });
    
    if (!currentTheme) {
      console.log('[/api/theme-status] No current theme found, returning inactive status');
      return res.status(200).json({
        hasActiveTheme: false,
        progress: {
          totalWords: 0,
          completedWords: 0,
          themeGuess: null,
          canGuessTheme: false,
          hasGuessedToday: false,
          isCorrectGuess: false
        },
        weeklyThemedWords: []
      });
    }

    // Get theme progress for player
    const progress = await getThemeProgress(playerId, currentTheme, themeContextDate);

    // Get player's completed themed words from current week
    const weeklyThemedWords = await getPlayerWeeklyThemedWords(playerId, currentTheme, themeContextDate);

    // Check if player's guess was correct (if they made one)
    let isCorrectGuess = false;
    if (progress.themeGuess) {
      const guessResult = await isThemeGuessCorrect(progress.themeGuess, currentTheme);
      isCorrectGuess = guessResult.isCorrect;
    }

    const response: ThemeStatusResponse = {
      hasActiveTheme: true,
      progress: {
        ...progress,
        isCorrectGuess
      },
      weeklyThemedWords
    };

    // Only reveal the actual theme if player guessed correctly
    if (isCorrectGuess) {
      response.currentTheme = currentTheme;
    }

    console.log('[/api/theme-status] Theme status:', {
      playerId,
      currentTheme,
      themeContextDate,
      hasGuess: !!progress.themeGuess,
      isCorrectGuess,
      progress: progress,
      weeklyWordsCount: weeklyThemedWords.length,
      canGuessTheme: progress.canGuessTheme
    });

    return res.status(200).json(response);

  } catch (error) {
    console.error('[/api/theme-status] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to get theme status'
    });
  }
}); 