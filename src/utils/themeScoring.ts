/**
 * Theme Scoring Module
 * 
 * Multi-method approach for accurate theme guess matching:
 * 1. Embedding similarity (sentence-transformers/all-MiniLM-L6-v2)
 * 2. NLI cross-encoder (cross-encoder/nli-deberta-v3-xsmall) for entailment checking
 * 3. Hybrid decision combining both methods
 * 
 * This modular design allows testing different methods and adding new models.
 * 
 * Key insight: Embedding similarity alone can give false positives for 
 * "property" themes (like "words that are both nouns and verbs") because
 * embeddings capture semantic relatedness, not logical entailment.
 * 
 * NLI helps by checking: "Does the guess actually describe the theme?"
 */

// Model configuration
const EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const NLI_MODEL = 'facebook/bart-large-mnli'; // Zero-shot classification model for NLI
const HF_API_BASE = 'https://router.huggingface.co/hf-inference/models';

// Thresholds (tunable via admin lab)
export const DEFAULT_THRESHOLDS = {
  embedding: 0.78,      // Lowered from 0.85 to accept valid synonyms
  nli_entailment: 0.5,  // Must have >50% entailment probability  
  nli_contradiction: 0.3, // Must have <30% contradiction to pass
  hybrid_final: 0.65    // Combined score threshold
};

// Template defaults
const DEFAULT_TEMPLATES = {
  theme: "The theme connecting these words is: {theme}",
  guess: "The theme connecting these words is: {guess}",
  contextual_theme: "What connects this week's words? {theme}",
  contextual_guess: "What connects this week's words? {guess}"
};

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
  overlap: number;           // % of theme keywords found in guess
  themeKeywords: string[];   // Key terms extracted from theme
  guessKeywords: string[];   // Key terms extracted from guess
  matchedKeywords: string[]; // Keywords that matched
  isMatch: boolean;          // Whether keyword overlap suggests a match
  penalty: number;           // Penalty to apply if low overlap (0-1)
}

export interface ThemeTestResult {
  embedding?: EmbeddingResult;
  nli?: NLIResult;
  hybrid?: HybridResult;
  keywords?: KeywordResult;   // NEW: Keyword overlap analysis
  templatesUsed?: {
    theme: string;
    guess: string;
  };
  error?: string;
  processingTimeMs?: number;
}

export interface ThemeTestOptions {
  methods?: ('embedding' | 'nli' | 'hybrid' | 'keywords')[];
  themeTemplate?: string;
  guessTemplate?: string;
  words?: string[];
  thresholds?: Partial<typeof DEFAULT_THRESHOLDS>;
}

/**
 * Compute embedding similarity using sentence-transformers
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
  
  const url = `${HF_API_BASE}/${EMBEDDING_MODEL}`;
  
  try {
    const response = await fetch(url, {
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
        // Model loading - wait and retry
        console.warn('[themeScoring] Embedding model loading, retrying...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        return computeEmbeddingSimilarity(text1, text2);
      }
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
 * Compute NLI scores using cross-encoder
 * 
 * Returns probability distribution over: entailment, neutral, contradiction
 * 
 * For theme matching:
 * - Premise: "The theme is {actual_theme}"  
 * - Hypothesis: "The theme is {guess}"
 * 
 * High entailment = guess captures the theme meaning
 * High contradiction = guess is incompatible with theme
 * 
 * Note: Cross-encoder models use zero-shot classification format, not sentence pairs
 */
