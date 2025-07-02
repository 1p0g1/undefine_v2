import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if environment variables exist (without exposing sensitive values)
    const envStatus = {
      SUPABASE_URL: !!process.env.SUPABASE_URL ? 'SET' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
      DB_PROVIDER: process.env.DB_PROVIDER || 'MISSING',
      NODE_ENV: process.env.NODE_ENV || 'MISSING',
    };

    return res.status(200).json({
      message: 'Environment variable check',
      environment: envStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({ 
      error: 'Failed to check environment variables',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 