// Vercel-native serverless API route for resetting a player's game session (dev only).
// Replaces the old Node backend `/api/dev/reset-session` route.
import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest } from 'next';
import type { ResetRequest, ResetResponse, ApiResponse } from 'types/api';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: ApiResponse<ResetResponse>
) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = '';
    await new Promise<void>((resolve) => {
      req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
      req.on('end', () => resolve());
    });
    
    const { player_id, word } = JSON.parse(body) as ResetRequest;
    if (!player_id) {
      return res.status(400).json({ error: 'Missing player_id' });
    }

    // Delete any existing game sessions for this player
    const { error } = await supabase
      .from('game_sessions')
      .delete()
      .eq('player_id', player_id);

    if (error) {
      console.error('Error deleting sessions:', error);
      return res.status(500).json({ error: 'Failed to reset sessions' });
    }

    return res.status(200).json({
      status: 'Game sessions reset',
      word: word || 'random'
    });
  } catch (err) {
    console.error('Reset error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
} 