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
import { env } from '../../src/env.server';
import { mapWordRowToResponse } from '../../server/src/utils/wordMapper';
import { withCors } from '@/lib/withCors';
import { getNewWord } from '@/game/word';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Production frontend URL
const FRONTEND_URL = 'https://undefine-v2-front.vercel.app';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const word = await getNewWord();
    res.status(200).json(word);
  } catch (error) {
    console.error('[/api/word] Error:', error);
    res.status(500).json({ error: 'Failed to get word' });
  }
    }

// Export the handler wrapped with CORS middleware
export default withCors(handler); 