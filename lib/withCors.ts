import type { NextApiRequest, NextApiResponse } from 'next';

type Handler = (req: NextApiRequest, res: NextApiResponse) => void | Promise<void>;

export function withCors(handler: Handler): Handler {
  return async (req, res) => {
    const origin = req.headers.origin || '';

    const allowedOrigins = [
      'https://undefine-v2-front.vercel.app', // production frontend
    ];

    const isAllowedOrigin =
      allowedOrigins.includes(origin) ||
      /^https:\/\/undefine-v2-front-[a-z0-9]+-paddys-projects-82cb6057\.vercel\.app$/.test(origin); // matches preview deploys

    if (isAllowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Player-ID');

    // Debug logging
    console.log('[CORS]', { origin, isAllowedOrigin });

    // CORS preflight response
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    return handler(req, res);
  };
} 