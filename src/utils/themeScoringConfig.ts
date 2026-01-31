/**
 * Theme Scoring Configuration
 * ============================
 * 
 * Centralized configuration for theme guess scoring.
 * All parameters are configurable here - no magic numbers scattered in code.
 * 
 * This config is designed to be:
 * - Single source of truth (no duplicated defaults)
 * - JSON-serializable (for future DB override support)
 * - Validated on load
 * 
 * ARCHITECTURE: Signals + Policy separation
 * - signals: embedding, nli, keywords, negation, specificity
 * - policy: how signals combine and what overrides exist
 * 
 * @see src/utils/themeScoring.ts for usage
 * @see docs/THEME_SCORING_IMPROVEMENT_ROADMAP.md for design decisions
 */

// =============================================================================
// HUGGING FACE API CONFIGURATION
// =============================================================================

// UPDATED: HuggingFace deprecated api-inference.huggingface.co on Jan 2026
// New endpoint is router.huggingface.co
export const HF_API_BASE = 'https://router.huggingface.co/hf-inference/models';

// =============================================================================
// MODEL CONFIGURATION
// =============================================================================

export const MODELS = {
  // Primary embedding model for semantic similarity
  embedding: 'sentence-transformers/all-MiniLM-L6-v2',
  
  // Paraphrase model - better for same-meaning detection
  paraphrase: 'sentence-transformers/paraphrase-MiniLM-L6-v2',
  
  // NLI models (TRUE 3-way sentence-pair classification)
  nli: {
    // Default: DistilBART (faster, cheaper, good accuracy)
    default: 'valhalla/distilbart-mnli-12-1',
    // Options for admin lab comparison
    options: [
      'valhalla/distilbart-mnli-12-1',     // Fast, good accuracy
      'facebook/bart-large-mnli',           // More accurate but slower
      'microsoft/deberta-v3-base-mnli',     // Alternative
    ],
    // Use bidirectional NLI for equivalence checking
    bidirectional: true,
  }
} as const;

// =============================================================================
// THRESHOLD CONFIGURATION
// =============================================================================

export const THRESHOLDS = {
  // Embedding similarity threshold
  embedding: 0.78,
  
  // NLI thresholds
  nli: {
    // Minimum combined bidirectional entailment to consider a match
    entailmentMin: 0.4,
    // Maximum contradiction before rejecting (even with high embedding)
    contradictionMax: 0.5,
    // Strong entailment threshold for automatic acceptance
    strongEntailment: 0.7,
    // Very high contradiction threshold for override (must be > contradictionMax)
    contradictionOverrideMin: 0.75,
  },
  
  // Hybrid decision thresholds
  hybrid: {
    // Minimum final score for a match
    finalMin: 0.78,
    // Embedding threshold below which we rely more on NLI
    embeddingMinForNliBoost: 0.7,
  },
  
  // Keyword overlap thresholds
  keywords: {
    // Minimum weighted overlap to consider a match
    overlapMin: 0.4,
    // Overlap below this triggers penalty when embedding is high (false positive detection)
    mismatchPenaltyThreshold: 0.3,
    // Overlap below this starts applying graduated penalty
    overlapPenaltyStart: 0.5,
  },
} as const;

// =============================================================================
// WEIGHT CONFIGURATION
// =============================================================================

export const WEIGHTS = {
  // Hybrid method weights (must sum to 1.0)
  hybrid: {
    embedding: 0.6,
    nli: 0.4,
  },
  
  // Keyword matching weights (for weighted overlap scoring)
  keywordMatching: {
    exact: 1.0,      // "animals" = "animals"
    stem: 0.9,       // "animals" → "animal" matches "animal"
    synonym: 0.6,    // "group" ↔ "plural" via synonym dictionary
    substring: 0.3,  // "animal" in "animals" - partial match
  },
  
  // Penalty weights
  penalties: {
    // Negation/qualifier mismatch penalty (severe - 60% reduction)
    negationMismatch: 0.6,
    // Contradiction override penalty
    contradictionOverride: 0.3,
    // Keyword mismatch penalty multiplier
    keywordMismatch: 0.5,
  },
} as const;

// =============================================================================
// NETWORK CONFIGURATION
// =============================================================================

export interface NetworkConfig {
  timeoutMs: number;
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterMs: number;
  retryOnStatuses: number[];
}

export const NETWORK: NetworkConfig = {
  // Request timeout in milliseconds
  timeoutMs: 10000,
  // Maximum retry attempts (bounded, not recursive!)
  maxRetries: 3,
  // Base delay for exponential backoff
  baseDelayMs: 1000,
  // Maximum delay cap
  maxDelayMs: 5000,
  // Random jitter range (0-250ms)
  jitterMs: 250,
  // HTTP status codes that trigger retry
  retryOnStatuses: [502, 503, 504, 429],
};

