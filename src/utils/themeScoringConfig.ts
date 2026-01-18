/**
 * Theme Scoring Configuration
 * ===========================
 * 
 * Centralized configuration for the theme scoring module.
 * All thresholds, weights, and model settings in one place.
 * 
 * Design principles:
 * - Versioned for tracking changes
 * - All magic numbers externalized
 * - Future-ready for database override (Supabase)
 * - Lean: only essential settings, no over-engineering
 * 
 * ARCHITECTURE NOTE:
 * -----------------
 * This config supports both PROCESSED inputs (for semantic scoring)
 * and RAW inputs (for keyword/negation detection).
 * 
 * PROCESSED: Templates applied, used for embedding/NLI
 * RAW: Original user text, used for keyword overlap, negation, specificity
 * 
 * @see docs/THEME_SCORING_IMPROVEMENT_ROADMAP.md
 */

// =============================================================================
// VERSION INFO
// =============================================================================

export const CONFIG_VERSION = '1.0.0';
export const CONFIG_UPDATED_AT = '2026-01-18T00:00:00Z';

// =============================================================================
// MODEL CONFIGURATION
// =============================================================================

export interface ModelConfig {
  embedding: string;
  paraphrase: string;
  nli: {
    default: string;
    options: string[];
  };
}

export const MODELS: ModelConfig = {
  // Sentence embedding model - good for semantic similarity
  embedding: 'sentence-transformers/all-MiniLM-L6-v2',
  
  // Paraphrase model - better at same-meaning detection
  paraphrase: 'sentence-transformers/paraphrase-MiniLM-L6-v2',
  
  // NLI models for entailment checking
  nli: {
    // Default: smaller, faster, MNLI-compatible
    default: 'valhalla/distilbart-mnli-12-1',
    // Alternative options for testing
    options: [
      'valhalla/distilbart-mnli-12-1',      // Fast, good accuracy
      'facebook/bart-large-mnli',            // More accurate, slower
    ]
  }
};

// Hugging Face API base URL
export const HF_API_BASE = 'https://router.huggingface.co/hf-inference/models';

// =============================================================================
// THRESHOLD CONFIGURATION
// =============================================================================

export interface ThresholdConfig {
  embedding: number;
  paraphrase: number;
  nli: {
    entailmentMin: number;      // Must exceed this for strong match
    contradictionMax: number;   // Must be below this to pass
    strongEntailment: number;   // Threshold for "definitely correct"
  };
  hybrid: {
    finalMin: number;           // Combined score threshold
  };
  keywords: {
    overlapMin: number;         // Minimum overlap to consider a match
    overlapPenaltyStart: number; // Start penalizing below this
    mismatchPenaltyThreshold: number; // When to apply keyword mismatch penalty
  };
}

export const THRESHOLDS: ThresholdConfig = {
  // Embedding similarity threshold (0-1)
  embedding: 0.78,
  
  // Paraphrase similarity threshold
  paraphrase: 0.78,
  
  // NLI thresholds
  nli: {
    entailmentMin: 0.5,        // >50% entailment to pass
    contradictionMax: 0.3,     // <30% contradiction to pass
    strongEntailment: 0.7,     // >70% for high-confidence match
  },
  
  // Hybrid scoring thresholds
  hybrid: {
    finalMin: 0.65,            // Combined score must exceed this
  },
  
  // Keyword overlap thresholds
  keywords: {
    overlapMin: 0.5,           // 50%+ keywords must match
    overlapPenaltyStart: 0.5,  // Start penalizing below 50%
    mismatchPenaltyThreshold: 0.3, // Apply strong penalty below 30%
  }
};

// =============================================================================
// WEIGHT CONFIGURATION
// =============================================================================

