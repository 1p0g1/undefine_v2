import { NextApiRequest, NextApiResponse } from 'next';
import { withCors } from '@/lib/withCors';
import { supabase } from '../../src/lib/supabase';
import { getThemeWeekBoundaries } from '../../src/game/theme';

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
    let theme = req.query.theme as string | undefined;
    const date = req.query.date as string | undefined;
    
    if (!playerId) {
      return res.status(400).json({ error: 'Missing player_id' });
    }

    // Resolve theme from date if theme not provided directly
    if (!theme && date) {
      const contextDate = new Date(date);
      const { monday, sunday } = getThemeWeekBoundaries(contextDate);

      const { data: wordRow } = await supabase
        .from('words')
        .select('theme')
        .gte('date', monday.toISOString().split('T')[0])
        .lte('date', sunday.toISOString().split('T')[0])
        .not('theme', 'is', null)
        .limit(1)
        .single();

      if (wordRow?.theme) {
        theme = wordRow.theme;
      }
    }

    if (!theme) {
      return res.status(400).json({ error: 'Missing theme or date parameter' });
    }

    console.log('[/api/theme-history-simple] Getting simple theme history for player:', { playerId, theme });

    const { data: attempts, error } = await supabase
      .from('theme_attempts')
      .select('guess, confidence_percentage')
      .eq('player_id', playerId)
      .eq('theme', theme)
      .order('attempt_date', { ascending: true });

    if (error) {
      console.error('[/api/theme-history-simple] Database error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

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
