/**
 * Semantic Similarity Utility for Un•Define Theme Fuzzy Matching
 * 
 * UPDATED: January 2025 - Migrated to new Hugging Face Inference Providers API
 * Uses new router.huggingface.co/hf-inference endpoint (old api-inference deprecated)
 * 
 * Based on test results from 2025-01-08:
 * - Best performing model for theme matching (75% accuracy)
 * - Optimal threshold: 85% for theme matching
 * - Cost: ~$3/month for 1000 users (theme matching only)
 */

// Model selection based on test results
// Testing the gold standard MiniLM model for technical term matching
const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const HF_API_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`;

// Thresholds based on real test data
const THEME_SIMILARITY_THRESHOLD = 0.78; // Lowered to accept valid synonyms (85% was too strict for true synonyms scoring 75-82%)
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
 * Compute semantic similarity between two texts using Hugging Face API
 */
export async function computeSemanticSimilarity(
  text1: string, 
  text2: string
): Promise<number> {
  const apiKey = process.env.HF_API_KEY;
  
  if (!apiKey) {
    console.error('HF_API_KEY environment variable not set');
    return 0;
  }
  
  try {
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          source_sentence: text1.toLowerCase().trim(),
          sentences: [text2.toLowerCase().trim()]
        }
      })
    });
    
    if (!response.ok) {
      if (response.status === 503) {
        console.warn('HF model loading, retrying in 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        return computeSemanticSimilarity(text1, text2); // Retry once
      }
      
      // Log more details for debugging the new API
      const errorText = await response.text();
      console.error(`HF API Error: ${response.status} - ${errorText}`);
      throw new Error(`HF API Error: ${response.status}`);
    }
    
    const result = await response.json();
    return result[0] || 0;
    
  } catch (error) {
    console.error('Semantic similarity error:', error);
    return 0; // Fallback to no match
  }
}

/**
 * Compute semantic similarity with contextual prompting for theme matching
 * Adds context to improve AI understanding of the matching task
 */
async function computeThemeSemanticSimilarity(
  guess: string, 
  theme: string
): Promise<number> {
  const apiKey = process.env.HF_API_KEY;
  
  if (!apiKey) {
    console.error('HF_API_KEY environment variable not set');
    return 0;
  }
  
  // Add contextual framing to improve semantic matching
  // Frame BOTH as answers to the same implicit question players are answering
  // This creates symmetric comparison: both are responses to "What connects the words?"
  const contextualGuess = `What connects this week's words? ${guess.toLowerCase().trim()}`;
  const contextualTheme = `What connects this week's words? ${theme.toLowerCase().trim()}`;
  
  try {
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
        console.warn('HF model loading, retrying in 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        return computeThemeSemanticSimilarity(guess, theme); // Retry once
      }
      
      // Log more details for debugging the new API
      const errorText = await response.text();
      console.error(`HF API Error: ${response.status} - ${errorText}`);
      throw new Error(`HF API Error: ${response.status}`);
    }
    
    const result = await response.json();
    console.log(`[Theme Matching] "${guess}" → "${theme}": ${Math.round((result[0] || 0) * 100)}% (Phase 1.5: implicit connection framing)`);
    return result[0] || 0;
    
  } catch (error) {
    console.error('Contextual semantic similarity error:', error);
    return 0; // Fallback to no match
  }
}

