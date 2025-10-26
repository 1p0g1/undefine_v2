/**
 * @fileoverview
 * Weekly Theme Leaderboard API - Shows who guessed this week's theme and when
 * 
 * Displays players who correctly guessed the current week's theme, sorted by:
 * 1. Day of week (Monday = earliest, Sunday = latest)
 * 2. Time of day (earlier is better for ties)
 * 
 * @api {get} /api/leaderboard/theme-weekly Get weekly theme leaderboard
 * @apiQuery {string} [player_id] Optional: Get specific player's rank
 * @apiSuccess {Object} response
 * @apiSuccess {string} response.currentTheme The theme for this week
 * @apiSuccess {Array} response.leaderboard Top players who guessed correctly
 * @apiSuccess {Object} response.playerRank Current player's rank (if player_id provided)
 */

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '../../../src/env.server';
import { withCors } from '@/lib/withCors';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

interface WeeklyThemeLeaderboardEntry {
  rank: number;
  playerId: string;
  displayName: string;
  dayNumber: number;        // 1-7 (Mon-Sun)
  dayName: string;          // "Monday", "Tuesday", etc.
  timeGuessed: string;      // "14:23" (24-hour format)
  createdAt: string;        // Full ISO timestamp for precise sorting
  isCurrentPlayer?: boolean;
}

interface WeeklyThemeLeaderboardResponse {
  currentTheme: string | null;
  themeName: string | null;
  leaderboard: WeeklyThemeLeaderboardEntry[];
  playerRank?: WeeklyThemeLeaderboardEntry;
  totalPlayers: number;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WeeklyThemeLeaderboardResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { player_id } = req.query;
    const playerId = typeof player_id === 'string' ? player_id : undefined;

    console.log('[/api/leaderboard/theme-weekly] Fetching weekly theme leaderboard', { playerId });

    // Step 1: Get current week's theme from words table
    // Find the theme for this week (Monday-Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday, etc.
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust Sunday to 6
    
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - daysFromMonday);
    thisMonday.setHours(0, 0, 0, 0);
    
    const nextMonday = new Date(thisMonday);
    nextMonday.setDate(thisMonday.getDate() + 7);

    console.log('[/api/leaderboard/theme-weekly] Week boundaries:', {
      thisMonday: thisMonday.toISOString().split('T')[0],
      nextMonday: nextMonday.toISOString().split('T')[0]
    });

    // Get the theme for this week
    const { data: currentWeekWords, error: themeError } = await supabase
      .from('words')
      .select('theme, word, date')
      .gte('date', thisMonday.toISOString().split('T')[0])
      .lt('date', nextMonday.toISOString().split('T')[0])
      .not('theme', 'is', null)
      .order('date', { ascending: true })
      .limit(7);

    if (themeError) {
      console.error('[/api/leaderboard/theme-weekly] Error fetching theme:', themeError);
      return res.status(500).json({ error: 'Failed to fetch current theme' });
    }

    if (!currentWeekWords || currentWeekWords.length === 0) {
      console.log('[/api/leaderboard/theme-weekly] No theme found for current week');
      return res.status(200).json({
        currentTheme: null,
        themeName: null,
        leaderboard: [],
        totalPlayers: 0
      });
    }

    const currentTheme = currentWeekWords[0].theme;
    console.log('[/api/leaderboard/theme-weekly] Current theme:', currentTheme);

    // Step 2: Find the Monday that started this theme
    // (needed to calculate day numbers correctly)
    const { data: themeMondayData, error: mondayError } = await supabase
      .from('words')
      .select('date')
      .eq('theme', currentTheme)
      .order('date', { ascending: true })
      .limit(1);

    if (mondayError || !themeMondayData || themeMondayData.length === 0) {
      console.error('[/api/leaderboard/theme-weekly] Error finding theme start:', mondayError);
      return res.status(500).json({ error: 'Failed to find theme start date' });
    }

    const themeStartDate = themeMondayData[0].date;
    console.log('[/api/leaderboard/theme-weekly] Theme started on:', themeStartDate);

    // Step 3: Get all players who guessed this theme correctly
    const { data: attempts, error: attemptsError } = await supabase
      .from('theme_attempts')
      .select(`
        player_id,
        attempt_date,
        created_at,
        is_correct
      `)
      .eq('theme', currentTheme)
      .eq('is_correct', true)
      .order('attempt_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (attemptsError) {
      console.error('[/api/leaderboard/theme-weekly] Error fetching attempts:', attemptsError);
      return res.status(500).json({ error: 'Failed to fetch theme attempts' });
    }

    if (!attempts || attempts.length === 0) {
      console.log('[/api/leaderboard/theme-weekly] No correct guesses yet');
      return res.status(200).json({
        currentTheme,
        themeName: currentTheme,
        leaderboard: [],
        totalPlayers: 0
      });
    }

    // Step 4: Get player display names
    const playerIds = attempts.map(a => a.player_id);
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, display_name')
      .in('id', playerIds);

    if (playersError) {
      console.error('[/api/leaderboard/theme-weekly] Error fetching players:', playersError);
      return res.status(500).json({ error: 'Failed to fetch player data' });
    }

    const playerMap = new Map(players?.map(p => [p.id, p.display_name || 'Anonymous']) || []);

    // Step 5: Build leaderboard entries
    const leaderboardEntries: WeeklyThemeLeaderboardEntry[] = attempts.map((attempt, index) => {
      // Calculate day number (1-7 where 1 = Monday)
      const attemptDate = new Date(attempt.attempt_date);
      const themeStart = new Date(themeStartDate);
      const daysDiff = Math.floor((attemptDate.getTime() - themeStart.getTime()) / (1000 * 60 * 60 * 24));
      const dayNumber = daysDiff + 1;

      // Get day name
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[attemptDate.getDay()];

      // Extract time in HH:MM format (24-hour)
      const createdDate = new Date(attempt.created_at);
      const hours = String(createdDate.getHours()).padStart(2, '0');
      const minutes = String(createdDate.getMinutes()).padStart(2, '0');
      const timeGuessed = `${hours}:${minutes}`;

      return {
        rank: index + 1,
        playerId: attempt.player_id,
        displayName: playerMap.get(attempt.player_id) || 'Anonymous',
        dayNumber,
        dayName,
        timeGuessed,
        createdAt: attempt.created_at,
        isCurrentPlayer: playerId ? attempt.player_id === playerId : false
      };
    });

    // Step 6: Find player's rank if requested
    let playerRank: WeeklyThemeLeaderboardEntry | undefined;
    if (playerId) {
      playerRank = leaderboardEntries.find(entry => entry.playerId === playerId);
    }

    console.log('[/api/leaderboard/theme-weekly] Leaderboard generated:', {
      theme: currentTheme,
      totalPlayers: leaderboardEntries.length,
      hasPlayerRank: !!playerRank
    });

    // Step 7: Return top 20 for main leaderboard (pagination support)
    const topLeaderboard = leaderboardEntries.slice(0, 20);

    return res.status(200).json({
      currentTheme,
      themeName: currentTheme,
      leaderboard: topLeaderboard,
      playerRank: playerRank && playerRank.rank > 20 ? playerRank : undefined,
      totalPlayers: leaderboardEntries.length
    });

  } catch (error) {
    console.error('[/api/leaderboard/theme-weekly] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withCors(handler);

