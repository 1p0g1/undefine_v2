// NOTE: CORS is temporarily set to `*` during preview deployment testing.
// TODO: Replace with origin-specific CORS once stable frontend/backend domains are set (e.g. api.undefine.vercel.app).
// TODO: Add rate limiting and additional security measures before production.

import type { NextApiRequest, NextApiResponse } from 'next';

type Handler = (req: NextApiRequest, res: NextApiResponse) => void | Promise<void>;

export function withCors(handler: Handler): Handler {
  return async (req, res) => {
    // TEMPORARY: Allow all origins for dev/testing
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Player-ID, Authorization');

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    // Process the actual request
    return handler(req, res);
  };
} 