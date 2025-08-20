import { NextApiRequest, NextApiResponse } from 'next';
import { withCors } from '../../lib/withCors';
import { supabase } from '../../src/lib/supabase';

interface SimpleThemeHistoryEntry {
  guess: string;
  confidencePercentage: number | null;
}

interface SimpleThemeHistoryResponse {
  theme: string;
  guesses: SimpleThemeHistoryEntry[];
}

export default withCors(async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SimpleThemeHistoryResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const playerId = (req.headers['player-id'] as string) ?? req.query.player_id as string;
    const theme = req.query.theme as string;
    
    if (!playerId) {
      return res.status(400).json({ error: 'Missing player_id' });
    }

    if (!theme) {
      return res.status(400).json({ error: 'Missing theme parameter' });
    }

    console.log('[/api/theme-history-simple] Getting simple theme history for player:', { playerId, theme });

    // Get all theme attempts for this player and theme, ordered by attempt date
    const { data: attempts, error } = await supabase
      .from('theme_attempts')
      .select('guess, confidence_percentage')
      .eq('player_id', playerId)
      .eq('theme', theme)
      .order('attempt_date', { ascending: true }); // Chronological order

    if (error) {
      console.error('[/api/theme-history-simple] Database error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // Transform data for simple display
    const guesses: SimpleThemeHistoryEntry[] = (attempts || []).map(attempt => ({
      guess: attempt.guess,
      confidencePercentage: attempt.confidence_percentage
    }));

    const response: SimpleThemeHistoryResponse = {
      theme,
      guesses
    };

    console.log('[/api/theme-history-simple] Returning simple history:', {
      theme,
      guessCount: guesses.length
    });

    res.status(200).json(response);
  } catch (error) {
    console.error('[/api/theme-history-simple] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
