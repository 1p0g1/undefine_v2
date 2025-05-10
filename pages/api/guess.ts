// Vercel-native serverless API route for submitting a guess and updating game state in Supabase.
// Replaces the old Node backend `/api/guess` route.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse & { status: (code: number) => any, json: (body: any) => void }} res
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    let body = '';
    await new Promise((resolve) => {
      req.on('data', chunk => { body += chunk; });
      req.on('end', resolve);
    });
    const { player_id, guess } = JSON.parse(body);
    if (!player_id || !guess) {
      return res.status(400).json({ error: 'Missing player_id or guess' });
    }

    // Fetch today's word
    const today = new Date().toISOString().slice(0, 10);
    const { data: wordData, error: wordError } = await supabase
      .from('words')
      .select('word')
      .eq('date', today)
      .maybeSingle();
    if (wordError || !wordData) {
      return res.status(500).json({ error: wordError?.message || 'No word found for today' });
    }
    const correctWord = wordData.word.trim().toLowerCase();
    const userGuess = guess.trim().toLowerCase();
    const isCorrect = userGuess === correctWord;

    // Update scores table
    const { error: scoreError } = await supabase.from('scores').insert({
      player_id,
      word: correctWord,
      guesses_used: 1, // For simplicity; adjust if tracking multiple guesses
      was_correct: isCorrect,
      completion_time_seconds: 0, // Placeholder; add timing if needed
      submitted_at: new Date().toISOString(),
    });
    if (scoreError) {
      return res.status(500).json({ error: scoreError.message });
    }

    // Update user_stats (increment games_played, games_won, streaks, etc.)
    // Fetch current stats
    const { data: stats, error: statsError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('player_id', player_id)
      .maybeSingle();
    if (statsError) {
      return res.status(500).json({ error: statsError.message });
    }
    let updates = { games_played: 1, games_won: 0, current_streak: 0, longest_streak: 0 };
    if (stats) {
      updates.games_played = (stats.games_played || 0) + 1;
      if (isCorrect) {
        updates.games_won = (stats.games_won || 0) + 1;
        updates.current_streak = (stats.current_streak || 0) + 1;
        updates.longest_streak = Math.max(updates.current_streak, stats.longest_streak || 0);
      } else {
        updates.current_streak = 0;
        updates.longest_streak = stats.longest_streak || 0;
        updates.games_won = stats.games_won || 0;
      }
    } else if (isCorrect) {
      updates.games_won = 1;
      updates.current_streak = 1;
      updates.longest_streak = 1;
    }
    const { error: updateStatsError } = await supabase
      .from('user_stats')
      .upsert({ player_id, ...updates }, { onConflict: 'player_id' });
    if (updateStatsError) {
      return res.status(500).json({ error: updateStatsError.message });
    }

    return res.status(200).json({
      isCorrect,
      guess,
      correctWord,
      stats: updates,
      message: isCorrect ? 'Correct!' : 'Incorrect',
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
} 