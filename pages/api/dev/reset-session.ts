// Vercel-native serverless API route for resetting a player's game session (dev only).
// Replaces the old Node backend `/api/dev/reset-session` route.
import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest } from 'next';
import type { ResetRequest, ResetResponse, ApiResponse } from 'types/api';
import { env } from '../../../src/env.server';
import { withCors } from '@/lib/withCors';

// Strict development-only check
if (env.NODE_ENV === 'production') {
  throw new Error('This route should not be built in production');
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function handler(
  req: NextApiRequest,
  res: ApiResponse<ResetResponse>
): Promise<void> {
  // Double-check environment, just in case
  if (env.NODE_ENV === 'production') {
    console.error('[api/dev/reset-session] Attempted to access dev route in production');
    res.status(403).json({ error: 'Not allowed in production' });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
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
      res.status(400).json({ error: 'Missing player_id' });
      return;
    }

    console.log(`[api/dev/reset-session] Resetting session for player ${player_id}`);

    // Delete existing game session
    const { error: deleteError } = await supabase
      .from('game_sessions')
      .delete()
      .eq('player_id', player_id);

    if (deleteError) {
      console.error('[api/dev/reset-session] Failed to delete game session:', deleteError);
      res.status(500).json({ error: 'Failed to delete game session' });
      return;
    }

    console.log(`[api/dev/reset-session] Successfully reset session for player ${player_id}`);
    res.status(200).json({
      status: 'reset',
      word: word ?? 'unknown'
    });
    return;
  } catch (err) {
    console.error('[api/dev/reset-session] Unexpected error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    return;
  }
}

// Export the handler wrapped with CORS middleware
export default withCors(handler); 