/**
 * Semantic Similarity Utility for Un•Define Theme Fuzzy Matching
 * 
 * UPDATED: February 2025 - Now delegates to themeScoring.ts with embeddingOnly mode
 * This ensures production scoring matches the admin Theme Lab exactly.
 * 
 * The embeddingOnly mode uses:
 * - Embedding similarity (sentence-transformers/all-MiniLM-L6-v2)
 * - Keyword overlap with weighted matching (exact/stem/synonym/substring)
 * - Specificity/triviality gating
 * - Negation/qualifier detection
 * - NO NLI (faster, lower cost)
 * 
 * @see src/utils/themeScoring.ts for the full implementation
 * @see docs/THEME_MATCHING_IMPROVEMENT_PLAN.md for design decisions
 */

import { testThemeScoring, THRESHOLDS } from './themeScoring';

// Re-export threshold for backward compatibility
const THEME_SIMILARITY_THRESHOLD = THRESHOLDS.embedding;
const WORD_SIMILARITY_THRESHOLD = 0.75;  // 75% for future word matching

export interface SemanticSimilarityResult {
  similarity: number;
  isMatch: boolean;
  method: 'semantic' | 'exact' | 'error';
  confidence: number;
  error?: string;
}

export interface UsageStats {
  requestsThisMonth: number;
  estimatedCost: number;
  freeRemainingRequests: number;
}

/**
 * Enhanced theme matching - delegates to themeScoring.ts with embeddingOnly mode
 * 
 * This ensures production scoring EXACTLY matches the admin Theme Lab.
 * Uses: Embedding + Keywords + Specificity + Negation (no NLI)
 * 
 * @see testThemeScoring in themeScoring.ts for full implementation
 */
export async function matchThemeWithFuzzy(
  guess: string, 
  theme: string
): Promise<SemanticSimilarityResult> {
  const normalizedGuess = guess.toLowerCase().trim();
  const normalizedTheme = theme.toLowerCase().trim();
  
  // Exact match (case insensitive)
  if (normalizedGuess === normalizedTheme) {
    return {
      similarity: 1.0,
      isMatch: true,
      method: 'exact',
      confidence: 100
    };
  }
  
  // Use the full themeScoring module with embeddingOnly mode
  // This matches EXACTLY what the admin Theme Lab uses
  try {
    const result = await testThemeScoring(guess, theme, {
      methods: ['embedding', 'keywords', 'length', 'embeddingOnly']
    });
    
    // Extract the hybrid result (embeddingOnly stores its result there)
    const finalScore = result.hybrid?.finalScore ?? result.embedding?.similarity ?? 0;
    const isMatch = result.hybrid?.isMatch ?? result.embedding?.isMatch ?? false;
    const strategy = result.hybrid?.strategy ?? 'embedding_only';
    
    console.log(`[matchThemeWithFuzzy] "${guess}" vs "${theme}": final=${Math.round(finalScore*100)}%, strategy=${strategy}, match=${isMatch}`);
    
    // Log usage for cost monitoring
    await logSemanticUsage('theme');
    
    return {
      similarity: finalScore,
      isMatch,
      method: 'semantic',
      confidence: Math.round(finalScore * 100)
    };
    
  } catch (error) {
    console.error('[matchThemeWithFuzzy] Error:', error);
    return {
      similarity: 0,
      isMatch: false,
      method: 'error',
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Log semantic API usage for cost monitoring
 */
async function logSemanticUsage(type: 'theme' | 'word'): Promise<void> {
  try {
    // This would integrate with your Supabase usage tracking
    // For now, just log to console
    console.log(`[Semantic API] ${type} matching request at ${new Date().toISOString()}`);
  } catch (error) {
    console.error('Usage logging error:', error);
  }
}

/**
 * Get current usage stats (for monitoring)
 */
export async function getSemanticUsageStats(): Promise<UsageStats> {
  // TODO: Implement actual usage tracking from database
  return {
    requestsThisMonth: 0,
    estimatedCost: 0,
    freeRemainingRequests: 30000
  };
}

/**
 * Simple string similarity for fallback/comparison
 * Using Levenshtein distance
 */
export function stringSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;
  
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));
  
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const distance = matrix[len1][len2];
  return 1 - distance / Math.max(len1, len2);
}

/**
 * Development/testing utilities
 */
export const DEV_UTILS = {
  THEME_THRESHOLD: THEME_SIMILARITY_THRESHOLD,
  WORD_THRESHOLD: WORD_SIMILARITY_THRESHOLD,
  
  // Test theme matching with full scoring
  async testThemeMatch(guess: string, theme: string): Promise<void> {
    const result = await matchThemeWithFuzzy(guess, theme);
    console.log(`"${guess}" → "${theme}": ${result.confidence}% (${result.method}) - ${result.isMatch ? 'MATCH' : 'NO MATCH'}`);
  }
};
