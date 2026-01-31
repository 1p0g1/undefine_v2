/**
 * Theme Scoring Module
 * ====================
 * 
 * Multi-method approach for accurate theme guess matching:
 * 1. Embedding similarity (sentence-transformers/all-MiniLM-L6-v2)
 * 2. NLI cross-encoder for entailment checking (true 3-way MNLI)
 * 3. Hybrid decision combining both methods
 * 4. Keyword overlap with weighted matching
 * 5. Specificity gating (triviality detection)
 * 6. Negation/qualifier detection with regex word boundaries
 * 
 * ARCHITECTURE NOTE:
 * -----------------
 * This module uses TWO types of input:
 * - PROCESSED: Templates applied, used for embedding/NLI (semantic scoring)
 * - RAW: Original user text, used for keyword/negation/specificity (lexical checks)
 * 
 * This split is INTENTIONAL and CRITICAL:
 * - Semantic scoring benefits from context in templates
 * - Lexical checks need raw text to avoid template words polluting signals
 * 
 * @see src/utils/themeScoringConfig.ts for centralized configuration
 * @see docs/THEME_SCORING_IMPROVEMENT_ROADMAP.md for design decisions
 */

import {
  getThemeScoringConfig,
  MODELS,
  THRESHOLDS,
  WEIGHTS,
  NETWORK,
  SPECIFICITY,
  TEMPLATES,
  SYNONYMS,
  HF_API_BASE,
  type NetworkConfig,
  type ThemeScoringConfig,
} from './themeScoringConfig';

// Re-export config for external use
export { getThemeScoringConfig, MODELS, THRESHOLDS, WEIGHTS };

// Available models for testing (from config)
export const AVAILABLE_MODELS = {
  embedding: MODELS.embedding,
  paraphrase: MODELS.paraphrase,
  nli: MODELS.nli.default
};

// Thresholds (tunable via admin lab) - re-export for backward compatibility
export const DEFAULT_THRESHOLDS = {
  embedding: THRESHOLDS.embedding,
  nli_entailment: THRESHOLDS.nli.entailmentMin,
  nli_contradiction: THRESHOLDS.nli.contradictionMax,
  hybrid_final: THRESHOLDS.hybrid.finalMin
};

// Template defaults - re-export for backward compatibility
const DEFAULT_TEMPLATES = {
  theme: TEMPLATES.theme,
  guess: TEMPLATES.guess,
  contextual_theme: TEMPLATES.contextualTheme,
  contextual_guess: TEMPLATES.contextualGuess
};

// =============================================================================
// NETWORK UTILITIES - Bounded Retry with Exponential Backoff
// =============================================================================

/**
 * Fetch with retry - bounded loop (NOT recursive), exponential backoff, jitter, timeout
 * 
 * This replaces the old unbounded recursive retry pattern that could hang forever.
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param netConfig - Network configuration (timeouts, retries, etc.)
 * @returns Response object
 * @throws Error after all retries exhausted or timeout
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  netConfig: NetworkConfig = NETWORK
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= netConfig.maxRetries; attempt++) {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), netConfig.timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Check if we should retry based on status
      if (netConfig.retryOnStatuses.includes(response.status) && attempt < netConfig.maxRetries) {
        const delay = calculateBackoff(attempt, netConfig);
        console.warn(`[fetchWithRetry] Status ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${netConfig.maxRetries})`);
        await sleep(delay);
        continue;
      }
      
      return response;
      
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on abort (timeout) or if we've exhausted retries
      if (controller.signal.aborted) {
        throw new Error(`Request timed out after ${netConfig.timeoutMs}ms`);
      }
      
      if (attempt < netConfig.maxRetries) {
        const delay = calculateBackoff(attempt, netConfig);
        console.warn(`[fetchWithRetry] Error: ${lastError.message}, retrying in ${delay}ms (attempt ${attempt + 1}/${netConfig.maxRetries})`);
        await sleep(delay);
      }
    }
  }
  
  throw new Error(`All ${netConfig.maxRetries} retries exhausted. Last error: ${lastError?.message}`);
}

/**
 * Calculate exponential backoff with jitter
 */
function calculateBackoff(attempt: number, config: NetworkConfig): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  const jitter = Math.random() * config.jitterMs;
  return cappedDelay + jitter;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface EmbeddingResult {
  similarity: number;
  isMatch: boolean;
  model: string;
  threshold: number;
}

export interface NLIResult {
  entailment: number;
  contradiction: number;
  neutral: number;
  isMatch: boolean;
  model: string;
  threshold: number;
}

export interface HybridResult {
  finalScore: number;
  isMatch: boolean;
  embeddingWeight: number;
  nliWeight: number;
  strategy: string;
}

export interface KeywordResult {
  overlap: number;           // % of theme keywords found in guess (count-based)
  weightedOverlap?: number;  // Weighted overlap (0-1) considering match quality
  themeKeywords: string[];   // Key terms extracted from theme
  guessKeywords: string[];   // Key terms extracted from guess
  matchedKeywords: string[]; // Keywords that matched
  matchDetails?: KeywordMatchDetail[]; // How each keyword was matched
  hasSynonymMatches?: boolean; // Whether any matches came from synonyms
  isMatch: boolean;          // Whether keyword overlap suggests a match
  penalty: number;           // Penalty to apply if low overlap (0-1)
}

export interface ParaphraseResult {
  similarity: number;
  isMatch: boolean;
  model: string;
  threshold: number;
}

export interface LengthPenaltyResult {
  themeLengthWords: number;
  guessLengthWords: number;
  ratio: number;             // guess/theme length ratio
  penalty: number;           // 0-1 penalty for too-short guesses
  isShort: boolean;          // True if guess is significantly shorter
}

