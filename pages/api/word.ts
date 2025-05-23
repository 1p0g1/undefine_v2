/**
 * @fileoverview
 * Next.js API route for fetching the word of the day from Supabase.
 * This file should only be used server-side in API routes.
 * 
 * @api {get} /api/word Get today's word
 * @apiSuccess {Object} response
 * @apiSuccess {Object} response.word The word object with clues
 * @apiSuccess {string} response.gameId Unique session identifier
 * @apiSuccess {boolean} response.isFallback Whether this is a fallback word
 * @apiError {Object} error Error response
 * @apiError {string} error.error Error message
 * @apiError {string} [error.details] Additional error details if available
 */

// Runtime check to prevent client-side usage
if (typeof window !== 'undefined') {
  throw new Error('[api/word] This file should only be used server-side.');
}

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest } from 'next';
import type { ApiResponse, ErrorResponse } from 'types/api';
import { WordResponse } from '../../shared-types/src/word';
import { env } from '../../src/env.server';
import { mapWordRowToResponse } from '../../server/src/utils/wordMapper';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(
  req: NextApiRequest,
  res: ApiResponse<WordResponse>
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, player-id, Player-Id, playerId, playerid');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[api/word] Initializing Supabase client');

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
        return res.status(404).json({ 
          error: 'No words available',
          details: fallbackError?.message
        });
      }

      return res.status(200).json({
        word: mapWordRowToResponse(fallbackWord),
        gameId: 'temp-session-' + new Date().getTime(),
        isFallback: true
      });
    }

    // Return today's word
    return res.status(200).json({
      word: mapWordRowToResponse(todayWord),
      gameId: 'temp-session-' + new Date().getTime(),
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