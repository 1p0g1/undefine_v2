import type { NextApiRequest, NextApiResponse } from 'next';
import { withCors } from '@/lib/withCors';

export default withCors(async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const playerId = (req.headers['player-id'] as string) ?? 'anonymous';
  
  res.status(200).json({
    method: req.method,
    playerId: playerId,
    allHeaders: req.headers,
    body: req.body,
    timestamp: new Date().toISOString()
  });
}); 