export interface ThemeTestResult {
  embedding?: EmbeddingResult;
  paraphrase?: ParaphraseResult;  // Paraphrase model result
  nli?: NLIResult & { forward?: NLITriplet; reverse?: NLITriplet };  // NLI with bidirectional details
  hybrid?: HybridResult;
  keywords?: KeywordResult;
  lengthPenalty?: LengthPenaltyResult;  // DEPRECATED: Use specificity
  specificity?: SpecificityResult;  // NEW: Triviality-gated specificity
  negation?: NegationResult;  // Negation/qualifier detection
  templatesUsed?: {
    theme: string;
    guess: string;
  };
  // NEW: Explicit raw vs processed inputs used
  inputsUsed?: {
    rawTheme: string;
    rawGuess: string;
    processedTheme: string;
    processedGuess: string;
  };
  error?: string;
  processingTimeMs?: number;
}

export interface ThemeTestOptions {
  methods?: ('embedding' | 'paraphrase' | 'nli' | 'hybrid' | 'keywords' | 'embeddingOnly' | 'length')[];
  themeTemplate?: string;
  guessTemplate?: string;
  words?: string[];
  thresholds?: Partial<typeof DEFAULT_THRESHOLDS>;
}

/**
 * Compute embedding similarity using sentence-transformers
 * Uses fetchWithRetry for robust network handling
 */
