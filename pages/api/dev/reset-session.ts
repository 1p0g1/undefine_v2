// Vercel-native serverless API route for resetting a player's game session (dev only).
// Replaces the old Node backend `/api/dev/reset-session` route.
import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest } from 'next';
import type { ResetRequest, ResetResponse, ApiResponse } from 'types/api';

// Strict development-only check
if (process.env.NODE_ENV === 'production') {
  throw new Error('This route should not be built in production');
}

if (!process.env.SUPABASE_URL) {
  console.error('[api/dev/reset-session] Missing SUPABASE_URL environment variable');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[api/dev/reset-session] Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: ApiResponse<ResetResponse>
) {
  // Double-check environment, just in case
  if (process.env.NODE_ENV === 'production') {
    console.error('[api/dev/reset-session] Attempted to access dev route in production');
    return res.status(403).json({ error: 'Not allowed in production' });
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
      console.error('[api/dev/reset-session] Missing player_id in request');
      return res.status(400).json({ error: 'Missing player_id' });
    }

    console.log(`[api/dev/reset-session] Resetting session for player ${player_id}`);

    // Delete existing game session
    const { error: deleteError } = await supabase
      .from('game_sessions')
      .delete()
      .eq('player_id', player_id);

    if (deleteError) {
      console.error('[api/dev/reset-session] Failed to delete game session:', deleteError);
      return res.status(500).json({ error: 'Failed to delete game session' });
    }

    console.log(`[api/dev/reset-session] Successfully reset session for player ${player_id}`);
    return res.status(200).json({
      status: 'reset',
      word: word ?? 'unknown'
    });
  } catch (err) {
    console.error('[api/dev/reset-session] Unexpected error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
} 