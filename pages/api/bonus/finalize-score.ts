/**
 * Bonus Round API: POST /api/bonus/finalize-score
 * 
 * Called when the bonus round completes to calculate and store the total bonus score.
 * Updates the scores table with bonus_score which is added to the final score.
 * 
 * Scoring:
 * - Gold (≤10 distance): 100 points
 * - Silver (≤20 distance): 50 points
 * - Bronze (≤30 distance): 25 points
 * - Miss (>30): 0 points
 */

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/src/env.server';
import { withCors } from '@/lib/withCors';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Points per tier
const TIER_POINTS: Record<string, number> = {
  perfect: 100,
  good: 50,
  average: 25,
  miss: 0
};

interface FinalizeScoreRequest {
  gameSessionId: string;
  playerId: string;
  wordId: string;
}

interface FinalizeScoreResponse {
  success: boolean;
  bonusScore?: number;
  newTotalScore?: number;
  goldCount?: number;
  silverCount?: number;
  bronzeCount?: number;
  error?: string;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FinalizeScoreResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { gameSessionId, playerId, wordId } = req.body as FinalizeScoreRequest;

  if (!gameSessionId || !playerId || !wordId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: gameSessionId, playerId, wordId' 
    });
  }

  try {
    // Get all bonus round guesses for this session
    const { data: bonusGuesses, error: fetchError } = await supabase
      .from('bonus_round_guesses')
      .select('tier')
      .eq('game_session_id', gameSessionId)
      .eq('player_id', playerId);

    if (fetchError) {
      console.error('[finalize-score] Error fetching bonus guesses:', fetchError);
      return res.status(500).json({ success: false, error: 'Failed to fetch bonus guesses' });
    }

    // Calculate total bonus score
    let bonusScore = 0;
    let goldCount = 0;
    let silverCount = 0;
    let bronzeCount = 0;

    for (const guess of bonusGuesses || []) {
      const tier = guess.tier || 'miss';
      bonusScore += TIER_POINTS[tier] || 0;
      
      if (tier === 'perfect') goldCount++;
      else if (tier === 'good') silverCount++;
      else if (tier === 'average') bronzeCount++;
    }

    console.log(`[finalize-score] Calculated bonus score: ${bonusScore} (${goldCount}🥇, ${silverCount}🥈, ${bronzeCount}🥉)`);

    // Get current score for this game
    const { data: existingScore, error: scoreError } = await supabase
      .from('scores')
      .select('id, score, bonus_score')
      .eq('game_session_id', gameSessionId)
      .eq('player_id', playerId)
      .single();

    if (scoreError && scoreError.code !== 'PGRST116') {
      console.error('[finalize-score] Error fetching score:', scoreError);
      return res.status(500).json({ success: false, error: 'Failed to fetch score' });
    }

    let newTotalScore: number | undefined;

    if (existingScore) {
      // Update existing score with bonus
      const baseScore = (existingScore.score || 0) - (existingScore.bonus_score || 0);
      newTotalScore = baseScore + bonusScore;

      const { error: updateError } = await supabase
        .from('scores')
        .update({ 
          bonus_score: bonusScore,
          score: newTotalScore
        })
        .eq('id', existingScore.id);

      if (updateError) {
        console.error('[finalize-score] Error updating score:', updateError);
        return res.status(500).json({ success: false, error: 'Failed to update score' });
      }

      console.log(`[finalize-score] Updated score: ${existingScore.score} -> ${newTotalScore} (bonus: ${bonusScore})`);
    } else {
      // No existing score record - this shouldn't happen normally
      // but we can create one if needed
      console.warn('[finalize-score] No existing score found for session:', gameSessionId);
    }

    return res.status(200).json({
      success: true,
      bonusScore,
      newTotalScore,
      goldCount,
      silverCount,
      bronzeCount
    });

  } catch (error) {
    console.error('[finalize-score] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}

export default withCors(handler);

