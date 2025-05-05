import express from 'express';
import { supabase } from '../config/SupabaseClient.js';
import { getWordByText, getWordOfTheDay } from '../repositories/wordRepository.js';
import { ensurePlayerStatsExists } from '../repositories/userStatsRepository.js';

const router = express.Router();

router.post('/reset-session', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not allowed in production' });
  }
  const { player_id, word } = req.body;
  if (!player_id) return res.status(400).json({ error: 'player_id is required' });

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase client not initialised' });
  }

  await ensurePlayerStatsExists(player_id);

  // Delete existing sessions for this player
  await supabase.from('game_sessions').delete().eq('player_id', player_id);

  // Fetch word (by text if provided) or today's word
  const wordData = word ? await getWordByText(word) : await getWordOfTheDay();

  if (!wordData) return res.status(404).json({ error: 'Word not found' });

  // Create fresh session
  const insert = await supabase.from('game_sessions').insert({
    player_id,
    word: wordData.word,
    start_time: new Date().toISOString(),
    guesses: [],
    revealed_clues: [],
    clue_status: {},
    is_complete: false,
    is_won: false,
    created_at: new Date().toISOString(),
    end_time: null,
  });

  if (insert.error) {
    return res.status(500).json({ error: insert.error.message });
  }

  return res.json({ status: 'reset', word: wordData.word });
});

export default router;
