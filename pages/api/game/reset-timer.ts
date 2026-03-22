import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { withCors } from '@/lib/withCors';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default withCors(async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { gameId } = req.body;
  const playerId = (req.headers['player-id'] as string) ?? '';

  if (!gameId || !playerId) {
    return res.status(400).json({ error: 'Missing gameId or player-id header' });
  }

  const newStartTime = new Date().toISOString();

  const { error } = await supabase
    .from('game_sessions')
    .update({ start_time: newStartTime })
    .eq('id', gameId)
    .eq('player_id', playerId)
    .eq('is_complete', false);

  if (error) {
    console.error('[reset-timer] Failed:', error);
    return res.status(500).json({ error: 'Failed to reset timer' });
  }

  return res.status(200).json({ start_time: newStartTime });
});
