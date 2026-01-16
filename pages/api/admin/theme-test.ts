/**
 * Admin Theme Test API
 * 
 * Allows admins to test theme similarity scoring without creating actual theme attempts.
 * Useful for debugging and refining theme design.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { isThemeGuessCorrect } from '../../../src/game/theme';
import { requireAdminKey } from '../../../src/middleware/admin';

interface ThemeTestRequest {
  theme: string;
  guess: string;
}

interface ThemeTestResponse {
  similarity: number;
  isMatch: boolean;
  method: string;
  confidence: number;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ThemeTestResponse | { error: string; details?: string }>
) {
  // Admin authentication
  const authResult = requireAdminKey(req);
  if (!authResult.authorized) {
    return res.status(401).json({ 
      error: authResult.error || 'Unauthorized',
      details: 'Admin authentication required' 
    });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { theme, guess }: ThemeTestRequest = req.body;

    // Validate inputs
    if (!theme || !guess) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'Both "theme" and "guess" are required' 
      });
    }

    if (typeof theme !== 'string' || typeof guess !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid input types',
        details: 'Both "theme" and "guess" must be strings' 
      });
    }

    if (theme.trim().length === 0 || guess.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Empty inputs',
        details: 'Both "theme" and "guess" must be non-empty' 
      });
    }

    console.log('[/api/admin/theme-test] Testing theme similarity:', {
      theme: theme.trim(),
      guess: guess.trim()
    });

    // Test the theme matching using the same logic as actual guesses
    const result = await isThemeGuessCorrect(guess.trim(), theme.trim());

    const response: ThemeTestResponse = {
      similarity: result.similarity || 0,
      isMatch: result.isCorrect,
      method: result.method,
      confidence: result.confidence,
      ...(result.method === 'error' && { error: 'AI matching failed, using fallback logic' })
    };

    console.log('[/api/admin/theme-test] Test result:', response);

    res.status(200).json(response);

  } catch (error) {
    console.error('[/api/admin/theme-test] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