async function computeEmbeddingSimilarity(
  text1: string,
  text2: string
): Promise<number> {
  const apiKey = process.env.HF_API_KEY;
  
  if (!apiKey) {
    console.error('[themeScoring] HF_API_KEY not set');
    throw new Error('HF_API_KEY not configured');
  }
  
  const url = `${HF_API_BASE}/${MODELS.embedding}`;
  
  try {
    const response = await fetchWithRetry(url, {
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
      const errorText = await response.text();
      throw new Error(`Embedding API error ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    return result[0] || 0;
    
  } catch (error) {
    console.error('[themeScoring] Embedding error:', error);
    throw error;
  }
}

/**
 * Compute paraphrase similarity using paraphrase-MiniLM model
 * Better at detecting same-meaning phrases vs just related concepts
 * Uses fetchWithRetry for robust network handling
 */
async function computeParaphraseSimilarity(
  text1: string,
  text2: string
): Promise<number> {
  const apiKey = process.env.HF_API_KEY;
  
  if (!apiKey) {
    console.error('[themeScoring] HF_API_KEY not set');
    throw new Error('HF_API_KEY not configured');
  }
  
  const url = `${HF_API_BASE}/${MODELS.paraphrase}`;
  
  try {
    const response = await fetchWithRetry(url, {
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
      const errorText = await response.text();
      throw new Error(`Paraphrase API error ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    return result[0] || 0;
    
  } catch (error) {
    console.error('[themeScoring] Paraphrase error:', error);
    throw error;
  }
}

/**
 * Specificity/Triviality Result - replaces raw length penalty
 */
export interface SpecificityResult {
  themeContentTokens: string[];
  guessContentTokens: string[];
  themeContentTokenCount: number;
  guessContentTokenCount: number;
  isTrivialGuess: boolean;
  penaltyApplied: number;
  reason: string;
}

/**
 * Compute specificity with TRIVIALITY GATING
 * 
 * This replaces the old length-based penalty with a smarter approach:
 * - Only penalize guesses that are BOTH short AND trivial
 * - Trivial = few content tokens AND missing key concepts
 * - Don't punish short-but-correct guesses!
 * 
 * IMPORTANT: This function receives RAW inputs only!
 * 
 * Examples:
 * - "animals" for theme "groups of animals" → short but captures key concept → light/no penalty
 * - "things" for theme "groups of animals" → trivial and misses concepts → penalty
 * - "collective nouns" for theme "groups of animals" → short but accurate → no penalty
 * 
 * @param themeRaw - Raw theme text
 * @param guessRaw - Raw guess text  
 * @param keywordOverlap - Keyword overlap score (0-1) for gating
 */
function computeSpecificityAdjustment(
  themeRaw: string, 
  guessRaw: string,
  keywordOverlap: number = 1
): SpecificityResult {
  // Extract content tokens (keywords) from both
  const themeContentTokens = extractKeywords(themeRaw);
  const guessContentTokens = extractKeywords(guessRaw);
  
  const themeContentTokenCount = themeContentTokens.length;
  const guessContentTokenCount = guessContentTokens.length;
  
  // Is the guess trivial? (very few content words)
  const isTrivialGuess = guessContentTokenCount <= SPECIFICITY.trivialGuessMaxContentTokens;
  
  // TRIVIALITY GATING: Only apply penalty if BOTH:
  // 1. Guess is trivial (1-2 content words)
  // 2. Keyword overlap is low (missing key concepts)
  let penaltyApplied = 0;
  let reason = 'none';
  
  if (isTrivialGuess && keywordOverlap < SPECIFICITY.minKeywordOverlapForShortGuess) {
    // Trivial guess with missing concepts → apply penalty
    const severityFactor = (SPECIFICITY.minKeywordOverlapForShortGuess - keywordOverlap);
    penaltyApplied = Math.min(severityFactor * SPECIFICITY.maxSpecificityPenalty * 2, SPECIFICITY.maxSpecificityPenalty);
    reason = `trivial_guess_missing_concepts (${guessContentTokenCount} tokens, ${(keywordOverlap*100).toFixed(0)}% overlap)`;
    
    console.log(`[themeScoring] Specificity penalty: ${(penaltyApplied*100).toFixed(0)}% - ${reason}`);
  } else if (isTrivialGuess) {
    reason = `trivial_but_captures_concepts (${guessContentTokenCount} tokens, ${(keywordOverlap*100).toFixed(0)}% overlap)`;
    console.log(`[themeScoring] Specificity: no penalty - ${reason}`);
  } else {
    reason = `non_trivial (${guessContentTokenCount} content tokens)`;
  }
  
  return {
    themeContentTokens,
    guessContentTokens,
    themeContentTokenCount,
    guessContentTokenCount,
    isTrivialGuess,
    penaltyApplied,
    reason
  };
}

/**
 * DEPRECATED: Old length penalty - kept for backward compatibility
 * Use computeSpecificityAdjustment instead
 */
function computeLengthPenalty(theme: string, guess: string): LengthPenaltyResult {
  const themeWords = theme.toLowerCase().trim().split(/\s+/).filter(w => w.length > 0);
  const guessWords = guess.toLowerCase().trim().split(/\s+/).filter(w => w.length > 0);
  
  const themeLengthWords = themeWords.length;
  const guessLengthWords = guessWords.length;
  const ratio = themeLengthWords > 0 ? guessLengthWords / themeLengthWords : 1;
  
  // Delegate to new specificity function for actual penalty calculation
  // This maintains backward compat while using new logic
  const specificity = computeSpecificityAdjustment(theme, guess);
  
  return {
    themeLengthWords,
    guessLengthWords,
    ratio,
    penalty: specificity.penaltyApplied,
    isShort: specificity.isTrivialGuess
  };
}

/**
 * NLI Triplet result from sentence-pair classification
 */
export interface NLITriplet {
  entailment: number;
  contradiction: number;
  neutral: number;
  raw?: unknown; // Raw API response for debugging
}

/**
 * Compute TRUE 3-way NLI scores using MNLI sentence-pair classification
 * 
 * This is the CORRECT way to use MNLI models - with text + text_pair payload.
 * Returns actual probability distribution over: entailment, neutral, contradiction
 * 
 * For theme matching:
 * - Premise (text): "The theme is {actual_theme}"  
 * - Hypothesis (text_pair): "The theme is {guess}"
 * 
 * Label mapping (MNLI convention):
 * - LABEL_0 or "contradiction" = contradiction
 * - LABEL_1 or "neutral" = neutral  
 * - LABEL_2 or "entailment" = entailment
 * 
 * @param premise - The theme statement
 * @param hypothesis - The guess statement
 * @param model - Which NLI model to use (from config options)
 */
async function computeNLITriplet(
  premise: string,
  hypothesis: string,
  model: string = MODELS.nli.default
): Promise<NLITriplet> {
  const apiKey = process.env.HF_API_KEY;
  
  if (!apiKey) {
    console.error('[themeScoring] HF_API_KEY not set');
    throw new Error('HF_API_KEY not configured');
  }
  
  const url = `${HF_API_BASE}/${model}`;
  
  try {
    // TRUE sentence-pair classification format
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          text: premise,
          text_pair: hypothesis
        },
        parameters: {
          top_k: 3,
          function_to_apply: 'softmax'
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NLI API error ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    
    // Parse response - should be array of {label, score}
    let triplet: NLITriplet = {
      entailment: 0,
      contradiction: 0,
      neutral: 0,
      raw: result
    };
    
    // Handle different response formats
    const scores = Array.isArray(result) ? result : (result.labels ? 
      result.labels.map((label: string, i: number) => ({ label, score: result.scores[i] })) : []);
    
    for (const item of scores) {
      const label = (item.label || '').toLowerCase();
      const score = item.score || 0;
      
      // Map labels robustly
      if (label.includes('entail') || label === 'label_2') {
        triplet.entailment = score;
      } else if (label.includes('contrad') || label === 'label_0') {
        triplet.contradiction = score;
      } else if (label.includes('neutral') || label === 'label_1') {
        triplet.neutral = score;
      }
    }
    
    // Normalize to ensure sum ≈ 1
    const sum = triplet.entailment + triplet.contradiction + triplet.neutral;
    if (sum > 0 && Math.abs(sum - 1) > 0.01) {
      triplet.entailment /= sum;
      triplet.contradiction /= sum;
      triplet.neutral /= sum;
    }
    
    console.log(`[themeScoring] NLI (${model.split('/').pop()}): E:${(triplet.entailment*100).toFixed(1)}% C:${(triplet.contradiction*100).toFixed(1)}% N:${(triplet.neutral*100).toFixed(1)}%`);
    
    return triplet;
    
  } catch (error) {
    console.error('[themeScoring] NLI error:', error);
    throw error;
  }
}

/**
 * Compute bidirectional NLI for equivalence checking
 * 
 * For two statements to be equivalent (semantically the same):
 * - Forward: premise entails hypothesis
 * - Reverse: hypothesis entails premise
 * 
 * We take the MINIMUM entailment as strict equivalence measure.
 * We take the MAXIMUM contradiction as safety measure.
 * 
 * This catches cases where A→B but not B→A (implies, not equivalent)
 */
async function computeNLIBidirectional(
  themeProcessed: string,
  guessProcessed: string,
  model: string = MODELS.nli.default
): Promise<{
  forward: NLITriplet;
  reverse: NLITriplet;
  combined: NLITriplet;
}> {
  // Forward: Does the guess entail the theme?
  const forward = await computeNLITriplet(guessProcessed, themeProcessed, model);
  
  // Reverse: Does the theme entail the guess?
  const reverse = await computeNLITriplet(themeProcessed, guessProcessed, model);
  
  // Combined: Strict equivalence
  const combined: NLITriplet = {
    entailment: Math.min(forward.entailment, reverse.entailment),  // Both must entail
    contradiction: Math.max(forward.contradiction, reverse.contradiction), // Either can contradict
    neutral: (forward.neutral + reverse.neutral) / 2,  // Average neutral
  };
  
  // Re-normalize
  const sum = combined.entailment + combined.contradiction + combined.neutral;
  if (sum > 0) {
    combined.entailment /= sum;
    combined.contradiction /= sum;
    combined.neutral /= sum;
  }
  
  console.log(`[themeScoring] NLI Bidirectional: combined E:${(combined.entailment*100).toFixed(1)}% C:${(combined.contradiction*100).toFixed(1)}%`);
  
  return { forward, reverse, combined };
}

/**
 * Legacy wrapper - maintains backward compatibility
 * Calls new computeNLITriplet internally
 */
async function computeNLIScores(
  premise: string,
  hypothesis: string
): Promise<{ entailment: number; contradiction: number; neutral: number }> {
  const triplet = await computeNLITriplet(premise, hypothesis);
  return {
    entailment: triplet.entailment,
    contradiction: triplet.contradiction,
    neutral: triplet.neutral
  };
}

/**
 * Apply template to text
 */
function applyTemplate(template: string, replacements: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

// =============================================================================
// RAW vs PROCESSED INPUT PREPARATION
// =============================================================================

/**
 * Input preparation result - explicitly separates RAW and PROCESSED forms
 * 
 * RAW: Exact user text (trimmed only) - used for keyword/negation/specificity
 * PROCESSED: Template-applied text - used for embedding/NLI (semantic scoring)
 * 
 * This split is CRITICAL and NON-ACCIDENTAL:
 * - Semantic scoring benefits from template context
 * - Lexical checks need raw text to avoid template pollution
 */
export interface PreparedInputs {
  raw: {
    theme: string;
    guess: string;
    words: string[];
  };
  processed: {
    theme: string;
    guess: string;
  };
  templatesUsed: {
    theme: string;
    guess: string;
  };
}

/**
 * Prepare theme scoring inputs with explicit raw/processed split
 * 
 * @param rawTheme - Original theme text
 * @param rawGuess - Original guess text  
 * @param words - Optional weekly words for context
 * @param themeTemplate - Template for theme (processed)
 * @param guessTemplate - Template for guess (processed)
 */
export function prepareThemeScoringInputs(params: {
  rawTheme: string;
  rawGuess: string;
  words?: string[];
  themeTemplate?: string;
  guessTemplate?: string;
}): PreparedInputs {
  const {
    rawTheme,
    rawGuess,
    words = [],
    themeTemplate = DEFAULT_TEMPLATES.contextual_theme,
    guessTemplate = DEFAULT_TEMPLATES.contextual_guess,
  } = params;
  
  // RAW: Exact user text, trimmed only
  const raw = {
    theme: rawTheme.trim(),
    guess: rawGuess.trim(),
    words,
  };
  
  // PROCESSED: Apply templates with context
  const wordsStr = words.join(', ');
  const processed = {
    theme: applyTemplate(themeTemplate, { theme: raw.theme, words: wordsStr }),
    guess: applyTemplate(guessTemplate, { guess: raw.guess, words: wordsStr }),
  };
  
  return {
    raw,
    processed,
    templatesUsed: {
      theme: themeTemplate,
      guess: guessTemplate,
    },
  };
}

/**
 * Common stop words to filter out from keyword extraction
 * UPDATED: Added meta-verbs (describe, connect, etc.) that pollute keyword signals
 */
const STOP_WORDS = new Set([
  // Standard stop words
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 
  'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'must', 'that', 'this', 'these', 'those', 'what', 'which',
  'who', 'whom', 'whose', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
  'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only',
  'own', 'same', 'so', 'than', 'too', 'very', 'can', 'just', 'also',
  // Meta words that appear in theme descriptions but aren't meaningful keywords
  'words', 'word', 'things', 'thing', 'begin', 'beginning', 'begins',
  'describe', 'describing', 'describes', 'described',
  'connect', 'connecting', 'connects', 'connected', 'connection',
  'theme', 'themes', 'week', 'weekly', 'weeks',
  'used', 'using', 'use', 'uses'
]);

/**
 * Negation detection using proper word boundary regex
 * This prevents false matches like "notice" matching "not"
 */
const NEGATION_REGEXES = [
  /\bnot\b/i,
  /\bwithout\b/i,
  /\bnever\b/i,
  /\bno\b/i,
  /\bnone\b/i,
  /\bneither\b/i,
  /\bnor\b/i,
  /\bnon-/i  // Hyphenated "non-" prefix
];

/**
 * Qualifier patterns that indicate specific properties
 * If guess has these but theme doesn't, it's likely wrong
 * These patterns indicate the theme is about letter/sound properties, not semantic meaning
 */
const QUALIFIER_PATTERNS = [
  /\bbegin(?:s|ning)?\s+with\b/i,
  /\bstart(?:s|ing)?\s+with\b/i,
  /\bcontain(?:s|ing)?\s+the\s+letter\b/i,
  /\bend(?:s|ing)?\s+(?:in|with)\b/i,
  /\brhyme(?:s)?\s+with\b/i,
  /\bsound(?:s)?\s+like\b/i,
  /\bspelled?\s+with\b/i,
  /\bhave\s+\d+\s+letters?\b/i
];

/**
 * Synonym dictionary for common theme terms
 * Helps match paraphrases like "group" ↔ "plural"
 */
const KEYWORD_SYNONYMS: Record<string, string[]> = {
  'group': ['plural', 'collective', 'collection', 'set', 'bunch'],
  'plural': ['group', 'collective', 'multiple'],
  'animal': ['creature', 'beast', 'fauna', 'wildlife'],
  'noun': ['substantive', 'naming', 'object'],
  'verb': ['action', 'doing'],
  'adjective': ['describing', 'modifier'],
  'speech': ['grammar', 'grammatical', 'linguistic', 'language'],
  'part': ['component', 'element', 'role', 'function'],
  'dual': ['both', 'double', 'two', 'multiple'],
  'meaning': ['definition', 'sense', 'interpretation'],
  'stress': ['emphasis', 'accent', 'pronunciation'],
  'change': ['shift', 'alter', 'vary', 'different']
};

/**
 * Extract meaningful keywords from text
 * Filters out stop words and normalizes
 */
function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word))
    .map(word => word.trim())
    .filter(Boolean);
}

/**
 * Expand keywords with their synonyms
 */
function expandWithSynonyms(keywords: string[]): Set<string> {
  const expanded = new Set(keywords);
  for (const keyword of keywords) {
    const stemmed = stemWord(keyword);
    // Check both original and stemmed versions
    const synonyms = KEYWORD_SYNONYMS[keyword] || KEYWORD_SYNONYMS[stemmed] || [];
    synonyms.forEach(s => expanded.add(s));
  }
  return expanded;
}

/**
 * Detect negation or qualifier mismatch between theme and guess
 * Uses proper regex word boundaries to avoid false positives like "notice" matching "not"
 * Returns penalty info if guess has negation/qualifier that theme doesn't
 */
export interface NegationResult {
  guessHasNegation: boolean;
  themeHasNegation: boolean;
  guessHasQualifier: boolean;
  themeHasQualifier: boolean;
  shouldPenalise: boolean;
  reason?: string;
  matchedNegations?: string[];
  matchedQualifiers?: string[];
}

function detectNegationOrQualifier(theme: string, guess: string): NegationResult {
  // Use regex with word boundaries for accurate negation detection
  const themeHasNegation = NEGATION_REGEXES.some(regex => regex.test(theme));
  const guessHasNegation = NEGATION_REGEXES.some(regex => regex.test(guess));
  
  // Find which negation patterns matched (for debug)
  const themeNegations = NEGATION_REGEXES.filter(r => r.test(theme)).map(r => r.source);
  const guessNegations = NEGATION_REGEXES.filter(r => r.test(guess)).map(r => r.source);
  
  // Check for qualifier patterns
  const themeHasQualifier = QUALIFIER_PATTERNS.some(p => p.test(theme));
  const guessHasQualifier = QUALIFIER_PATTERNS.some(p => p.test(guess));
  
  // Find which qualifier patterns matched (for debug)
  const guessQualifiers = QUALIFIER_PATTERNS.filter(p => p.test(guess)).map(p => p.source);
  
  // Determine if we should penalise
  let shouldPenalise = false;
  let reason: string | undefined;
  
  // Penalise if guess has negation but theme doesn't (or vice versa)
  if (guessHasNegation !== themeHasNegation) {
    shouldPenalise = true;
    reason = guessHasNegation 
      ? `Guess contains negation (${guessNegations.join(', ')}) but theme does not`
      : `Theme contains negation (${themeNegations.join(', ')}) but guess does not`;
  }
  
  // Penalise if guess has qualifier pattern but theme doesn't
  // This catches cases like guess="begin with b" for a semantic theme
  if (guessHasQualifier && !themeHasQualifier) {
    shouldPenalise = true;
    reason = `Guess contains qualifier pattern (${guessQualifiers.join(', ')}) not in theme`;
  }
  
  console.log(`[themeScoring] Negation check: theme=${themeHasNegation}, guess=${guessHasNegation}, qualifier mismatch=${guessHasQualifier && !themeHasQualifier}`);
  
  return {
    themeHasNegation,
    guessHasNegation,
    themeHasQualifier,
    guessHasQualifier,
    shouldPenalise,
    reason,
    matchedNegations: [...themeNegations, ...guessNegations],
    matchedQualifiers: guessQualifiers
  };
}

/**
 * Keyword match detail - shows HOW each keyword was matched
 */
export interface KeywordMatchDetail {
  themeKeyword: string;
  guessToken: string;
  matchType: 'exact' | 'stem' | 'synonym' | 'substring' | 'none';
  score: number;
}

/**
 * Extended keyword result with weighted matching details
 */
export interface ExtendedKeywordResult extends KeywordResult {
  matchDetails: KeywordMatchDetail[];
  weightedOverlap: number;
  hasSynonymMatches: boolean;
}

/**
 * Compute keyword overlap between theme and guess with WEIGHTED matching
 * 
 * This helps detect false positives where embedding sees similarity
 * but the actual meaning is different.
 * 
 * WEIGHTED MATCHING (from config):
 * - exact: 1.0  (animals = animals)
 * - stem: 0.9   (animals → animal matches animal)
 * - synonym: 0.6 (group ↔ plural via synonym dictionary)
 * - substring: 0.3 (animal in animals - partial match)
 * 
 * IMPORTANT: This function receives RAW inputs only!
 * Do not pass processed/template text here - it will pollute keyword signals.
 * 
 * Example with weighted scoring:
 * - Theme: "Groups of animals" → keywords: ["groups", "animals"]
 * - Guess: "Plural for animals" → keywords: ["plural", "animals"]
 * - "groups" ↔ "plural" via synonym → 0.6 score
 * - "animals" exact match → 1.0 score
 * - Weighted overlap: (0.6 + 1.0) / 2 = 0.8
 */
function computeKeywordOverlap(themeRaw: string, guessRaw: string): ExtendedKeywordResult {
  const themeKeywords = extractKeywords(themeRaw);
  const guessKeywords = extractKeywords(guessRaw);
  const weights = WEIGHTS.keywordMatching;
  
  const matchDetails: KeywordMatchDetail[] = [];
  let totalWeightedScore = 0;
  let hasSynonymMatches = false;
  
  for (const tk of themeKeywords) {
    const tkStem = stemWord(tk);
    let bestMatch: KeywordMatchDetail = {
      themeKeyword: tk,
      guessToken: '',
      matchType: 'none',
      score: 0
    };
    
    // Check each guess keyword for the best match
    for (const gk of guessKeywords) {
      const gkStem = stemWord(gk);
      
      // Exact match (highest priority)
      if (tk === gk) {
        bestMatch = { themeKeyword: tk, guessToken: gk, matchType: 'exact', score: weights.exact };
        break;
      }
      
      // Stem match
      if (tkStem === gkStem && bestMatch.score < weights.stem) {
        bestMatch = { themeKeyword: tk, guessToken: gk, matchType: 'stem', score: weights.stem };
      }
      
      // Substring match (partial)
      if ((tk.includes(gk) || gk.includes(tk)) && tk !== gk && tkStem !== gkStem && bestMatch.score < weights.substring) {
        bestMatch = { themeKeyword: tk, guessToken: gk, matchType: 'substring', score: weights.substring };
      }
    }
    
    // If no good match yet, check synonyms from config
    if (bestMatch.score < weights.synonym) {
      // Check if theme keyword has synonyms that match guess
      const themeSynonyms = SYNONYMS[tk] || SYNONYMS[tkStem] || [];
      for (const ts of themeSynonyms) {
        const tsStem = stemWord(ts);
        for (const gk of guessKeywords) {
          const gkStem = stemWord(gk);
          if (tsStem === gkStem || ts === gk) {
            bestMatch = { themeKeyword: tk, guessToken: gk, matchType: 'synonym', score: weights.synonym };
            hasSynonymMatches = true;
            break;
          }
        }
        if (bestMatch.matchType === 'synonym') break;
      }
      
      // Also check if guess keywords have synonyms that match theme
      if (bestMatch.matchType !== 'synonym') {
        for (const gk of guessKeywords) {
          const gkStem = stemWord(gk);
          const guessSynonyms = SYNONYMS[gk] || SYNONYMS[gkStem] || [];
          for (const gs of guessSynonyms) {
            const gsStem = stemWord(gs);
            if (gsStem === tkStem || gs === tk) {
              bestMatch = { themeKeyword: tk, guessToken: gk, matchType: 'synonym', score: weights.synonym };
              hasSynonymMatches = true;
              break;
            }
          }
          if (bestMatch.matchType === 'synonym') break;
        }
      }
    }
    
    matchDetails.push(bestMatch);
    totalWeightedScore += bestMatch.score;
  }
  
  // Calculate weighted overlap
  const weightedOverlap = themeKeywords.length > 0 
    ? totalWeightedScore / themeKeywords.length 
    : 0;
  
  // Simple overlap (count-based, for backward compatibility)
  const matchedKeywords = matchDetails
    .filter(d => d.matchType !== 'none')
    .map(d => d.themeKeyword);
  const overlap = themeKeywords.length > 0 
    ? matchedKeywords.length / themeKeywords.length 
    : 0;
  
  // Calculate penalty based on weighted overlap (more nuanced)
  const penaltyStart = THRESHOLDS.keywords.overlapPenaltyStart;
  const penalty = weightedOverlap < penaltyStart 
    ? (penaltyStart - weightedOverlap) * WEIGHTS.penalties.keywordMismatch
    : 0;
  
  const isMatch = weightedOverlap >= THRESHOLDS.keywords.overlapMin;
  
  console.log(`[themeScoring] Keywords (weighted): theme=${JSON.stringify(themeKeywords)}, guess=${JSON.stringify(guessKeywords)}, weighted=${(weightedOverlap*100).toFixed(1)}%, matches=${matchDetails.filter(d => d.matchType !== 'none').map(d => `${d.themeKeyword}→${d.matchType}`).join(', ')}`);
  
  return {
    overlap,
    weightedOverlap,
    themeKeywords,
    guessKeywords,
    matchedKeywords,
    matchDetails,
    hasSynonymMatches,
    isMatch,
    penalty
  };
}

/**
 * Basic word stemming (Porter-style light stemming)
 */
function stemWord(word: string): string {
  return word
    .replace(/ies$/, 'y')
    .replace(/es$/, '')
    .replace(/s$/, '')
    .replace(/ing$/, '')
    .replace(/ed$/, '')
    .replace(/ly$/, '')
    .replace(/ful$/, '')
    .replace(/ness$/, '');
}

/**
 * Main test function - runs multiple scoring methods
 * 
 * ARCHITECTURE: RAW vs PROCESSED inputs
 * -------------------------------------
 * - PROCESSED inputs (with templates) → used for embedding/NLI (semantic scoring)
 * - RAW inputs (original text) → used for keywords/negation/specificity (lexical checks)
 * 
 * This split is INTENTIONAL to prevent template words from polluting lexical signals.
 */
export async function testThemeScoring(
  guess: string,
  theme: string,
  options: ThemeTestOptions = {}
): Promise<ThemeTestResult> {
  const startTime = Date.now();
  const {
    methods = ['embedding', 'nli', 'hybrid', 'keywords'],
    themeTemplate = DEFAULT_TEMPLATES.contextual_theme,
    guessTemplate = DEFAULT_TEMPLATES.contextual_guess,
    words = [],
    thresholds = {}
  } = options;

  const effectiveThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  
  // EXPLICIT INPUT PREPARATION: Raw vs Processed split
  const inputs = prepareThemeScoringInputs({
    rawTheme: theme,
    rawGuess: guess,
    words,
    themeTemplate,
    guessTemplate,
  });
  
  const result: ThemeTestResult = {
    templatesUsed: inputs.templatesUsed,
    inputsUsed: {
      rawTheme: inputs.raw.theme,
      rawGuess: inputs.raw.guess,
      processedTheme: inputs.processed.theme,
      processedGuess: inputs.processed.guess,
    }
  };

  console.log(`[themeScoring] Testing: "${guess}" against "${theme}"`);
  console.log(`[themeScoring] RAW: theme="${inputs.raw.theme}", guess="${inputs.raw.guess}"`);
  console.log(`[themeScoring] PROCESSED: theme="${inputs.processed.theme.substring(0, 60)}..."`);

  try {
    // =========================================================================
    // LEXICAL CHECKS (use RAW inputs - no template pollution)
    // =========================================================================
    
    // 0. Keyword overlap analysis (fast, no API call) - RAW INPUTS
    if (methods.includes('keywords') || methods.includes('hybrid') || methods.includes('embeddingOnly')) {
      result.keywords = computeKeywordOverlap(inputs.raw.theme, inputs.raw.guess);
    }

    // 0b. Specificity/triviality analysis (fast, no API call) - RAW INPUTS
    if (methods.includes('length') || methods.includes('hybrid') || methods.includes('embeddingOnly')) {
      const keywordOverlap = result.keywords?.weightedOverlap ?? result.keywords?.overlap ?? 1;
      result.specificity = computeSpecificityAdjustment(inputs.raw.theme, inputs.raw.guess, keywordOverlap);
      // Also populate legacy lengthPenalty for backward compat
      result.lengthPenalty = computeLengthPenalty(inputs.raw.theme, inputs.raw.guess);
    }

    // 0c. Negation/qualifier detection (fast, no API call) - RAW INPUTS
    result.negation = detectNegationOrQualifier(inputs.raw.theme, inputs.raw.guess);
    if (result.negation.shouldPenalise) {
      console.log(`[themeScoring] Negation/qualifier mismatch detected: ${result.negation.reason}`);
    }

    // =========================================================================
    // SEMANTIC CHECKS (use PROCESSED inputs - templates add helpful context)
    // =========================================================================
    
    // 1. Embedding similarity - PROCESSED INPUTS
    if (methods.includes('embedding') || methods.includes('hybrid') || methods.includes('embeddingOnly')) {
      const similarity = await computeEmbeddingSimilarity(inputs.processed.guess, inputs.processed.theme);
      result.embedding = {
        similarity,
        isMatch: similarity >= effectiveThresholds.embedding,
        model: MODELS.embedding,
        threshold: effectiveThresholds.embedding
      };
      console.log(`[themeScoring] Embedding: ${(similarity * 100).toFixed(1)}% (threshold: ${effectiveThresholds.embedding * 100}%)`);
    }

    // 1b. Paraphrase model similarity - PROCESSED INPUTS
    if (methods.includes('paraphrase')) {
      const similarity = await computeParaphraseSimilarity(inputs.processed.guess, inputs.processed.theme);
      result.paraphrase = {
        similarity,
        isMatch: similarity >= effectiveThresholds.embedding,
        model: MODELS.paraphrase,
        threshold: effectiveThresholds.embedding
      };
      console.log(`[themeScoring] Paraphrase: ${(similarity * 100).toFixed(1)}% (threshold: ${effectiveThresholds.embedding * 100}%)`);
    }

    // 2. NLI entailment (bidirectional) - PROCESSED INPUTS
    if (methods.includes('nli') || methods.includes('hybrid')) {
      // Frame as: "The theme is X" entails "The theme is Y"?
      // Use NLI-specific templates for clearer premise/hypothesis
      const nliPremise = applyTemplate(TEMPLATES.nliPremise, { theme: inputs.raw.theme });
      const nliHypothesis = applyTemplate(TEMPLATES.nliHypothesis, { guess: inputs.raw.guess });
      
      // Use bidirectional NLI for better equivalence checking
      const bidir = await computeNLIBidirectional(nliPremise, nliHypothesis);
      
      // Pass if: high combined entailment AND low contradiction
      const nliPass = bidir.combined.entailment >= effectiveThresholds.nli_entailment && 
                      bidir.combined.contradiction < effectiveThresholds.nli_contradiction;
      
      result.nli = {
        entailment: bidir.combined.entailment,
        contradiction: bidir.combined.contradiction,
        neutral: bidir.combined.neutral,
        isMatch: nliPass,
        model: MODELS.nli.default,
        threshold: effectiveThresholds.nli_entailment,
        // Include forward/reverse for debugging
        forward: bidir.forward,
        reverse: bidir.reverse,
      };
    }

    // =========================================================================
    // 3. HYBRID DECISION - Combines all signals with policy rules
    // =========================================================================
    if (methods.includes('hybrid') && result.embedding && result.nli) {
      // Get all signals
      const embScore = result.embedding.similarity;
      const nliEntail = result.nli.entailment;
      const nliContradict = result.nli.contradiction;
      const keywordOverlap = result.keywords?.weightedOverlap ?? result.keywords?.overlap ?? 1;
      const specificityPenalty = result.specificity?.penaltyApplied ?? 0;
      const hasNegationMismatch = result.negation?.shouldPenalise ?? false;
      
      let strategy = 'weighted_default';
      let finalScore: number;
      let isMatch: boolean;
      
      // POLICY RULES (in priority order):
      
      // 1. Negation/qualifier mismatch → strong penalty
      if (hasNegationMismatch) {
        strategy = 'negation_or_qualifier_mismatch';
        finalScore = embScore * (1 - WEIGHTS.penalties.negationMismatch);
        isMatch = false;
        console.log(`[themeScoring] Negation mismatch penalty: ${(embScore*100).toFixed(1)}% → ${(finalScore*100).toFixed(1)}%`);
      }
      // 2. High contradiction → reject regardless of embedding
      else if (nliContradict > 0.5) {
        strategy = 'contradiction_override';
        finalScore = embScore * WEIGHTS.penalties.contradictionOverride;
        isMatch = false;
      }
      // 3. Keyword mismatch with high embedding → likely false positive
      else if (embScore > 0.75 && keywordOverlap < THRESHOLDS.keywords.mismatchPenaltyThreshold) {
        strategy = 'keyword_mismatch_penalty';
        finalScore = embScore * (0.5 + keywordOverlap * 0.5);
        isMatch = finalScore >= effectiveThresholds.hybrid_final;
        console.log(`[themeScoring] Keyword mismatch: ${(embScore*100).toFixed(1)}% → ${(finalScore*100).toFixed(1)}%`);
      }
      // 4. Trivial guess with missing concepts → penalty
      else if (specificityPenalty > 0) {
        strategy = 'trivial_guess_penalty';
        finalScore = embScore * (1 - specificityPenalty);
        isMatch = finalScore >= effectiveThresholds.hybrid_final;
      }
      // 5. Strong bidirectional entailment + decent embedding + good keywords → accept
      else if (nliEntail > THRESHOLDS.nli.strongEntailment && embScore > 0.6 && keywordOverlap >= THRESHOLDS.keywords.overlapMin) {
        strategy = 'strong_entailment_bidirectional';
        finalScore = (embScore + nliEntail) / 2;
        isMatch = true;
      }
      // 6. Default: Weighted combination with config weights
      else {
        const embWeight = WEIGHTS.hybrid.embedding;
        const nliWeight = WEIGHTS.hybrid.nli;
        // NLI contribution: entailment - contradiction/2 (can be negative)
        const nliContribution = nliEntail - nliContradict * 0.5;
        finalScore = embScore * embWeight + Math.max(0, nliContribution) * nliWeight;
        
        // Apply keyword penalty if overlap is low but not critical
        const keywordPenalty = result.keywords?.penalty ?? 0;
        if (keywordPenalty > 0) {
          finalScore = finalScore * (1 - keywordPenalty * 0.3);
        }
        
        isMatch = finalScore >= effectiveThresholds.hybrid_final;
      }
      
      result.hybrid = {
        finalScore,
        isMatch,
        embeddingWeight: WEIGHTS.hybrid.embedding,
        nliWeight: WEIGHTS.hybrid.nli,
        strategy
      };
      
      console.log(`[themeScoring] Hybrid: ${(finalScore * 100).toFixed(1)}% (${strategy}, kwOverlap: ${(keywordOverlap*100).toFixed(0)}%) → ${isMatch ? 'MATCH' : 'NO MATCH'}`);
    }

    // =========================================================================
    // 4. EMBEDDING-ONLY MODE (no NLI - faster, lower cost)
    // Uses: embedding + keyword + specificity + negation
    // IMPROVED: Stronger keyword-based penalties to reduce false positives
    // =========================================================================
    if (methods.includes('embeddingOnly') && result.embedding) {
      const embScore = result.embedding.similarity;
      const keywordOverlap = result.keywords?.weightedOverlap ?? result.keywords?.overlap ?? 1;
      const specificityPenalty = result.specificity?.penaltyApplied ?? 0;
      const hasNegationMismatch = result.negation?.shouldPenalise ?? false;
      
      let strategy = 'embedding_with_penalties';
      let finalScore = embScore;
      
      // POLICY RULES (priority order):
      // CRITICAL: Keyword overlap is key to detecting false positives like
      // "animal kingdom" vs "groups of animals" (share "animal" but different concepts)
      
      // 1. Negation/qualifier mismatch → severe penalty (60% reduction)
      if (hasNegationMismatch) {
        strategy = 'negation_mismatch';
        finalScore = embScore * (1 - WEIGHTS.penalties.negationMismatch);
        console.log(`[themeScoring] Negation penalty: ${(embScore*100).toFixed(1)}% → ${(finalScore*100).toFixed(1)}%`);
      }
      // 2. STRONG keyword mismatch (<30% overlap) with high embedding → likely false positive
      else if (keywordOverlap < THRESHOLDS.keywords.mismatchPenaltyThreshold && embScore > 0.7) {
        strategy = 'keyword_mismatch_severe';
        // Very severe penalty: 50% + (overlap * 50%)
        // At 0% overlap: 50%, at 30% overlap: 65%
        finalScore = embScore * (0.5 + keywordOverlap * 0.5);
        console.log(`[themeScoring] Severe keyword mismatch: ${(embScore*100).toFixed(1)}% → ${(finalScore*100).toFixed(1)}% (overlap: ${(keywordOverlap*100).toFixed(0)}%)`);
      } 
      // 3. MODERATE keyword mismatch (30-70% overlap) with high embedding → graduated penalty
      // This catches cases like "animal kingdom" (50% overlap) where embedding is misleadingly high
      else if (keywordOverlap < 0.7 && embScore > 0.7) {
        strategy = 'keyword_mismatch_moderate';
        // Graduated penalty: (1 - missing_portion * 0.5)
        // At 50% overlap (50% missing): 75% multiplier, At 70% overlap: 85% multiplier
        const missingPortion = 1 - keywordOverlap;
        const penaltyMultiplier = 1 - (missingPortion * 0.5);
        finalScore = embScore * penaltyMultiplier;
        console.log(`[themeScoring] Moderate keyword mismatch: ${(embScore*100).toFixed(1)}% → ${(finalScore*100).toFixed(1)}% (overlap: ${(keywordOverlap*100).toFixed(0)}%, penalty: ${((1-penaltyMultiplier)*100).toFixed(0)}%)`);
      }
      // 4. Trivial guess with missing concepts → penalty  
      else if (specificityPenalty > 0) {
        strategy = 'trivial_guess_penalty';
        finalScore = embScore * (1 - specificityPenalty);
      }
      // 5. Any remaining keyword penalty
      else if (result.keywords?.penalty && result.keywords.penalty > 0) {
        finalScore = embScore * (1 - result.keywords.penalty * 0.3);
      }
      
      const isMatch = finalScore >= effectiveThresholds.embedding;
      
      // Store as hybrid result for consistency
      result.hybrid = {
        finalScore,
        isMatch,
        embeddingWeight: 1.0,
        nliWeight: 0,
        strategy
      };
      
      console.log(`[themeScoring] EmbeddingOnly: ${(finalScore * 100).toFixed(1)}% (${strategy}) → ${isMatch ? 'MATCH' : 'NO MATCH'}`);
    }

  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
    console.error('[themeScoring] Error:', error);
  }
  
  result.processingTimeMs = Date.now() - startTime;

  return result;
}

/**
 * Production scoring function - uses hybrid approach
 * This is what the actual theme-guess endpoint should call
 */
export async function scoreThemeGuess(
  guess: string,
  theme: string
): Promise<{
  isCorrect: boolean;
  method: 'exact' | 'hybrid' | 'semantic' | 'error';
  confidence: number;
  similarity?: number;
}> {
  // Exact match first
  if (guess.toLowerCase().trim() === theme.toLowerCase().trim()) {
    return {
      isCorrect: true,
      method: 'exact',
      confidence: 100,
      similarity: 1.0
    };
  }

  try {
    const result = await testThemeScoring(guess, theme, {
      methods: ['hybrid']
    });

    if (result.hybrid) {
      return {
        isCorrect: result.hybrid.isMatch,
        method: 'hybrid',
        confidence: Math.round(result.hybrid.finalScore * 100),
        similarity: result.hybrid.finalScore
      };
    }

    // Fallback to embedding only
    if (result.embedding) {
      return {
        isCorrect: result.embedding.isMatch,
        method: 'semantic',
        confidence: Math.round(result.embedding.similarity * 100),
        similarity: result.embedding.similarity
      };
    }

    throw new Error('No scoring method succeeded');
    
  } catch (error) {
    console.error('[scoreThemeGuess] Error:', error);
    return {
      isCorrect: false,
      method: 'error',
      confidence: 0
    };
  }
}

/**
 * Test cases for validation
 */
export const TEST_CASES = {
  partsOfSpeech: {
    theme: "Words that are both nouns and verbs",
    goodGuesses: [
      "can be used as a noun and a verb",
      "dual part of speech",
      "function as both noun and verb",
      "words with multiple grammatical roles"
    ],
    badGuesses: [
      "begin with b",
      "short words",
      "common words",
      "English words"
    ]
  }
};
