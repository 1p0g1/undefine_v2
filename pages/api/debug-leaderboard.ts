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
    console.log('[/api/debug-leaderboard] Debugging leaderboard for wordId:', wordId);

    // Get current date for comparison
    const today = new Date().toISOString().split('T')[0];
    console.log('[/api/debug-leaderboard] Today\'s date:', today);

    // Get ALL leaderboard entries for this word (no date filter)
    const { data: allEntries, error: allError } = await supabase
      .from('leaderboard_summary')
      .select(`
        id,
        player_id,
        word_id,
        rank,
        best_time,
        guesses_used,
        was_top_10,
        date
      `)
      .eq('word_id', wordId)
      .order('rank', { ascending: true });

    console.log('[/api/debug-leaderboard] All entries query result:', { 
      success: !allError, 
      entryCount: allEntries?.length || 0,
      error: allError?.message 
    });

    // Get entries filtered by today's date (current API logic)
    const { data: todayEntries, error: todayError } = await supabase
      .from('leaderboard_summary')
      .select(`
        id,
        player_id,
        word_id,
        rank,
        best_time,
        guesses_used,
        was_top_10,
        date
      `)
      .eq('word_id', wordId)
      .eq('date', today)
      .order('rank', { ascending: true });

    console.log('[/api/debug-leaderboard] Today-filtered entries query result:', { 
      success: !todayError, 
      entryCount: todayEntries?.length || 0,
      error: todayError?.message 
    });

    // Get recent scores for comparison
    const { data: scoresData, error: scoresError } = await supabase
      .from('scores')
      .select(`
        id,
        player_id,
        word_id,
        score,
        completion_time_seconds,
        guesses_used,
        submitted_at,
        correct
      `)
      .eq('word_id', wordId)
      .eq('correct', true)
      .order('score', { ascending: false })
      .order('completion_time_seconds', { ascending: true });

    console.log('[/api/debug-leaderboard] Scores query result:', { 
      success: !scoresError, 
      entryCount: scoresData?.length || 0,
      error: scoresError?.message 
    });

    // Check for specific player a890
    const playerA890Entries = allEntries?.filter(entry => entry.player_id.includes('a890')) || [];
    const playerA890Scores = scoresData?.filter(score => score.player_id.includes('a890')) || [];

    console.log('[/api/debug-leaderboard] Player a890 analysis:', {
      leaderboardEntries: playerA890Entries.length,
      scoreEntries: playerA890Scores.length,
      leaderboardDates: playerA890Entries.map(e => e.date),
      scoreDates: playerA890Scores.map(s => s.submitted_at?.split('T')[0])
    });

    // Get player display names
    const playerIds = Array.from(new Set([
      ...(allEntries?.map(e => e.player_id) || []),
      ...(scoresData?.map(s => s.player_id) || [])
    ]));
    
    const { data: playersData } = await supabase
      .from('players')
      .select('id, display_name')
      .in('id', playerIds);

    const playerNames = new Map(playersData?.map(p => [p.id, p.display_name || `Player ${p.id.slice(-4)}`]) || []);

    return res.status(200).json({
      debug: {
        wordId,
        today,
        allEntriesCount: allEntries?.length || 0,
        todayEntriesCount: todayEntries?.length || 0,
        scoresCount: scoresData?.length || 0,
        playerA890Analysis: {
          leaderboardEntries: playerA890Entries.length,
          scoreEntries: playerA890Scores.length,
          leaderboardDates: playerA890Entries.map(e => e.date),
          scoreDates: playerA890Scores.map(s => s.submitted_at?.split('T')[0])
        }
      },
      allEntries: allEntries?.map(entry => ({
        ...entry,
        player_name: playerNames.get(entry.player_id) || `Player ${entry.player_id.slice(-4)}`
      })) || [],
      todayEntries: todayEntries?.map(entry => ({
        ...entry,
        player_name: playerNames.get(entry.player_id) || `Player ${entry.player_id.slice(-4)}`
      })) || [],
      scores: scoresData?.map(score => ({
        ...score,
        player_name: playerNames.get(score.player_id) || `Player ${score.player_id.slice(-4)}`,
        date: score.submitted_at?.split('T')[0]
      })) || []
    });

  } catch (err) {
    console.error('[/api/debug-leaderboard] Error:', err);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: err instanceof Error ? err.message : 'Unknown error' 
    });
  }
} 