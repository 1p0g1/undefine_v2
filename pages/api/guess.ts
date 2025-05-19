// Vercel-native serverless API route for submitting a guess and updating game state in Supabase.
// Replaces the old Node backend `/api/guess` route.
import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest } from 'next';
import type { GuessRequest, GuessResponse, ApiResponse } from 'types/api';

if (!process.env.SUPABASE_URL) {
  console.error('[api/guess] Missing SUPABASE_URL environment variable');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[api/guess] Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: ApiResponse<GuessResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = '';
    await new Promise<void>((resolve) => {
      req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
      req.on('end', () => resolve());
    });
    
    const { gameId, guess, playerId } = JSON.parse(body) as GuessRequest;
    if (!gameId || !guess || !playerId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get the game session
    const { data: gameSession, error: gameError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !gameSession) {
      return res.status(404).json({ error: 'Game session not found' });
    }

    // Get the word
    const { data: word, error: wordError } = await supabase
      .from('words')
      .select('*')
      .eq('id', gameSession.word_id)
      .single();

    if (wordError || !word) {
      return res.status(404).json({ error: 'Word not found' });
    }

    const isCorrect = guess.toLowerCase() === word.word.toLowerCase();
    const isFuzzy = !isCorrect && guess.toLowerCase().includes(word.word.toLowerCase());
    const fuzzyPositions = isFuzzy ? Array.from({ length: word.word.length }, (_, i) => i) : [];

    // Update game session
    const updatedGuesses = [...(gameSession.guesses || []), guess];
    const isComplete = isCorrect || updatedGuesses.length >= 6;

    const { error: updateError } = await supabase
      .from('game_sessions')
      .update({
        guesses: updatedGuesses,
        is_complete: isComplete,
        completion_time_seconds: isComplete ? Math.floor((Date.now() - new Date(gameSession.start_time).getTime()) / 1000) : null
      })
      .eq('id', gameId);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update game session' });
    }

    // Get updated stats
    const { data: stats, error: statsError } = await supabase
      .from('user_stats')
      .select('games_played,games_won,current_streak,longest_streak')
      .eq('player_id', playerId)
      .single();

    if (statsError) {
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }

    return res.status(200).json({
      isCorrect,
      guess,
      isFuzzy,
      fuzzyPositions,
      gameOver: isComplete,
      revealedClues: [],
      usedHint: false,
      score: null,
      stats: {
        games_played: stats.games_played ?? 0,
        games_won: stats.games_won ?? 0,
        current_streak: stats.current_streak ?? 0,
        longest_streak: stats.longest_streak ?? 0
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
} 