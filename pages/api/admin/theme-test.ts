/**
 * Admin API: POST /api/admin/theme-test
 * 
 * Test theme similarity without submitting an actual guess.
 * Used by the Theme Test Lab in the admin portal for debugging.
 * 
 * Returns detailed information about how the AI evaluates the match.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/src/env.server';
import { withCors } from '@/lib/withCors';

// Same model and threshold as production
const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const HF_API_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`;
const THEME_SIMILARITY_THRESHOLD = 0.78;

interface ThemeTestRequest {
  theme: string;
  guess: string;
}

interface ThemeTestResponse {
  isCorrect: boolean;
  method: 'exact' | 'semantic' | 'error';
  confidence: number;
  similarity?: number;
  threshold: number;
  contextualGuess: string;
  contextualTheme: string;
  model: string;
  error?: string;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ThemeTestResponse | { error: string }>
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin authentication
  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { theme, guess } = req.body as ThemeTestRequest;

    if (!theme?.trim() || !guess?.trim()) {
      return res.status(400).json({ error: 'Both theme and guess are required' });
    }

    const normalizedGuess = guess.toLowerCase().trim();
    const normalizedTheme = theme.toLowerCase().trim();

    // Check for exact match first
    if (normalizedGuess === normalizedTheme) {
      return res.status(200).json({
        isCorrect: true,
        method: 'exact',
        confidence: 100,
        similarity: 1.0,
        threshold: THEME_SIMILARITY_THRESHOLD,
        contextualGuess: normalizedGuess,
        contextualTheme: normalizedTheme,
        model: HF_MODEL,
      });
    }

    // Compute semantic similarity
    const apiKey = env.HF_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'HF_API_KEY not configured - cannot test semantic similarity',
      });
    }

    // Apply contextual framing (same as production)
    const contextualGuess = `What connects this week's words? ${normalizedGuess}`;
    const contextualTheme = `What connects this week's words? ${normalizedTheme}`;

    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          source_sentence: contextualGuess,
          sentences: [contextualTheme]
        }
      })
    });

    if (!response.ok) {
      if (response.status === 503) {
        // Model loading
        return res.status(503).json({
          error: 'AI model is loading. Please wait a few seconds and try again.',
        });
      }
      const errorText = await response.text();
      console.error(`[theme-test] HF API Error: ${response.status} - ${errorText}`);
      return res.status(500).json({
        error: `AI API Error: ${response.status}`,
      });
    }

    const result = await response.json();
    const similarity = result[0] || 0;
    const confidence = Math.round(similarity * 100);
    const isCorrect = similarity >= THEME_SIMILARITY_THRESHOLD;

    console.log(`[theme-test] "${guess}" → "${theme}": ${confidence}% (threshold: ${Math.round(THEME_SIMILARITY_THRESHOLD * 100)}%)`);

    return res.status(200).json({
      isCorrect,
      method: 'semantic',
      confidence,
      similarity,
      threshold: THEME_SIMILARITY_THRESHOLD,
      contextualGuess,
      contextualTheme,
      model: HF_MODEL,
    });

  } catch (error) {
    console.error('[theme-test] Error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export default withCors(handler);