async function computeNLIScores(
  premise: string,
  hypothesis: string
): Promise<{ entailment: number; contradiction: number; neutral: number }> {
  const apiKey = process.env.HF_API_KEY;
  
  if (!apiKey) {
    console.error('[themeScoring] HF_API_KEY not set');
    throw new Error('HF_API_KEY not configured');
  }
  
  // Use zero-shot classification endpoint which is more reliable
  // This checks if the hypothesis entails/contradicts/is neutral to the premise
  const url = `${HF_API_BASE}/facebook/bart-large-mnli`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: premise,
        parameters: {
          candidate_labels: [hypothesis],
          multi_label: false
        }
      })
    });
    
    if (!response.ok) {
      if (response.status === 503) {
        console.warn('[themeScoring] NLI model loading, retrying...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        return computeNLIScores(premise, hypothesis);
      }
      const errorText = await response.text();
      throw new Error(`NLI API error ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    
    // Zero-shot returns: { labels: ["hypothesis"], scores: [0.85] }
    // We interpret high score as entailment (premise supports hypothesis)
    const score = result.scores?.[0] || 0;
    
    // Map single score to NLI-like distribution
    // High score = entailment, low score = contradiction, middle = neutral
    let scores: { entailment: number; contradiction: number; neutral: number };
    
    if (score > 0.7) {
      scores = { entailment: score, contradiction: (1 - score) * 0.3, neutral: (1 - score) * 0.7 };
    } else if (score < 0.3) {
      scores = { entailment: score, contradiction: (1 - score) * 0.7, neutral: (1 - score) * 0.3 };
    } else {
      scores = { entailment: score, contradiction: (1 - score) * 0.4, neutral: (1 - score) * 0.6 };
    }
    
    console.log(`[themeScoring] NLI: "${hypothesis.substring(0, 50)}..." → E:${(scores.entailment*100).toFixed(1)}% C:${(scores.contradiction*100).toFixed(1)}% N:${(scores.neutral*100).toFixed(1)}%`);
    
    return scores;
    
  } catch (error) {
    console.error('[themeScoring] NLI error:', error);
    throw error;
  }
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

/**
 * Common stop words to filter out from keyword extraction
 */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 
  'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'must', 'that', 'this', 'these', 'those', 'what', 'which',
  'who', 'whom', 'whose', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
  'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only',
  'own', 'same', 'so', 'than', 'too', 'very', 'can', 'just', 'words', 'word',
  'things', 'thing', 'can', 'also', 'begin', 'beginning', 'begins'
]);

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
 * Compute keyword overlap between theme and guess
 * This helps detect false positives where embedding sees similarity
 * but the actual meaning is different
 * 
 * Example:
 * - Theme: "Groups of animals" → keywords: ["groups", "animals"]
 * - Guess: "Animal kingdom" → keywords: ["animal", "kingdom"]
 * - Overlap: "animals" matches "animal" (stemming) → 50%
 * - Penalty: Missing "groups" which is key concept → suggest lower score
 */
function computeKeywordOverlap(theme: string, guess: string): KeywordResult {
  const themeKeywords = extractKeywords(theme);
  const guessKeywords = extractKeywords(guess);
  
  // Find matching keywords (with basic stemming)
  const matchedKeywords: string[] = [];
  
  for (const tk of themeKeywords) {
    const tkStem = stemWord(tk);
    for (const gk of guessKeywords) {
      const gkStem = stemWord(gk);
      if (tkStem === gkStem || tk.includes(gk) || gk.includes(tk)) {
        if (!matchedKeywords.includes(tk)) {
          matchedKeywords.push(tk);
        }
        break;
      }
    }
  }
  
  // Calculate overlap percentage
  const overlap = themeKeywords.length > 0 
    ? matchedKeywords.length / themeKeywords.length 
    : 0;
  
  // Calculate penalty for missing key concepts
  // If less than 50% of theme keywords matched, apply penalty
  const penalty = overlap < 0.5 ? (0.5 - overlap) : 0;
  
  // Consider a match if at least 50% of theme keywords are present
  const isMatch = overlap >= 0.5;
  
  console.log(`[themeScoring] Keywords: theme=${JSON.stringify(themeKeywords)}, guess=${JSON.stringify(guessKeywords)}, matched=${JSON.stringify(matchedKeywords)}, overlap=${(overlap*100).toFixed(1)}%`);
  
  return {
    overlap,
    themeKeywords,
    guessKeywords,
    matchedKeywords,
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
  const result: ThemeTestResult = {
    templatesUsed: {
      theme: themeTemplate,
      guess: guessTemplate
    }
  };

  // Apply templates
  const wordsStr = words.join(', ');
  const processedTheme = applyTemplate(themeTemplate, { theme, words: wordsStr });
  const processedGuess = applyTemplate(guessTemplate, { guess, words: wordsStr });

  console.log(`[themeScoring] Testing: "${guess}" against "${theme}"`);

  try {
    // 0. Keyword overlap analysis (fast, no API call)
    if (methods.includes('keywords') || methods.includes('hybrid')) {
      result.keywords = computeKeywordOverlap(theme, guess);
    }

    // 1. Embedding similarity
    if (methods.includes('embedding') || methods.includes('hybrid')) {
      const similarity = await computeEmbeddingSimilarity(processedGuess, processedTheme);
      result.embedding = {
        similarity,
        isMatch: similarity >= effectiveThresholds.embedding,
        model: EMBEDDING_MODEL,
        threshold: effectiveThresholds.embedding
      };
      console.log(`[themeScoring] Embedding: ${(similarity * 100).toFixed(1)}% (threshold: ${effectiveThresholds.embedding * 100}%)`);
    }

    // 2. NLI entailment
    if (methods.includes('nli') || methods.includes('hybrid')) {
      // Frame as: "The theme is X" entails "The theme is Y"?
      const nliPremise = `The theme connecting these words is: ${theme.toLowerCase()}`;
      const nliHypothesis = `The theme connecting these words is: ${guess.toLowerCase()}`;
      
      const nliScores = await computeNLIScores(nliPremise, nliHypothesis);
      
      // Pass if: high entailment AND low contradiction
      const nliPass = nliScores.entailment >= effectiveThresholds.nli_entailment && 
                      nliScores.contradiction < effectiveThresholds.nli_contradiction;
      
      result.nli = {
        ...nliScores,
        isMatch: nliPass,
        model: NLI_MODEL,
        threshold: effectiveThresholds.nli_entailment
      };
    }

    // 3. Hybrid decision (now incorporates keyword overlap as penalty)
    if (methods.includes('hybrid') && result.embedding && result.nli) {
      // Strategy: 
      // - If NLI shows HIGH contradiction (>0.5), reject regardless of embedding
      // - If keywords have LOW overlap (<50%), apply penalty
      // - If NLI shows HIGH entailment (>0.7) AND embedding >0.6 AND keywords match, accept
      // - Otherwise, weighted combination
      
      const embScore = result.embedding.similarity;
      const nliEntail = result.nli.entailment;
      const nliContradict = result.nli.contradiction;
      const keywordPenalty = result.keywords?.penalty ?? 0;
      const keywordOverlap = result.keywords?.overlap ?? 1; // Default to 1 (no penalty) if not computed
      
      let strategy = 'weighted';
      let finalScore: number;
      let isMatch: boolean;
      
      // Rejection rule: high contradiction overrides everything
      if (nliContradict > 0.5) {
        strategy = 'contradiction_override';
        finalScore = Math.min(embScore * 0.5, 1 - nliContradict);
        isMatch = false;
      }
      // NEW: Keyword mismatch penalty - if embedding is high but keywords don't match
      // This catches cases like "animal kingdom" scoring high for "groups of animals"
      else if (embScore > 0.75 && keywordOverlap < 0.3) {
        strategy = 'keyword_mismatch_penalty';
        // Apply significant penalty for missing key concepts
        finalScore = embScore * (0.5 + keywordOverlap * 0.5);
        isMatch = finalScore >= effectiveThresholds.hybrid_final;
        console.log(`[themeScoring] Keyword penalty applied: embedding=${(embScore*100).toFixed(1)}% reduced to ${(finalScore*100).toFixed(1)}%`);
      }
      // Acceptance rule: high entailment with decent embedding AND good keyword overlap
      else if (nliEntail > 0.7 && embScore > 0.6 && keywordOverlap >= 0.5) {
        strategy = 'strong_entailment';
        finalScore = (embScore + nliEntail) / 2;
        isMatch = true;
      }
      // Weighted combination (embedding 60%, NLI 40%) with keyword penalty
      else {
        const embWeight = 0.6;
        const nliWeight = 0.4;
        // NLI contribution: entailment - contradiction (can be negative)
        const nliContribution = nliEntail - nliContradict * 0.5;
        finalScore = embScore * embWeight + Math.max(0, nliContribution) * nliWeight;
        
        // Apply keyword penalty if overlap is low
        if (keywordPenalty > 0) {
          finalScore = finalScore * (1 - keywordPenalty * 0.3); // Max 15% reduction
        }
        
        isMatch = finalScore >= effectiveThresholds.hybrid_final;
      }
      
      result.hybrid = {
        finalScore,
        isMatch,
        embeddingWeight: 0.6,
        nliWeight: 0.4,
        strategy
      };
      
      console.log(`[themeScoring] Hybrid: ${(finalScore * 100).toFixed(1)}% (${strategy}, keyword overlap: ${(keywordOverlap*100).toFixed(0)}%) → ${isMatch ? 'MATCH' : 'NO MATCH'}`);
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
