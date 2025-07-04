// Vercel-native serverless API route for fetching streak status from Supabase.
// Replaces the old Node backend `/api/streak-status` route.
import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { StreakResponse, ApiResponse } from 'types/api';
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

// Log environment validation success
console.log('[/api/streak-status] Environment validation passed:', {
  hasSupabaseUrl: !!env.SUPABASE_URL,
  hasServiceRoleKey: !!env.SUPABASE_SERVICE_ROLE_KEY,
  dbProvider: env.DB_PROVIDER,
  nodeEnv: env.NODE_ENV
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function handler(
  req: NextApiRequest,
  res: ApiResponse<StreakResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    let body = '';
    await new Promise<void>((resolve) => {
      req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
      req.on('end', () => resolve());
    });
    
    const { player_id } = JSON.parse(body) as { player_id?: string };
    if (!player_id) {
      return res.status(400).json({ error: 'Missing player_id' });
    }

    // CLEANUP PHASE 1: Use player_streaks instead of abandoned user_stats table
    const { data, error } = await supabase
      .from('player_streaks')
      .select('current_streak,highest_streak')
      .eq('player_id', player_id)
      .maybeSingle();

    if (error || !data) {
      return res.status(404).json({ error: error?.message || 'No streak data found' });
    }

    return res.status(200).json({
      currentStreak: data.current_streak ?? 0,
      longestStreak: data.highest_streak ?? 0  // Note: player_streaks uses 'highest_streak' not 'longest_streak'
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
}

// Export the handler wrapped with CORS middleware
export default withCors(handler); 