import type { NextApiRequest, NextApiResponse } from 'next';
import { withCors } from '@/lib/withCors';

export default withCors(async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const playerId = (req.headers['player-id'] as string) ?? 'anonymous';
  
  // Log the request for debugging
  console.log('[DEBUG HEADERS]', {
    method: req.method,
    playerId: playerId,
    url: req.url,
    body: req.body,
    headers: {
      'player-id': req.headers['player-id'],
      'content-type': req.headers['content-type'],
      'origin': req.headers['origin'],
      'referer': req.headers['referer']
    },
    timestamp: new Date().toISOString()
  });
  
  res.status(200).json({
    method: req.method,
    playerId: playerId,
    receivedHeaders: {
      'player-id': req.headers['player-id'],
      'content-type': req.headers['content-type'],
      'origin': req.headers['origin'],
      'referer': req.headers['referer']
    },
    body: req.body,
    timestamp: new Date().toISOString(),
    message: 'Debug data logged to server console'
  });
}); 