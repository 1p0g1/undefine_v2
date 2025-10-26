/**
 * @fileoverview
 * All-Time Theme Champions Leaderboard API
 * 
 * Displays cumulative theme guessing statistics across all players:
 * - Total themes unlocked (correctly guessed)
 * - Average day of week when themes are guessed
 * - Success rate
 * 
 * Sorting priority:
 * 1. Most themes unlocked (primary)
 * 2. Earlier average day (tiebreaker - faster is better)
 * 3. Higher success rate (final tiebreaker)
 * 
 * @api {get} /api/leaderboard/theme-alltime Get all-time theme leaderboard
 * @apiQuery {string} [player_id] Optional: Get specific player's rank
 * @apiSuccess {Object} response
 * @apiSuccess {Array} response.leaderboard Top players ranked by theme mastery
 * @apiSuccess {Object} response.playerRank Current player's rank (if player_id provided)
 */

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '../../../src/env.server';
import { withCors } from '@/lib/withCors';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

interface AllTimeThemeLeaderboardEntry {
  rank: number;
  playerId: string;
  displayName: string;
  themesUnlocked: number;     // Primary sort: total correct themes
  avgDayGuessed: number;      // Secondary sort: average day (1=Mon, 7=Sun)
  avgDayName: string;         // Human-readable day name (e.g., "Tuesday")
  avgConfidence: number;      // Average confidence % across all guesses
  totalCorrect: number;       // Context: total correct guesses
  totalAttempts: number;      // Context: total attempts
  successRate: number;        // Context: percentage (0-100)
  isCurrentPlayer?: boolean;
}

interface AllTimeThemeLeaderboardResponse {
  leaderboard: AllTimeThemeLeaderboardEntry[];
  playerRank?: AllTimeThemeLeaderboardEntry;
  totalPlayers: number;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AllTimeThemeLeaderboardResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { player_id } = req.query;
    const playerId = typeof player_id === 'string' ? player_id : undefined;

    console.log('[/api/leaderboard/theme-alltime] Fetching all-time theme leaderboard', { playerId });

    // Step 1: Get all unique themes and their start dates (Monday of each theme)
    // This is needed to calculate which day of the week players guessed on
    const { data: themeStarts, error: themeStartsError } = await supabase
      .from('words')
      .select('theme, date')
      .not('theme', 'is', null)
      .order('date', { ascending: true });

    if (themeStartsError) {
      console.error('[/api/leaderboard/theme-alltime] Error fetching theme starts:', themeStartsError);
      return res.status(500).json({ error: 'Failed to fetch theme data' });
    }

    // Build a map of theme -> earliest Monday date
    const themeStartMap = new Map<string, string>();
    if (themeStarts) {
      for (const word of themeStarts) {
        if (!themeStartMap.has(word.theme)) {
          themeStartMap.set(word.theme, word.date);
        }
      }
    }

    console.log('[/api/leaderboard/theme-alltime] Found', themeStartMap.size, 'unique themes');

    // Step 2: Get all correct theme attempts with their dates and confidence scores
    const { data: attempts, error: attemptsError } = await supabase
      .from('theme_attempts')
      .select('player_id, theme, attempt_date, is_correct, confidence_percentage')
      .eq('is_correct', true);

    if (attemptsError) {
      console.error('[/api/leaderboard/theme-alltime] Error fetching attempts:', attemptsError);
      return res.status(500).json({ error: 'Failed to fetch theme attempts' });
    }

    if (!attempts || attempts.length === 0) {
      console.log('[/api/leaderboard/theme-alltime] No correct theme guesses found');
      return res.status(200).json({
        leaderboard: [],
        totalPlayers: 0
      });
    }

    // Step 3: Calculate stats per player
    const playerStatsMap = new Map<string, {
      themesUnlocked: Set<string>;
      dayNumbers: number[];
      confidenceScores: number[];
      totalCorrect: number;
      totalAttempts: number;
    }>();

