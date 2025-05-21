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
    const completionTimeSeconds = isComplete ? Math.floor((Date.now() - new Date(gameSession.start_time).getTime()) / 1000) : null;

    const { error: updateError } = await supabase
      .from('game_sessions')
      .update({
        guesses: updatedGuesses,
        is_complete: isComplete,
        is_won: isCorrect,
        completion_time_seconds: completionTimeSeconds
      })
      .eq('id', gameId);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update game session' });
    }

    // Get current stats
    const { data: stats, error: statsError } = await supabase
      .from('user_stats')
      .select('games_played,games_won,current_streak,longest_streak,total_guesses,average_guesses_per_game,total_play_time_seconds')
      .eq('player_id', playerId)
      .single();

    if (statsError) {
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }

    // Update stats if game is complete
    if (isComplete) {
      const newStats = {
        games_played: (stats.games_played || 0) + 1,
        games_won: isCorrect ? (stats.games_won || 0) + 1 : (stats.games_won || 0),
        current_streak: isCorrect ? (stats.current_streak || 0) + 1 : 0,
        longest_streak: isCorrect ? Math.max(stats.longest_streak || 0, (stats.current_streak || 0) + 1) : (stats.longest_streak || 0),
        total_guesses: (stats.total_guesses || 0) + updatedGuesses.length,
        average_guesses_per_game: ((stats.total_guesses || 0) + updatedGuesses.length) / ((stats.games_played || 0) + 1),
        total_play_time_seconds: (stats.total_play_time_seconds || 0) + (completionTimeSeconds || 0),
        last_played_word: word.word,
        updated_at: new Date().toISOString()
      };

      const { error: statsUpdateError } = await supabase
        .from('user_stats')
        .update(newStats)
        .eq('player_id', playerId);

      if (statsUpdateError) {
        console.error('[api/guess] Failed to update user stats:', statsUpdateError);
        return res.status(500).json({ error: 'Failed to update user stats' });
    }

      // Also create a score entry
      const { error: scoreError } = await supabase
        .from('scores')
        .insert([{
          player_id: playerId,
          word_id: word.id,
          guesses_used: updatedGuesses.length,
          completion_time_seconds: completionTimeSeconds,
          was_correct: isCorrect,
          submitted_at: new Date().toISOString()
        }]);

      if (scoreError) {
        console.error('[api/guess] Failed to create score entry:', scoreError);
        // Don't fail the request, just log the error
      }

      // Return updated stats
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
          games_played: newStats.games_played,
          games_won: newStats.games_won,
          current_streak: newStats.current_streak,
          longest_streak: newStats.longest_streak
        }
      });
    }

    // Return current stats if game is not complete
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