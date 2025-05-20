// Vercel-native serverless API route for fetching the word of the day from Supabase.
import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[api/word] Initializing Supabase client');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get today's date in YYYY-MM-DD format
    const now = new Date();
    const today = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    
    console.log('[api/word] Fetching word for date:', today);

    // Try to get today's word
    const { data: todayWord, error: todayWordError } = await supabase
      .from('words')
      .select('*')
      .eq('date', today)
      .single();
    
    console.log('[api/word] Today\'s word query result:', {
      hasWord: !!todayWord,
      error: todayWordError?.message,
      date: today
    });

    // If no word for today, get the most recent word
    if (todayWordError || !todayWord) {
      console.log('[api/word] No word for today, fetching most recent word');
      
      const { data: fallbackWord, error: fallbackError } = await supabase
        .from('words')
        .select('*')
        .order('date', { ascending: false })
        .limit(1)
        .single();
        
      if (fallbackError || !fallbackWord) {
        console.error('[api/word] Failed to fetch any word:', fallbackError);
        return res.status(404).json({ error: 'No words available' });
      }

      return res.status(200).json({
        word: fallbackWord,
        isFallback: true
      });
    }

    // Return today's word
    return res.status(200).json({
      word: todayWord,
      isFallback: false
    });

  } catch (err) {
    console.error('[api/word] Unexpected error:', err);
    return res.status(500).json({ 
      error: 'Unexpected error',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
} 