/**
 * Admin Theme Test API
 * 
 * Allows admins to test theme similarity scoring without creating actual theme attempts.
 * Supports multiple scoring methods for comparison and debugging.
 * 
 * POST /api/admin/theme-test
 * Body: { theme: string, guess: string, options?: { methods?: string[], templates?: object } }
 * 
 * Protected by admin auth via withAdminCors.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { withAdminCors } from '@/lib/withAdminAuth';
import { testThemeScoring, type ThemeTestResult } from '@/src/utils/themeScoring';

interface ThemeTestRequest {
  theme: string;
  guess: string;
  options?: {
    methods?: ('embedding' | 'nli' | 'hybrid')[];
    themeTemplate?: string;
    guessTemplate?: string;
    words?: string[];
  };
}

interface ThemeTestResponse {
  // Primary result (using hybrid method by default)
  similarity: number;
  isMatch: boolean;
  method: string;
  confidence: number;
  
  // Detailed breakdown by method
  details: {
    embedding?: {
      similarity: number;
      isMatch: boolean;
      model: string;
      threshold: number;
    };
    nli?: {
      entailment: number;
      contradiction: number;
      neutral: number;
      isMatch: boolean;
      model: string;
      threshold: number;
    };
    hybrid?: {
      finalScore: number;
      isMatch: boolean;
      embeddingWeight: number;
      nliWeight: number;
      strategy: string;
    };
  };
  
  // Debug info
  debug: {
    themeUsed: string;
    guessUsed: string;
    templatesUsed?: {
      theme: string;
      guess: string;
    };
    processingTimeMs: number;
  };
  
  error?: string;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ThemeTestResponse | { error: string; details?: string }>
) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    const { theme, guess, options }: ThemeTestRequest = req.body;

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

    const trimmedTheme = theme.trim();
    const trimmedGuess = guess.trim();

    if (trimmedTheme.length === 0 || trimmedGuess.length === 0) {
      return res.status(400).json({ 
        error: 'Empty inputs',
        details: 'Both "theme" and "guess" must be non-empty' 
      });
    }

    console.log('[/api/admin/theme-test] Testing theme similarity:', {
      theme: trimmedTheme,
      guess: trimmedGuess,
      options
    });

    // Run the theme scoring with all methods
    const result = await testThemeScoring(trimmedGuess, trimmedTheme, {
      methods: options?.methods || ['embedding', 'nli', 'hybrid'],
      themeTemplate: options?.themeTemplate,
      guessTemplate: options?.guessTemplate,
      words: options?.words
    });

    const processingTimeMs = Date.now() - startTime;

    const response: ThemeTestResponse = {
      similarity: result.hybrid?.finalScore ?? result.embedding?.similarity ?? 0,
      isMatch: result.hybrid?.isMatch ?? result.embedding?.isMatch ?? false,
      method: result.hybrid ? 'hybrid' : 'embedding',
      confidence: Math.round((result.hybrid?.finalScore ?? result.embedding?.similarity ?? 0) * 100),
      details: {
        embedding: result.embedding ? {
          similarity: result.embedding.similarity,
          isMatch: result.embedding.isMatch,
          model: result.embedding.model,
          threshold: result.embedding.threshold
        } : undefined,
        nli: result.nli ? {
          entailment: result.nli.entailment,
          contradiction: result.nli.contradiction,
          neutral: result.nli.neutral,
          isMatch: result.nli.isMatch,
          model: result.nli.model,
          threshold: result.nli.threshold
        } : undefined,
        hybrid: result.hybrid ? {
          finalScore: result.hybrid.finalScore,
          isMatch: result.hybrid.isMatch,
          embeddingWeight: result.hybrid.embeddingWeight,
          nliWeight: result.hybrid.nliWeight,
          strategy: result.hybrid.strategy
        } : undefined
      },
      debug: {
        themeUsed: trimmedTheme,
        guessUsed: trimmedGuess,
        templatesUsed: result.templatesUsed,
        processingTimeMs
      },
      ...(result.error && { error: result.error })
    };

    console.log('[/api/admin/theme-test] Result:', {
      isMatch: response.isMatch,
      confidence: response.confidence,
      method: response.method,
      timeMs: processingTimeMs
    });

    res.status(200).json(response);

  } catch (error) {
    console.error('[/api/admin/theme-test] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default withAdminCors(handler);