export interface WeightConfig {
  hybrid: {
    embedding: number;
    nli: number;
  };
  keywordMatching: {
    exact: number;
    stem: number;
    synonym: number;
    substring: number;
  };
  penalties: {
    keywordMismatch: number;    // Max penalty for missing keywords
    lengthShort: number;        // Max penalty for too-short guesses
    negationMismatch: number;   // Penalty for negation/qualifier mismatch
    contradictionOverride: number; // Multiplier when contradiction is high
  };
}

export const WEIGHTS: WeightConfig = {
  // Hybrid scoring weights
  hybrid: {
    embedding: 0.6,  // 60% weight on embedding
    nli: 0.4,        // 40% weight on NLI
  },
  
  // Keyword matching weights (for weighted overlap calculation)
  keywordMatching: {
    exact: 1.0,      // Exact word match
    stem: 0.9,       // Stemmed match (animals → animal)
    synonym: 0.6,    // Synonym match (group → plural)
    substring: 0.3,  // Partial match (animal in animals)
  },
  
  // Penalty magnitudes
  penalties: {
    keywordMismatch: 0.5,      // Up to 50% reduction
    lengthShort: 0.25,         // Up to 25% reduction for short guesses
    negationMismatch: 0.6,     // 60% reduction for negation mismatch
    contradictionOverride: 0.5, // Reduce to 50% when contradiction high
  }
};

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
  timeoutMs: 15000,            // 15 second timeout per request
  maxRetries: 4,               // Max 4 retry attempts
  baseDelayMs: 500,            // Start with 500ms delay
  maxDelayMs: 8000,            // Cap at 8 seconds
  jitterMs: 200,               // Add 0-200ms random jitter
  retryOnStatuses: [502, 503, 504], // Retry on these HTTP statuses
};

// =============================================================================
// SPECIFICITY/TRIVIALITY GATING
// =============================================================================

export interface SpecificityConfig {
  trivialGuessMaxContentTokens: number;  // Below this = trivial
  minKeywordOverlapForShortGuess: number; // Short guesses need good overlap
  maxSpecificityPenalty: number;          // Cap on penalty
}

export const SPECIFICITY: SpecificityConfig = {
  trivialGuessMaxContentTokens: 2,    // 1-2 content words = trivial
  minKeywordOverlapForShortGuess: 0.5, // Short guesses need 50%+ overlap
  maxSpecificityPenalty: 0.25,         // Max 25% penalty
};

// =============================================================================
// TEMPLATE CONFIGURATION
// =============================================================================

export interface TemplateConfig {
  theme: string;
  guess: string;
  contextualTheme: string;
  contextualGuess: string;
  nliPremise: string;
  nliHypothesis: string;
}

export const TEMPLATES: TemplateConfig = {
  // Basic templates
  theme: "The theme connecting these words is: {theme}",
  guess: "The theme connecting these words is: {guess}",
  
  // Contextual templates (recommended for embedding)
  contextualTheme: "What connects this week's words? {theme}",
  contextualGuess: "What connects this week's words? {guess}",
  
  // NLI-specific templates
  nliPremise: "The theme connecting these words is: {theme}",
  nliHypothesis: "The theme connecting these words is: {guess}",
};

// =============================================================================
// SYNONYM DICTIONARY (TIGHTENED)
// =============================================================================

/**
 * Synonym dictionary for keyword matching.
 * 
 * Design decisions:
 * - Keep it minimal to avoid false positives
 * - Focus on theme-specific vocabulary
 * - Removed overly broad synonyms (e.g., "object" for "noun")
 */
