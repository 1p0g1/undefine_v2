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
import type { NextApiRequest, NextApiResponse } from 'next';
import type { ApiResponse, ErrorResponse } from 'types/api';
import { WordResponse } from '../../shared-types/src/word';
import { env } from '@/src/env.server';
import { mapWordRowToResponse } from '@/server/src/utils/wordMapper';
import { withCors } from '@/lib/withCors';
import { getNewWord } from '../../src/game/word';
import { createDefaultClueStatus } from '@/shared-types/src/clues';
import { ensurePlayerExists } from '@/src/utils/player';

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
console.log('[/api/word] Environment validation passed:', {
  hasSupabaseUrl: !!env.SUPABASE_URL,
  hasServiceRoleKey: !!env.SUPABASE_SERVICE_ROLE_KEY,
  dbProvider: env.DB_PROVIDER,
  nodeEnv: env.NODE_ENV
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Production frontend URL
const FRONTEND_URL = 'https://undefine-v2-front.vercel.app';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get player ID from header with fallback
    const playerId = (req.headers['player-id'] as string) ?? 'anonymous';
    console.log('[/api/word] Using player ID:', playerId);

    // Ensure player exists in database
    try {
      await ensurePlayerExists(playerId);
    } catch (error) {
      console.error('[/api/word] Failed to ensure player exists:', error);
      // Continue anyway - we'll handle this gracefully
    }

    // Get today's word
    const word = await getNewWord();
    if (!word?.word?.id) {
      console.error('[/api/word] Invalid word response:', word);
      return res.status(500).json({ error: 'Failed to get valid word' });
    }

    // Check if player already has an active session for this word (prevent duplicates on refresh)
    const { data: existingSession, error: existingError } = await supabase
      .from('game_sessions')
      .select('id, start_time, is_complete')
      .eq('player_id', playerId)
      .eq('word_id', word.word.id)
      .eq('is_complete', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error('[/api/word] Error checking existing session:', existingError);
      // Continue to create new session if check fails
    }

    if (existingSession) {
      console.log('[/api/word] Found existing active session, returning it:', existingSession.id);
      return res.status(200).json({
        gameId: existingSession.id,
        word: word.word,
        start_time: existingSession.start_time,
        isFallback: word.isFallback
      });
    }

    // Create a new game session
    console.log('[/api/word] Creating game session:', { wordId: word.word.id, playerId });
    const start_time = new Date().toISOString();
    const clue_status = createDefaultClueStatus();
    
    console.log('[/api/word] Initializing game session with:', {
      playerId,
      wordId: word.word.id,
      start_time,
      clue_status
    });

    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .insert({
        player_id: playerId,
        word_id: word.word.id,
        guesses: [],
        revealed_clues: [],
        clue_status,
        is_complete: false,
        is_won: false,
        start_time
      })
      .select('id, start_time')
      .single();

    if (sessionError) {
      console.error('[/api/word] Failed to create game session:', {
        error: sessionError,
        details: sessionError.details,
        hint: sessionError.hint,
        code: sessionError.code
      });
      return res.status(500).json({ 
        error: 'Failed to create game session',
        details: sessionError.message
      });
    }

    // Return word data with session ID and start_time
    res.status(200).json({
      ...word,
      gameId: session.id,
      start_time: session.start_time
    });
  } catch (error) {
    console.error('[/api/word] Error:', error);
    res.status(500).json({ error: 'Failed to get word' });
  }
}

// Export the handler wrapped with CORS middleware
export default withCors(handler); 