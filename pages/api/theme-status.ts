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
import { env } from '@/src/env.server';
import { withCors } from '@/lib/withCors';
import { 
  getCurrentTheme, 
  getThemeProgress, 
  isThemeGuessCorrect, 
  getPlayerWeeklyThemedWords 
} from '@/src/game/theme';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

interface ThemeStatusResponse {
  currentTheme?: string | null;
  hasActiveTheme: boolean;
  progress: {
    totalWords: number;
    completedWords: number;
    themeGuess: string | null;
    canGuessTheme: boolean;
    isCorrectGuess?: boolean;
  };
  weeklyThemedWords: Array<{
    id: string;
    word: string;
    date: string;
    completedOn: string;
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
    
    if (!playerId) {
      return res.status(400).json({ error: 'Missing player_id' });
    }

    console.log('[/api/theme-status] Getting theme status for player:', playerId);

    // Get current theme
    const currentTheme = await getCurrentTheme();
    console.log('[/api/theme-status] Current theme from getCurrentTheme():', currentTheme);
    
    if (!currentTheme) {
      console.log('[/api/theme-status] No current theme found, returning inactive status');
      return res.status(200).json({
        hasActiveTheme: false,
        progress: {
          totalWords: 0,
          completedWords: 0,
          themeGuess: null,
          canGuessTheme: false
        },
        weeklyThemedWords: []
      });
    }

    // Get theme progress for player
    const progress = await getThemeProgress(playerId, currentTheme);

    // Get player's completed themed words from current week
    const weeklyThemedWords = await getPlayerWeeklyThemedWords(playerId, currentTheme);

    // Check if player's guess was correct (if they made one)
    let isCorrectGuess = false;
    if (progress.themeGuess) {
      isCorrectGuess = isThemeGuessCorrect(progress.themeGuess, currentTheme);
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
      hasGuess: !!progress.themeGuess,
      isCorrectGuess,
      progress: progress,
      weeklyWordsCount: weeklyThemedWords.length
    });

    return res.status(200).json(response);

  } catch (error) {
    console.error('[/api/theme-status] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to get theme status'
    });
  }
}); 