    // First pass: collect correct attempts
    for (const attempt of attempts) {
      const { player_id, theme, attempt_date, confidence_percentage } = attempt;
      
      if (!playerStatsMap.has(player_id)) {
        playerStatsMap.set(player_id, {
          themesUnlocked: new Set(),
          dayNumbers: [],
          confidenceScores: [],
          totalCorrect: 0,
          totalAttempts: 0
        });
      }

      const stats = playerStatsMap.get(player_id)!;
      stats.themesUnlocked.add(theme);
      stats.totalCorrect++;
      
      // Track confidence percentage
      if (confidence_percentage !== null && confidence_percentage !== undefined) {
        stats.confidenceScores.push(confidence_percentage);
      }

      // Calculate day number for this guess
      const themeStart = themeStartMap.get(theme);
      if (themeStart) {
        const startDate = new Date(themeStart);
        const guessDate = new Date(attempt_date);
        const daysDiff = Math.floor((guessDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const dayNumber = daysDiff + 1; // 1-indexed (1 = Monday)
        
        // Clamp to 1-7 range in case of data issues
        const clampedDay = Math.max(1, Math.min(7, dayNumber));
        stats.dayNumbers.push(clampedDay);
      }
    }

    // Second pass: get total attempts per player (including incorrect)
    const { data: allAttempts, error: allAttemptsError } = await supabase
      .from('theme_attempts')
      .select('player_id')
      .in('player_id', Array.from(playerStatsMap.keys()));

    if (!allAttemptsError && allAttempts) {
      const attemptCounts = new Map<string, number>();
      for (const attempt of allAttempts) {
        attemptCounts.set(attempt.player_id, (attemptCounts.get(attempt.player_id) || 0) + 1);
      }
      
      // Convert Map.entries() to array to avoid downlevelIteration requirement
      Array.from(playerStatsMap.entries()).forEach(([playerId, stats]) => {
        stats.totalAttempts = attemptCounts.get(playerId) || stats.totalCorrect;
      });
    }

    // Step 4: Get player display names
    const playerIds = Array.from(playerStatsMap.keys());
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, display_name')
      .in('id', playerIds);

    if (playersError) {
      console.error('[/api/leaderboard/theme-alltime] Error fetching players:', playersError);
      return res.status(500).json({ error: 'Failed to fetch player data' });
    }

    const playerNameMap = new Map(players?.map(p => [p.id, p.display_name || 'Anonymous']) || []);

    // Step 5: Build leaderboard entries with calculated stats
    const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    const entries: AllTimeThemeLeaderboardEntry[] = Array.from(playerStatsMap.entries())
      .map(([pid, stats]) => {
        const avgDay = stats.dayNumbers.length > 0
          ? stats.dayNumbers.reduce((sum, day) => sum + day, 0) / stats.dayNumbers.length
          : 0;
        
        const roundedAvgDay = Math.round(avgDay * 10) / 10; // Round to 1 decimal
        const avgDayIndex = Math.max(1, Math.min(7, Math.round(avgDay)));
        
        // Calculate average confidence percentage
        const avgConfidence = stats.confidenceScores.length > 0
          ? Math.round(stats.confidenceScores.reduce((sum, conf) => sum + conf, 0) / stats.confidenceScores.length)
          : 0;
        
        return {
          rank: 0, // Will be assigned after sorting
          playerId: pid,
          displayName: playerNameMap.get(pid) || 'Anonymous',
          themesUnlocked: stats.themesUnlocked.size,
          avgDayGuessed: roundedAvgDay,
          avgDayName: dayNames[avgDayIndex],
          avgConfidence,
          totalCorrect: stats.totalCorrect,
          totalAttempts: stats.totalAttempts,
          successRate: stats.totalAttempts > 0 
            ? Math.round((stats.totalCorrect / stats.totalAttempts) * 1000) / 10 
            : 0,
          isCurrentPlayer: playerId ? pid === playerId : false
        };
      })
      .filter(entry => entry.themesUnlocked > 0) // Only players with at least 1 theme
      .sort((a, b) => {
        // Primary: Most themes unlocked
        if (b.themesUnlocked !== a.themesUnlocked) {
          return b.themesUnlocked - a.themesUnlocked;
        }
        // Secondary: Earlier average day (lower is better)
        if (a.avgDayGuessed !== b.avgDayGuessed) {
          return a.avgDayGuessed - b.avgDayGuessed;
        }
        // Tertiary: Higher success rate
        return b.successRate - a.successRate;
      });

    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Step 6: Find player's rank if requested
    let playerRank: AllTimeThemeLeaderboardEntry | undefined;
    if (playerId) {
      playerRank = entries.find(entry => entry.playerId === playerId);
    }

    console.log('[/api/leaderboard/theme-alltime] Leaderboard generated:', {
      totalPlayers: entries.length,
      hasPlayerRank: !!playerRank
    });

    // Step 7: Return top 20 for main leaderboard (pagination support)
    const topLeaderboard = entries.slice(0, 20);

    return res.status(200).json({
      leaderboard: topLeaderboard,
      playerRank: playerRank && playerRank.rank > 20 ? playerRank : undefined,
      totalPlayers: entries.length
    });

  } catch (error) {
    console.error('[/api/leaderboard/theme-alltime] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withCors(handler);

