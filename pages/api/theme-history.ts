import { NextApiRequest, NextApiResponse } from 'next';
import { withCors } from '../../lib/withCors';
import { supabase } from '../../src/lib/supabase';

interface ThemeHistoryEntry {
  id: string;
  guess: string;
  isCorrect: boolean;
  attemptDate: string;
  wordsCompletedWhenGuessed: number;
  totalWordGuesses: number;
  similarityScore: number | null;
  confidencePercentage: number | null;
  matchingMethod: string | null;
  createdAt: string;
}

interface ThemeHistoryResponse {
  theme: string;
  totalAttempts: number;
  hasCorrectGuess: boolean;
  history: ThemeHistoryEntry[];
}

export default withCors(async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ThemeHistoryResponse | { error: string }>
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

    console.log('[/api/theme-history] Getting theme history for player:', { playerId, theme });

    // Get all theme attempts for this player and theme, ordered by most recent first
    const { data: attempts, error } = await supabase
      .from('theme_attempts')
      .select(`
        id,
        guess,
        is_correct,
        attempt_date,
        words_completed_when_guessed,
        total_word_guesses,
        similarity_score,
        confidence_percentage,
        matching_method,
        created_at
      `)
      .eq('player_id', playerId)
      .eq('theme', theme)
      .order('attempt_date', { ascending: false });

    if (error) {
      console.error('[/api/theme-history] Database error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // Transform data for response
    const history: ThemeHistoryEntry[] = (attempts || []).map(attempt => ({
      id: attempt.id,
      guess: attempt.guess,
      isCorrect: attempt.is_correct,
      attemptDate: attempt.attempt_date,
      wordsCompletedWhenGuessed: attempt.words_completed_when_guessed || 0,
      totalWordGuesses: attempt.total_word_guesses || 0,
      similarityScore: attempt.similarity_score,
      confidencePercentage: attempt.confidence_percentage,
      matchingMethod: attempt.matching_method,
      createdAt: attempt.created_at
    }));

    const hasCorrectGuess = history.some(entry => entry.isCorrect);

    const response: ThemeHistoryResponse = {
      theme,
      totalAttempts: history.length,
      hasCorrectGuess,
      history
    };

    console.log('[/api/theme-history] Returning history:', {
      theme,
      totalAttempts: response.totalAttempts,
      hasCorrectGuess: response.hasCorrectGuess,
      historyCount: history.length
    });

    res.status(200).json(response);
  } catch (error) {
    console.error('[/api/theme-history] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
