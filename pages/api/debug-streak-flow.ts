import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { player_id } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ error: 'Missing player_id' });
    }

    console.log('[DEBUG] Debugging streak flow for player:', player_id);

    // Step 1: Check if player exists in player_streaks
    const { data: streakData, error: streakError } = await supabase
      .from('player_streaks')
      .select('*')
      .eq('player_id', player_id)
      .maybeSingle();

    // Step 2: Check recent leaderboard entries for this player
    const { data: recentGames, error: gamesError } = await supabase
      .from('leaderboard_summary')
      .select('date, rank, player_id')
      .eq('player_id', player_id)
      .order('date', { ascending: false })
      .limit(5);

    // Step 3: Check if player exists in players table
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .select('id, display_name')
      .eq('id', player_id)
      .maybeSingle();

    // Step 4: Calculate what the UI would show
    let uiWouldShow = 0;
    let uiReasoning = 'No streak data';
    
    if (streakData) {
      const streak = streakData.current_streak || 0;
      if (streak === 0) {
        uiWouldShow = 0;
        uiReasoning = 'Database current_streak is 0';
      } else if (!streakData.last_win_date) {
        uiWouldShow = 0;
        uiReasoning = 'No last_win_date';
      } else {
        const lastWin = new Date(streakData.last_win_date);
        const today = new Date();
        const daysDiff = Math.floor((today.getTime() - lastWin.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= 1) {
          uiWouldShow = streak;
          uiReasoning = `Active streak: won ${daysDiff} days ago`;
        } else {
          uiWouldShow = 0; // OLD LOGIC
          uiReasoning = `Dormant streak: won ${daysDiff} days ago (too old)`;
        }
      }
    }

    return res.status(200).json({
      success: true,
      player_id,
      today: new Date().toISOString().split('T')[0],
      
      // Player existence
      playerExists: !!playerData,
      playerName: playerData?.display_name || null,
      
      // Streak data from database
      streakData: streakData || null,
      streakError: streakError?.message || null,
      
      // Recent game activity
      recentGames: recentGames || [],
      gamesError: gamesError?.message || null,
      
      // UI calculation
      uiAnalysis: {
        wouldShowOldLogic: uiWouldShow,
        wouldShowNewLogic: streakData?.current_streak || 0,
        reasoning: uiReasoning
      },
      
      // Debugging info
      debug: {
        hasStreakRecord: !!streakData,
        currentStreak: streakData?.current_streak || 0,
        highestStreak: streakData?.highest_streak || 0,
        lastWinDate: streakData?.last_win_date || null,
        recentGameCount: recentGames?.length || 0
      }
    });

  } catch (error) {
    console.error('[DEBUG] Error in debug flow:', error);
    return res.status(500).json({ error: 'Internal server error', details: error });
  }
} 