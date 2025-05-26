import type { NextApiRequest, NextApiResponse } from 'next';

// Frontend domains that are allowed to access the API
const ALLOWED_ORIGINS = [
  'https://undefine-v2-front.vercel.app', // Production
  'http://localhost:3000', // Local development
];

export type ApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

/**
 * CORS middleware for API routes
 * Handles preflight requests and sets appropriate headers
 */
export function withCors(handler: ApiHandler): ApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Get origin from request headers
      const origin = req.headers.origin || '';
      
      // Check if origin is allowed
      const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin) || 
        origin.includes('-vercel.app') || // Allow all Vercel preview URLs
        origin.startsWith('http://localhost'); // Allow all localhost origins
      
      // Always set CORS headers for preflight requests
      if (req.method === 'OPTIONS') {
        if (isAllowedOrigin) {
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, POST');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Player-ID');
          res.setHeader('Access-Control-Allow-Credentials', 'true');
          res.status(200).end();
        } else {
          res.status(403).end();
        }
        return;
      }
      
      // Set CORS headers for actual requests
      if (isAllowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, POST');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Player-ID');
      } else {
        console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
        return res.status(403).json({ error: 'Origin not allowed' });
      }

      // Call the actual handler
      await handler(req, res);
    } catch (error: unknown) {
      console.error('[CORS Middleware] Handler error:', error);
      // Don't expose error details in production
      res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' 
          ? error instanceof Error ? error.message : String(error)
          : undefined
      });
    }
  };
} 