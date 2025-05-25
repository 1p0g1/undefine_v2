import type { NextApiRequest, NextApiResponse } from 'next';

// Frontend domains that are allowed to access the API
const ALLOWED_ORIGINS = [
  'https://undefine-v2-front.vercel.app',
  'https://undefine-v2-front-e9qvxwthw-paddys-projects-82cb6057.vercel.app', // Preview URL
  'http://localhost:3000', // Local development
];

export type ApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

/**
 * CORS middleware for API routes
 * Handles preflight requests and sets appropriate headers
 */
export function withCors(handler: ApiHandler): ApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Get origin from request headers
    const origin = req.headers.origin || '';
    
    // Always set CORS headers for preflight
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Player-ID');

    // Set origin if it's allowed
    if (ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (origin.includes('vercel.app')) {
      // Allow Vercel preview deployments
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    // Handle preflight request
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Call the actual handler
    try {
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