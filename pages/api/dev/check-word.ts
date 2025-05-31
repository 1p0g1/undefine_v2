import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/src/env.server';
import { withCors } from '@/lib/withCors';

// Validate critical environment variables
if (!env.SUPABASE_URL) {
  console.error('❌ Missing SUPABASE_URL in env');
  throw new Error('Missing SUPABASE_URL');
}
if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in env');
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
}
if (!env.DB_PROVIDER) {
  console.error('❌ Missing DB_PROVIDER in env');
  throw new Error('Missing DB_PROVIDER');
}

// Log environment validation success (only in development)
if (env.NODE_ENV === 'development') {
  console.log('[/api/dev/check-word] Environment validation passed:', {
    hasSupabaseUrl: !!env.SUPABASE_URL,
    hasServiceRoleKey: !!env.SUPABASE_SERVICE_ROLE_KEY,
    dbProvider: env.DB_PROVIDER,
    nodeEnv: env.NODE_ENV
  });
}

// Initialize Supabase client with validated env variables
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  // Only allow in development
  if (env.NODE_ENV === 'production') {
    res.status(404).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }

  try {
    // Get today's date in YYYY-MM-DD format
    const now = new Date();
    const today = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    
    // Check for word configured for today
    const { data: todayWord, error: wordError } = await supabase
      .from('words')
      .select('id, date')
      .eq('date', today)
      .single();

    if (wordError) {
      res.status(500).json({
        error: 'Database error',
        details: wordError.message,
        date: today
      });
      return;
    }

    res.status(200).json({
      hasWord: !!todayWord,
      date: today,
      wordId: todayWord?.id || null
    });
    return;

  } catch (error) {
    console.error('Error in /api/dev/check-word:', error);
    res.status(500).json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
}

// Export the handler wrapped with CORS middleware
export default withCors(handler); 