const { createClient } = require('@supabase/supabase-js');

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
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .limit(1);

    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error fetching word' });
    }

    return res.status(200).json({ word: data[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Unexpected error' });
  }
}

module.exports = handler;
