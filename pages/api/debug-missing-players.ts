import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/src/env.server';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wordId } = req.query;

  if (!wordId || typeof wordId !== 'string') {
    return res.status(400).json({ error: 'wordId is required' });
  }

  try {
    console.log('[/api/debug-missing-players] Investigating missing players for wordId:', wordId);

    // Get all completed, winning game sessions for this word
    const { data: completedGames, error: gamesError } = await supabase
      .from('game_sessions')
      .select(`
        id,
        player_id,
        word_id,
        is_complete,
        is_won,
        start_time,
        end_time,
        guesses,
        guesses_used
      `)
      .eq('word_id', wordId)
      .eq('is_complete', true)
      .eq('is_won', true)
      .order('start_time', { ascending: true });

    console.log('[/api/debug-missing-players] Completed games query:', { 
      success: !gamesError, 
      count: completedGames?.length || 0,
      error: gamesError?.message 
    });

    // Get all scores for this word
    const { data: scores, error: scoresError } = await supabase
      .from('scores')
      .select(`
        id,
        player_id,
        word_id,
        completion_time_seconds,
        guesses_used,
        correct,
        score,
        submitted_at
      `)
      .eq('word_id', wordId)
      .eq('correct', true)
      .order('submitted_at', { ascending: true });

    console.log('[/api/debug-missing-players] Scores query:', { 
      success: !scoresError, 
      count: scores?.length || 0,
      error: scoresError?.message 
    });

    // Get all leaderboard entries for this word
    const { data: leaderboardEntries, error: leaderboardError } = await supabase
      .from('leaderboard_summary')
      .select(`
        id,
        player_id,
        word_id,
        rank,
        best_time,
        guesses_used,
        date
      `)
      .eq('word_id', wordId)
      .order('rank', { ascending: true });

    console.log('[/api/debug-missing-players] Leaderboard entries query:', { 
      success: !leaderboardError, 
      count: leaderboardEntries?.length || 0,
      error: leaderboardError?.message 
    });

    // Get player info for all involved players
    const allPlayerIds = Array.from(new Set([
      ...(completedGames?.map(g => g.player_id) || []),
      ...(scores?.map(s => s.player_id) || []),
      ...(leaderboardEntries?.map(l => l.player_id) || [])
    ]));

    const { data: players } = await supabase
      .from('players')
      .select('id, display_name, created_at')
      .in('id', allPlayerIds);

    // REMOVED: user_stats query - table was dropped
    const userStats: any[] = []; // Empty since table no longer exists

    // Create maps for easy lookup
    const playersMap = new Map(players?.map(p => [p.id, p]) || []);
    const userStatsMap = new Map(userStats?.map(u => [u.player_id, u]) || []);
    const scoresMap = new Map(scores?.map(s => [s.player_id, s]) || []);
    const leaderboardMap = new Map(leaderboardEntries?.map(l => [l.player_id, l]) || []);

    // Analyze each completed game to find missing entries
    const analysis = completedGames?.map(game => {
      const player = playersMap.get(game.player_id);
      const userStat = userStatsMap.get(game.player_id);
      const score = scoresMap.get(game.player_id);
      const leaderboardEntry = leaderboardMap.get(game.player_id);

      const completionTime = game.end_time && game.start_time 
        ? Math.floor((new Date(game.end_time).getTime() - new Date(game.start_time).getTime()) / 1000)
        : null;

      return {
        player_id: game.player_id,
        display_name: player?.display_name || `Player ${game.player_id.slice(-4)}`,
        game_completion: {
          session_id: game.id,
          start_time: game.start_time,
          end_time: game.end_time,
          completion_time_seconds: completionTime,
          guesses_used: game.guesses_used || (game.guesses ? game.guesses.length : 0),
          is_complete: game.is_complete,
          is_won: game.is_won
        },
        data_presence: {
          in_players: !!player,
          in_user_stats: false, // Table was dropped - always false
          in_scores: !!score,
          in_leaderboard: !!leaderboardEntry
        },
        potential_issues: {
          missing_user_stats: false, // Table intentionally removed
          missing_score: !score,
          missing_leaderboard: !leaderboardEntry,
          completion_time_mismatch: score && completionTime && Math.abs(score.completion_time_seconds - completionTime) > 2,
          guesses_mismatch: score && game.guesses_used && score.guesses_used !== game.guesses_used
        }
      };
    }) || [];

    // Find players specifically missing from leaderboard
    const missingFromLeaderboard = analysis.filter(a => 
      a.data_presence.in_players && 
      a.data_presence.in_scores && 
      !a.data_presence.in_leaderboard
    );

    // Find Matilda specifically
    const matildaAnalysis = analysis.find(a => 
      a.display_name.toLowerCase().includes('matilda') || 
      a.display_name.toLowerCase().includes('tilda')
    );

    // Summary statistics
    const summary = {
      total_completed_games: completedGames?.length || 0,
      total_scores: scores?.length || 0,
      total_leaderboard_entries: leaderboardEntries?.length || 0,
      players_missing_from_leaderboard: missingFromLeaderboard.length,
      data_flow_success_rate: completedGames?.length 
        ? ((leaderboardEntries?.length || 0) / completedGames.length * 100).toFixed(1) + '%'
        : '0%'
    };

    return res.status(200).json({
      summary,
      detailed_analysis: analysis,
      missing_from_leaderboard: missingFromLeaderboard,
      matilda_case: matildaAnalysis || null,
      raw_data: {
        completed_games: completedGames,
        scores: scores,
        leaderboard_entries: leaderboardEntries
      },
      investigation_notes: {
        common_issues: [
          'Database triggers not firing on game completion',
          'API leaderboard updates failing silently',
          'Foreign key constraint violations',
          'Note: user_stats table was intentionally dropped'
        ],
        recommended_fixes: [
          'Strengthen foreign key chain validation',
          'Add leaderboard entry validation after game completion',
          'Implement automatic repair for missing entries',
          'Add comprehensive trigger monitoring'
        ]
      }
    });

  } catch (err) {
    console.error('[/api/debug-missing-players] Error:', err);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: err instanceof Error ? err.message : 'Unknown error' 
    });
  }
} 