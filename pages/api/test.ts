import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Log environment state for debugging
  console.log('[api/test] Environment check:', {
    hasUrl: !!process.env.SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    urlPrefix: process.env.SUPABASE_URL?.substring(0, 20) + '...'
  });

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('[api/test] Attempting to query words table...');
    const { data, error } = await supabase.from('words').select('*').limit(1);
    
    if (error) {
      console.error('[api/test] Supabase query error:', error);
      return res.status(500).json({ error });
    }

    console.log('[api/test] Successfully queried words table');
    return res.status(200).json({ 
      success: true, 
      data,
      environment: {
        hasUrl: !!process.env.SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        nodeEnv: process.env.NODE_ENV
      }
    });
  } catch (err) {
    console.error('[api/test] Unexpected error:', err);
    return res.status(500).json({ 
      error: 'Unexpected error',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
} 