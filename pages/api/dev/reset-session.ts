// Vercel-native serverless API route for resetting a player's game session (dev only).
// Replaces the old Node backend `/api/dev/reset-session` route.
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
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not allowed in production' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    let body = '';
    await new Promise((resolve) => {
      req.on('data', chunk => { body += chunk; });
      req.on('end', resolve);
    });
    const { player_id, word } = JSON.parse(body);
    if (!player_id) {
      return res.status(400).json({ error: 'Missing player_id' });
    }
    // Delete existing sessions for this player
    const { error: delError } = await supabase
      .from('game_sessions')
      .delete()
      .eq('player_id', player_id);
    if (delError) {
      return res.status(500).json({ error: delError.message });
    }
    // Fetch word (by text if provided) or today's word
    let wordData;
    if (word) {
      const { data, error } = await supabase.from('words').select('*').eq('word', word).maybeSingle();
      if (error || !data) {
        return res.status(404).json({ error: error?.message || 'Word not found' });
      }
      wordData = data;
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase.from('words').select('*').eq('date', today).maybeSingle();
      if (error || !data) {
        return res.status(404).json({ error: error?.message || 'Word not found for today' });
      }
      wordData = data;
    }
    // Create fresh session
    const { error: insertError } = await supabase.from('game_sessions').insert({
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
    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }
    return res.status(200).json({ status: 'reset', word: wordData.word });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
} 