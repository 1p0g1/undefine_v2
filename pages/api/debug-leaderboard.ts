import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../src/lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log('[Debug] Starting leaderboard debug...');
    
    // Test 1: Simple count
    const { data: countData, error: countError } = await supabase
      .from('leaderboard_summary')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('[Debug] Count error:', countError);
      return res.status(500).json({ 
        success: false, 
        error: 'Count failed', 
        details: countError 
      });
    }

    console.log('[Debug] Count successful, records:', countData);

    // Test 2: Simple select
    const { data: selectData, error: selectError } = await supabase
      .from('leaderboard_summary')
      .select('player_id, rank, date')
      .limit(5);

    if (selectError) {
      console.error('[Debug] Select error:', selectError);
      return res.status(500).json({ 
        success: false, 
        error: 'Select failed', 
        details: selectError 
      });
    }

    console.log('[Debug] Select successful, sample data:', selectData);

    // Test 3: Join test
    const { data: joinData, error: joinError } = await supabase
      .from('leaderboard_summary')
      .select(`
        player_id,
        rank,
        players!inner(display_name)
      `)
      .limit(3);

    if (joinError) {
      console.error('[Debug] Join error:', joinError);
      return res.status(500).json({ 
        success: false, 
        error: 'Join failed', 
        details: joinError 
      });
    }

    console.log('[Debug] Join successful, joined data:', joinData);

    // Test 4: Streaks test
    const { data: streakData, error: streakError } = await supabase
      .from('player_streaks')
      .select('player_id, highest_streak')
      .limit(3);

    if (streakError) {
      console.error('[Debug] Streak error:', streakError);
      return res.status(500).json({ 
        success: false, 
        error: 'Streak failed', 
        details: streakError 
      });
    }

    console.log('[Debug] Streak successful, streak data:', streakData);

    return res.status(200).json({
      success: true,
      debug: {
        leaderboard_count: countData,
        sample_records: selectData,
        join_test: joinData,
        streak_test: streakData,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[Debug] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
} 