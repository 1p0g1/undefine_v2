// Vercel-native serverless API route for fetching streak status from Supabase.
// Replaces the old Node backend `/api/streak-status` route.
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
    const { player_id } = JSON.parse(body);
    if (!player_id) {
      return res.status(400).json({ error: 'Missing player_id' });
    }
    const { data, error } = await supabase
      .from('user_stats')
      .select('current_streak,longest_streak')
      .eq('player_id', player_id)
      .maybeSingle();
    if (error || !data) {
      return res.status(404).json({ error: error?.message || 'No stats found' });
    }
    return res.status(200).json({
      currentStreak: data.current_streak || 0,
      longestStreak: data.longest_streak || 0
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
} 