// =============================================================================
// SPECIFICITY / TRIVIALITY CONFIGURATION
// =============================================================================

export const SPECIFICITY = {
  // Maximum content tokens for a guess to be considered "trivial"
  trivialGuessMaxContentTokens: 2,
  // Minimum keyword overlap for short guesses (below this = penalty)
  // INCREASED from 0.5 to 0.6 to catch cases like "animal kingdom" (50% overlap)
  minKeywordOverlapForShortGuess: 0.6,
  // Maximum penalty for trivial guesses missing concepts
  maxSpecificityPenalty: 0.25,
} as const;

// =============================================================================
// TEMPLATE CONFIGURATION
// =============================================================================

export const TEMPLATES = {
  // Basic templates (just wrap the text)
  theme: '{theme}',
  guess: '{guess}',
  
  // Contextual templates (add semantic context for better embedding)
  contextualTheme: "What connects this week's words? {theme}",
  contextualGuess: "What connects this week's words? {guess}",
  
  // NLI-specific templates (clearer premise/hypothesis framing)
  nliPremise: 'The theme connecting these words is: {theme}',
  nliHypothesis: 'The theme connecting these words is: {guess}',
} as const;

// =============================================================================
// SYNONYM DICTIONARY
// =============================================================================

/**
 * Tight, symmetric, domain-relevant synonyms for keyword matching.
 * Used for detecting paraphrases like "group" ↔ "plural"
 * 
 * IMPORTANT: Keep this tight - too broad leads to false positives!
 */
export const SYNONYMS: Record<string, string[]> = {
  // Animal/nature terms
  'group': ['plural', 'collective', 'collection', 'set'],
  'plural': ['group', 'collective', 'multiple'],
  'animal': ['creature', 'beast', 'fauna'],
  'collective': ['group', 'plural', 'set'],
  
  // Grammar/language terms
  'noun': ['substantive', 'naming'],
  'verb': ['action', 'doing'],
  'adjective': ['descriptor', 'modifier'],
  'speech': ['grammar', 'grammatical', 'linguistic'],
  'part': ['component', 'role', 'function'],
  
  // Relationship terms
  'dual': ['both', 'double', 'two', 'multiple'],
  'both': ['dual', 'double', 'two'],
  
  // Semantic terms
  'meaning': ['definition', 'sense', 'interpretation'],
  'stress': ['emphasis', 'accent', 'pronunciation'],
  'change': ['shift', 'alter', 'vary', 'different'],
  
  // Common theme patterns
  'words': ['terms', 'vocabulary'],
  'names': ['nouns', 'terms', 'labels'],
};

// =============================================================================
// FULL CONFIG TYPE AND GETTER
// =============================================================================

export interface ThemeScoringConfig {
  hfApiBase: string;
  models: typeof MODELS;
  thresholds: typeof THRESHOLDS;
  weights: typeof WEIGHTS;
  network: NetworkConfig;
  specificity: typeof SPECIFICITY;
  templates: typeof TEMPLATES;
  synonyms: typeof SYNONYMS;
}

/**
 * Get the complete theme scoring configuration.
 * In future, this could load overrides from DB.
 */
export function getThemeScoringConfig(): ThemeScoringConfig {
  return {
    hfApiBase: HF_API_BASE,
    models: MODELS,
    thresholds: THRESHOLDS,
    weights: WEIGHTS,
    network: NETWORK,
    specificity: SPECIFICITY,
    templates: TEMPLATES,
    synonyms: SYNONYMS,
  };
}

/**
 * Validate the config (lightweight validation)
 * Throws if config is invalid
 */
export function validateConfig(config: ThemeScoringConfig): void {
  // Check weights sum to ~1.0
  const hybridSum = config.weights.hybrid.embedding + config.weights.hybrid.nli;
  if (Math.abs(hybridSum - 1.0) > 0.01) {
    throw new Error(`Hybrid weights must sum to 1.0, got ${hybridSum}`);
  }
  
  // Check thresholds are in valid ranges
  if (config.thresholds.embedding < 0 || config.thresholds.embedding > 1) {
    throw new Error('Embedding threshold must be between 0 and 1');
  }
  
  // Check NLI thresholds make sense
  if (config.thresholds.nli.contradictionOverrideMin <= config.thresholds.nli.contradictionMax) {
    throw new Error('contradictionOverrideMin must be greater than contradictionMax');
  }
  
  console.log('[themeScoringConfig] Configuration validated successfully');
}

// Validate on module load (development check)
try {
  validateConfig(getThemeScoringConfig());
} catch (error) {
  console.error('[themeScoringConfig] INVALID CONFIG:', error);
}