export const SYNONYMS: Record<string, string[]> = {
  // Grammar/linguistic terms
  'group': ['plural', 'collective', 'collection'],
  'plural': ['group', 'collective', 'multiple'],
  'noun': ['substantive'],
  'verb': ['action'],
  'adjective': ['describing', 'modifier'],
  'speech': ['grammar', 'grammatical', 'linguistic'],
  'part': ['component', 'element', 'role', 'function'],
  'dual': ['both', 'double', 'two'],
  
  // Common theme concepts
  'meaning': ['definition', 'sense'],
  'stress': ['emphasis', 'accent', 'pronunciation'],
  'change': ['shift', 'alter', 'vary'],
  'sound': ['phonetic', 'pronunciation', 'audio'],
  'letter': ['character', 'symbol'],
  'spelling': ['orthography', 'written'],
  
  // Category terms
  'animal': ['creature', 'beast', 'fauna'],
  'food': ['edible', 'cuisine', 'meal'],
  'color': ['colour', 'hue', 'shade'],
  'place': ['location', 'area', 'region'],
  'time': ['period', 'duration', 'era'],
};

// =============================================================================
// SCORING PROFILES (FUTURE-READY)
// =============================================================================

/**
 * Scoring profiles for different theme types.
 * Currently just default, but structure supports future expansion.
 * 
 * Future: Could override thresholds per theme type
 * e.g., "phonetic" themes need different handling than "semantic"
 */
export type ScoringProfile = 'default' | 'property' | 'phonetic' | 'category';

export interface ProfileOverrides {
  thresholds?: Partial<ThresholdConfig>;
  weights?: Partial<WeightConfig>;
}

export const PROFILES: Record<ScoringProfile, ProfileOverrides> = {
  default: {},
  property: {
    // Property themes (like "words that are both nouns and verbs")
    // Need stricter keyword matching
    weights: {
      penalties: {
        keywordMismatch: 0.6, // Higher penalty for missing keywords
        lengthShort: 0.25,
        negationMismatch: 0.7, // Very strict on negation
        contradictionOverride: 0.4,
      }
    } as Partial<WeightConfig>
  },
  phonetic: {
    // Phonetic themes (like "words that rhyme with...")
    // Embedding is less useful, qualifier detection is key
  },
  category: {
    // Category themes (like "types of animals")
    // Standard settings work well
  }
};

// =============================================================================
// CONFIG ACCESSOR
// =============================================================================

export interface ThemeScoringConfig {
  version: string;
  updatedAt: string;
  models: ModelConfig;
  thresholds: ThresholdConfig;
  weights: WeightConfig;
  network: NetworkConfig;
  specificity: SpecificityConfig;
  templates: TemplateConfig;
  synonyms: Record<string, string[]>;
}

/**
 * Get the current theme scoring configuration.
 * 
 * Future: This could load overrides from Supabase
 * For now, returns the static config.
 */
export function getThemeScoringConfig(): ThemeScoringConfig {
  return {
    version: CONFIG_VERSION,
    updatedAt: CONFIG_UPDATED_AT,
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
 * Resolve effective config with profile overrides.
 * 
 * @param profile - The scoring profile to use
 * @returns Merged config with profile overrides applied
 */
export function resolveConfigWithProfile(profile: ScoringProfile = 'default'): ThemeScoringConfig {
  const baseConfig = getThemeScoringConfig();
  const overrides = PROFILES[profile];
  
  if (!overrides || Object.keys(overrides).length === 0) {
    return baseConfig;
  }
  
  return {
    ...baseConfig,
    thresholds: { ...baseConfig.thresholds, ...overrides.thresholds },
    weights: { ...baseConfig.weights, ...overrides.weights },
  };
}

// =============================================================================
// FUTURE: DATABASE OVERRIDE SUPPORT (STUB)
// =============================================================================

/**
 * TODO: Load config overrides from Supabase
 * 
 * Table schema suggestion:
 * CREATE TABLE theme_scoring_config (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   version TEXT NOT NULL,
 *   config JSONB NOT NULL,
 *   active BOOLEAN DEFAULT FALSE,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   notes TEXT
 * );
 * 
 * This allows A/B testing different configs without code deploys.
 */
export async function loadConfigFromDatabase(): Promise<ThemeScoringConfig | null> {
  // Stub - returns null, falls back to static config
  // Future: query Supabase for active config
  console.log('[themeScoringConfig] Database config loading not yet implemented');
  return null;
}
