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
    methods?: ('embedding' | 'paraphrase' | 'nli' | 'hybrid' | 'keywords' | 'embeddingOnly' | 'length')[];
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
    paraphrase?: {
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
      // Bidirectional NLI details
      forward?: { entailment: number; contradiction: number; neutral: number };
      reverse?: { entailment: number; contradiction: number; neutral: number };
    };
    hybrid?: {
      finalScore: number;
      isMatch: boolean;
      embeddingWeight: number;
      nliWeight: number;
      strategy: string;
    };
    keywords?: {
      overlap: number;
      weightedOverlap?: number;
      themeKeywords: string[];
      guessKeywords: string[];
      matchedKeywords: string[];
      matchDetails?: Array<{
        themeKeyword: string;
        guessToken: string;
        matchType: string;
        score: number;
      }>;
      hasSynonymMatches?: boolean;
      isMatch: boolean;
      penalty: number;
    };
    lengthPenalty?: {
      themeLengthWords: number;
      guessLengthWords: number;
      ratio: number;
      penalty: number;
      isShort: boolean;
    };
    specificity?: {
      themeContentTokens: string[];
      guessContentTokens: string[];
      themeContentTokenCount: number;
      guessContentTokenCount: number;
      isTrivialGuess: boolean;
      penaltyApplied: number;
      reason: string;
    };
    negation?: {
      guessHasNegation: boolean;
      themeHasNegation: boolean;
      guessHasQualifier: boolean;
      themeHasQualifier: boolean;
      shouldPenalise: boolean;
      reason?: string;
      matchedNegations?: string[];
      matchedQualifiers?: string[];
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
    // NEW: Explicit raw vs processed inputs
    inputsUsed?: {
      rawTheme: string;
      rawGuess: string;
      processedTheme: string;
      processedGuess: string;
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

    // Run the theme scoring with requested methods (default to recommended embeddingOnly approach)
    const result = await testThemeScoring(trimmedGuess, trimmedTheme, {
      methods: options?.methods || ['embedding', 'keywords', 'length', 'embeddingOnly'],
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
        paraphrase: result.paraphrase ? {
          similarity: result.paraphrase.similarity,
          isMatch: result.paraphrase.isMatch,
          model: result.paraphrase.model,
          threshold: result.paraphrase.threshold
        } : undefined,
        nli: result.nli ? {
          entailment: result.nli.entailment,
          contradiction: result.nli.contradiction,
          neutral: result.nli.neutral,
          isMatch: result.nli.isMatch,
          model: result.nli.model,
          threshold: result.nli.threshold,
          // Include bidirectional details if available
          forward: result.nli.forward,
          reverse: result.nli.reverse
        } : undefined,
        hybrid: result.hybrid ? {
          finalScore: result.hybrid.finalScore,
          isMatch: result.hybrid.isMatch,
          embeddingWeight: result.hybrid.embeddingWeight,
          nliWeight: result.hybrid.nliWeight,
          strategy: result.hybrid.strategy
        } : undefined,
        keywords: result.keywords ? {
          overlap: result.keywords.overlap,
          weightedOverlap: result.keywords.weightedOverlap,
          themeKeywords: result.keywords.themeKeywords,
          guessKeywords: result.keywords.guessKeywords,
          matchedKeywords: result.keywords.matchedKeywords,
          matchDetails: result.keywords.matchDetails,
          hasSynonymMatches: result.keywords.hasSynonymMatches,
          isMatch: result.keywords.isMatch,
          penalty: result.keywords.penalty
        } : undefined,
        lengthPenalty: result.lengthPenalty ? {
          themeLengthWords: result.lengthPenalty.themeLengthWords,
          guessLengthWords: result.lengthPenalty.guessLengthWords,
          ratio: result.lengthPenalty.ratio,
          penalty: result.lengthPenalty.penalty,
          isShort: result.lengthPenalty.isShort
        } : undefined,
        specificity: result.specificity ? {
          themeContentTokens: result.specificity.themeContentTokens,
          guessContentTokens: result.specificity.guessContentTokens,
          themeContentTokenCount: result.specificity.themeContentTokenCount,
          guessContentTokenCount: result.specificity.guessContentTokenCount,
          isTrivialGuess: result.specificity.isTrivialGuess,
          penaltyApplied: result.specificity.penaltyApplied,
          reason: result.specificity.reason
        } : undefined,
        negation: result.negation ? {
          guessHasNegation: result.negation.guessHasNegation,
          themeHasNegation: result.negation.themeHasNegation,
          guessHasQualifier: result.negation.guessHasQualifier,
          themeHasQualifier: result.negation.themeHasQualifier,
          shouldPenalise: result.negation.shouldPenalise,
          reason: result.negation.reason,
          matchedNegations: result.negation.matchedNegations,
          matchedQualifiers: result.negation.matchedQualifiers
        } : undefined
      },
      debug: {
        themeUsed: trimmedTheme,
        guessUsed: trimmedGuess,
        templatesUsed: result.templatesUsed,
        inputsUsed: result.inputsUsed,
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
