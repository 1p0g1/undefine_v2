const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * @param req
 * @param res
 */
async function handler(req: any, res: any) {
  try {
    // Fetch the daily word
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .limit(1);

    if (error || !data || !data[0]) {
      console.error(error || 'No word found');
      return res.status(500).json({ error: 'Error fetching word' });
    }

    const word = data[0];
    // Insert a new game session
    const gameId = uuidv4();
    const { error: insertError } = await supabase
      .from('game_sessions')
      .insert([
        {
          id: gameId,
          word_id: word.id,
          start_time: new Date().toISOString(),
        },
      ]);
    if (insertError) {
      console.error("Supabase insert error:", insertError.message);
      return res.status(500).json({ error: `Error creating game session: ${insertError.message}` });
    }

    return res.status(200).json({ word, gameId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Unexpected error' });
  }
}

module.exports = handler;