/**
 * Enhanced theme matching with multi-tier approach
 * UPDATED: Now applies keyword overlap and specificity penalties
 * to match the Theme Test Lab scoring (Phase 1 roadmap)
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
  
  // AI semantic similarity matching with contextual prompting
  try {
    const rawSimilarity = await computeThemeSemanticSimilarity(guess, theme);
    
    // PHASE 1 ENHANCEMENT: Apply keyword and specificity penalties
    // This matches the Theme Test Lab scoring
    let finalScore = rawSimilarity;
    let strategy = 'embedding_only';
    
    // Compute keyword overlap (same logic as themeScoring.ts)
    const themeKeywords = extractKeywordsSimple(normalizedTheme);
    const guessKeywords = extractKeywordsSimple(normalizedGuess);
    
    let matchedCount = 0;
    for (const tk of themeKeywords) {
      for (const gk of guessKeywords) {
        if (tk === gk || stemWord(tk) === stemWord(gk)) {
          matchedCount++;
          break;
        }
      }
    }
    const keywordOverlap = themeKeywords.length > 0 ? matchedCount / themeKeywords.length : 1;
    
    // Apply graduated keyword penalty (same as themeScoring.ts)
    if (keywordOverlap < 0.3 && rawSimilarity > 0.7) {
      // Severe penalty for very low overlap with high embedding
      strategy = 'keyword_mismatch_severe';
      finalScore = rawSimilarity * (0.5 + keywordOverlap * 0.5);
    } else if (keywordOverlap < 0.7 && rawSimilarity > 0.7) {
      // Moderate penalty for medium-low overlap
      strategy = 'keyword_mismatch_moderate';
      const missingPortion = 1 - keywordOverlap;
      finalScore = rawSimilarity * (1 - missingPortion * 0.5);
    }
    
    // Apply specificity penalty for trivial guesses missing concepts
    const guessContentTokens = guessKeywords.length;
    const isTrivialGuess = guessContentTokens <= 2;
    
    if (isTrivialGuess && keywordOverlap < 0.5) {
      strategy = 'trivial_guess_penalty';
      const severityFactor = 0.5 - keywordOverlap;
      const specificityPenalty = Math.min(severityFactor * 0.5, 0.25);
      finalScore = finalScore * (1 - specificityPenalty);
    }
    
    const isMatch = finalScore >= THEME_SIMILARITY_THRESHOLD;
    
    console.log(`[matchThemeWithFuzzy] "${guess}" vs "${theme}": raw=${Math.round(rawSimilarity*100)}%, final=${Math.round(finalScore*100)}%, kwOverlap=${Math.round(keywordOverlap*100)}%, strategy=${strategy}`);
    
    // Log usage for cost monitoring
    await logSemanticUsage('theme');
    
    return {
      similarity: finalScore,
      isMatch,
      method: 'semantic',
      confidence: Math.round(finalScore * 100)
    };
    
  } catch (error) {
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
 * Simple keyword extraction for production scoring
 * Matches themeScoring.ts logic but lightweight
 */
function extractKeywordsSimple(text: string): string[] {
  const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
    'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'that', 'this', 'these', 'those', 'what', 'which', 'who', 'can', 'just',
    'words', 'word', 'things', 'thing', 'describe', 'connect', 'theme', 'week'
  ]);
  
  return text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Simple word stemming for keyword matching
 */
function stemWord(word: string): string {
  const w = word.toLowerCase();
  if (w.endsWith('ing')) return w.slice(0, -3);
  if (w.endsWith('ed')) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  if (w.endsWith('ly')) return w.slice(0, -2);
  return w;
}


/**
 * Log semantic API usage for cost monitoring
 */
async function logSemanticUsage(type: 'theme' | 'word'): Promise<void> {
  try {
    // This would integrate with your Supabase usage tracking
    // For now, just log to console
    console.log(`[Semantic API] ${type} matching request at ${new Date().toISOString()}`);
    
    // TODO: Implement actual usage tracking
    // await supabase.from('api_usage_logs').insert({
    //   service: 'huggingface',
    //   endpoint: 'semantic-similarity',
    //   type,
    //   timestamp: new Date().toISOString(),
    //   cost: 0.0001
    // });
    
  } catch (error) {
    console.error('Usage logging error:', error);
  }
}

/**
 * Get current usage stats (for monitoring)
 */
export async function getSemanticUsageStats(): Promise<UsageStats> {
  // TODO: Implement actual usage tracking from database
  // For now, return placeholder
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
  MODEL: HF_MODEL,
  THEME_THRESHOLD: THEME_SIMILARITY_THRESHOLD,
  WORD_THRESHOLD: WORD_SIMILARITY_THRESHOLD,
  
  // Test with sample data
  async testSimilarity(text1: string, text2: string): Promise<void> {
    const similarity = await computeSemanticSimilarity(text1, text2);
    console.log(`"${text1}" → "${text2}": ${Math.round(similarity * 100)}%`);
  }
}; 