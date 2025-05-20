import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * CORS middleware configuration
 * @param req Next.js API request
 * @param res Next.js API response
 */
export function cors(req: NextApiRequest, res: NextApiResponse) {
  // Allow requests from any origin in development
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Allow the methods we need
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  // Allow the headers we need
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
} 