import type { NextApiRequest, NextApiResponse } from 'next';

type Handler = (req: NextApiRequest, res: NextApiResponse) => void | Promise<void>;

export function withCors(handler: Handler): Handler {
  return async (req, res) => {
    const origin = req.headers.origin || '';

    // Debug logging
    console.log('[withCors] Received Origin:', origin);

    // Temporarily simplified origin check
    const isAllowedOrigin = origin?.endsWith('.vercel.app') || origin === 'https://undefine-v2-front.vercel.app';
    
    // More debug logging
    console.log('[withCors] Allowed:', isAllowedOrigin);

    if (!isAllowedOrigin) {
      console.log('[withCors] Rejected origin:', origin);
      return res.status(403).json({ error: "Origin not allowed" });
    }

    // Set CORS headers for allowed origins
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Player-ID');

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    // Process the actual request
    return handler(req, res);
  };
} 