// Vercel-native serverless API route for fetching a random word from Supabase.
// Replaces the old Node backend `/api/word` route.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse & { status: (code: number) => any, json: (body: any) => void }} res
 */
export default async function handler(req, res) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Supabase environment variables are not set' });
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  try {
    const { data, error } = await supabase
      .from('words')
      .select('word,definition,equivalents,first_letter,in_a_sentence,number_of_letters,etymology')
      .order('random()')
      .limit(1)
      .single();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || 'No word found' });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
} 