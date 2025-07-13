/**
 * Advanced Fuzzy Matching System for Un-Define v2
 * 
 * Comprehensive word matching using multiple algorithms:
 * 1. Edit Distance (Levenshtein) - typos and spelling variations
 * 2. Phonetic Matching - sound-alike words
 * 3. Semantic Similarity - AI-powered meaning matching
 * 4. Keyboard Distance - QWERTY layout typos
 * 5. Morphological Analysis - word stems and variations
 */

import { normalizeText } from './text';

interface FuzzyMatchResult {
  isFuzzy: boolean;
  confidence: number;
  method: 'edit_distance' | 'phonetic' | 'semantic' | 'keyboard' | 'morphological' | 'character_overlap';
  distance?: number;
  similarity?: number;
  explanation: string;
}

interface FuzzyMatchConfig {
  enableSemanticMatching?: boolean;
  editDistanceThreshold?: number;
  phoneticThreshold?: number;
  semanticThreshold?: number;
  keyboardThreshold?: number;
  minimumWordLength?: number;
}

const DEFAULT_CONFIG: FuzzyMatchConfig = {
  enableSemanticMatching: true,
  editDistanceThreshold: 2,      // Max 2 character changes
  phoneticThreshold: 0.8,        // 80% phonetic similarity
  semanticThreshold: 0.75,       // 75% semantic similarity
  keyboardThreshold: 3,          // Max 3 keyboard distance
  minimumWordLength: 3           // Don't fuzzy match very short words
};

/**
 * QWERTY keyboard layout for detecting keyboard-based typos
 */
const QWERTY_LAYOUT: { [key: string]: string[] } = {
  'q': ['w', 'a', 's'],
  'w': ['q', 'e', 'a', 's', 'd'],
  'e': ['w', 'r', 's', 'd', 'f'],
  'r': ['e', 't', 'd', 'f', 'g'],
  't': ['r', 'y', 'f', 'g', 'h'],
  'y': ['t', 'u', 'g', 'h', 'j'],
  'u': ['y', 'i', 'h', 'j', 'k'],
  'i': ['u', 'o', 'j', 'k', 'l'],
  'o': ['i', 'p', 'k', 'l'],
  'p': ['o', 'l'],
  'a': ['q', 'w', 's', 'z'],
  's': ['q', 'w', 'e', 'a', 'd', 'z', 'x'],
  'd': ['w', 'e', 'r', 's', 'f', 'x', 'c'],
  'f': ['e', 'r', 't', 'd', 'g', 'c', 'v'],
  'g': ['r', 't', 'y', 'f', 'h', 'v', 'b'],
  'h': ['t', 'y', 'u', 'g', 'j', 'b', 'n'],
  'j': ['y', 'u', 'i', 'h', 'k', 'n', 'm'],
  'k': ['u', 'i', 'o', 'j', 'l', 'm'],
  'l': ['i', 'o', 'p', 'k'],
  'z': ['a', 's', 'x'],
  'x': ['s', 'd', 'z', 'c'],
  'c': ['d', 'f', 'x', 'v'],
  'v': ['f', 'g', 'c', 'b'],
  'b': ['g', 'h', 'v', 'n'],
  'n': ['h', 'j', 'b', 'm'],
  'm': ['j', 'k', 'n']
};

/**
 * Calculate Levenshtein distance between two strings
 */
function calculateEditDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }
  
  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[j][i] = matrix[j - 1][i - 1];
      } else {
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,      // deletion
          matrix[j][i - 1] + 1,      // insertion
          matrix[j - 1][i - 1] + 1   // substitution
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Generate phonetic representation (simplified Soundex)
 */
function generatePhonetic(word: string): string {
  const normalized = word.toUpperCase().replace(/[^A-Z]/g, '');
  if (normalized.length === 0) return '';
  
  const firstLetter = normalized[0];
  
  // Convert to phonetic codes
  let phonetic = normalized
    .replace(/[BFPV]/g, '1')
    .replace(/[CGJKQSXZ]/g, '2')
    .replace(/[DT]/g, '3')
    .replace(/[L]/g, '4')
    .replace(/[MN]/g, '5')
    .replace(/[R]/g, '6')
    .replace(/[AEIOUHWY]/g, '0');
  
  // Remove duplicates and zeros
  phonetic = phonetic.replace(/(.)\1+/g, '$1').replace(/0/g, '');
  
  // Return first letter + first 3 phonetic codes
  return firstLetter + phonetic.substring(1, 4).padEnd(3, '0');
}

/**
 * Calculate keyboard distance between two characters
 */
function getKeyboardDistance(char1: string, char2: string): number {
  if (char1 === char2) return 0;
  
  const neighbors = QWERTY_LAYOUT[char1.toLowerCase()];
  if (!neighbors) return 5; // Unknown character
  
  if (neighbors.includes(char2.toLowerCase())) return 1;
  
  // Check 2-step distance
  for (const neighbor of neighbors) {
    const secondNeighbors = QWERTY_LAYOUT[neighbor];
    if (secondNeighbors && secondNeighbors.includes(char2.toLowerCase())) {
      return 2;
    }
  }
  
  return 5; // Too far
}

/**
 * Calculate keyboard-based edit distance
 */
function calculateKeyboardDistance(str1: string, str2: string): number {
  if (Math.abs(str1.length - str2.length) > 2) return 999;
  
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));
  
  for (let i = 0; i <= len1; i++) {
    matrix[0][i] = i;
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[j][0] = j;
  }
  
  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[j][i] = matrix[j - 1][i - 1];
      } else {
        const keyboardDist = getKeyboardDistance(str1[i - 1], str2[j - 1]);
        const substitutionCost = keyboardDist <= 2 ? 0.5 : 1;
        
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,                    // deletion
          matrix[j][i - 1] + 1,                    // insertion
          matrix[j - 1][i - 1] + substitutionCost  // substitution
        );
      }
    }
  }
  
  return matrix[len2][len1];
}

/**
 * Simple stemming - remove common suffixes
 */
function getStem(word: string): string {
  const suffixes = ['ing', 'ed', 'er', 'est', 'ly', 'tion', 'ness', 'ment', 'ful', 'less'];
  let stem = word.toLowerCase();
  
  for (const suffix of suffixes) {
    if (stem.endsWith(suffix) && stem.length > suffix.length + 2) {
      stem = stem.substring(0, stem.length - suffix.length);
      break;
    }
  }
  
  return stem;
}

/**
 * Check semantic similarity using AI (if available)
 */
async function checkSemanticSimilarity(word1: string, word2: string): Promise<number> {
  try {
    // Dynamic import to avoid circular dependencies
    const { computeSemanticSimilarity } = await import('./semanticSimilarity');
    return await computeSemanticSimilarity(word1, word2);
  } catch (error) {
    console.warn('[AdvancedFuzzyMatcher] Semantic similarity not available:', error);
    return 0;
  }
}

/**
 * Legacy character overlap method (for backward compatibility)
 */
function calculateCharacterOverlap(word1: string, word2: string): { isFuzzy: boolean; confidence: number } {
  const positions: number[] = [];
  let correctPositions = 0;
  let sharedCharacters = 0;
  
  const targetCharsUsed: boolean[] = new Array(word2.length).fill(false);
  
  // First pass: Find exact position matches
  for (let i = 0; i < word1.length; i++) {
    if (i < word2.length && word1[i] === word2[i]) {
      positions.push(i);
      correctPositions++;
      targetCharsUsed[i] = true;
    }
  }
  
  // Second pass: Find shared characters in wrong positions
  for (let i = 0; i < word1.length; i++) {
    if (i < word2.length && word1[i] === word2[i]) {
      continue; // Already matched
    }
    
    for (let j = 0; j < word2.length; j++) {
      if (!targetCharsUsed[j] && word1[i] === word2[j]) {
        positions.push(i);
        sharedCharacters++;
        targetCharsUsed[j] = true;
        break;
      }
    }
  }
  
  const maxLength = Math.max(word1.length, word2.length);
  const minLength = Math.min(word1.length, word2.length);
  const totalMatches = correctPositions + sharedCharacters;
  const similarityRatio = totalMatches / maxLength;
  const lengthRatio = minLength / maxLength;
  
  const isFuzzy = (
    totalMatches >= 2 &&
    similarityRatio >= 0.4 &&
    (correctPositions >= 1 || totalMatches >= 3) &&
    lengthRatio >= 0.5
  );
  
  return {
    isFuzzy,
    confidence: isFuzzy ? Math.round(similarityRatio * 100) : 0
  };
}

/**
 * Main fuzzy matching function with multiple algorithms
 */
export async function advancedFuzzyMatch(
  guess: string,
  target: string,
  config: FuzzyMatchConfig = DEFAULT_CONFIG
): Promise<FuzzyMatchResult> {
  
  const normalizedGuess = normalizeText(guess);
  const normalizedTarget = normalizeText(target);
  
  // Skip very short words
  if (normalizedGuess.length < (config.minimumWordLength || 3) || 
      normalizedTarget.length < (config.minimumWordLength || 3)) {
    return {
      isFuzzy: false,
      confidence: 0,
      method: 'character_overlap',
      explanation: 'Words too short for fuzzy matching'
    };
  }
  
  // Skip if words are too different in length
  const lengthDiff = Math.abs(normalizedGuess.length - normalizedTarget.length);
  if (lengthDiff > Math.max(normalizedGuess.length, normalizedTarget.length) * 0.5) {
    return {
      isFuzzy: false,
      confidence: 0,
      method: 'character_overlap',
      explanation: 'Words too different in length'
    };
  }
  
  // Try different matching algorithms in order of preference
  
  // 1. Edit Distance (Levenshtein) - Best for typos
  const editDistance = calculateEditDistance(normalizedGuess, normalizedTarget);
  if (editDistance <= (config.editDistanceThreshold || 2)) {
    const maxLen = Math.max(normalizedGuess.length, normalizedTarget.length);
    const confidence = Math.round((1 - editDistance / maxLen) * 100);
    
    return {
      isFuzzy: true,
      confidence,
      method: 'edit_distance',
      distance: editDistance,
      explanation: `${editDistance} character change${editDistance !== 1 ? 's' : ''} needed`
    };
  }
  
  // 2. Keyboard Distance - Best for keyboard typos
  const keyboardDistance = calculateKeyboardDistance(normalizedGuess, normalizedTarget);
  if (keyboardDistance <= (config.keyboardThreshold || 3)) {
    const confidence = Math.round((1 - keyboardDistance / 5) * 100);
    
    return {
      isFuzzy: true,
      confidence,
      method: 'keyboard',
      distance: keyboardDistance,
      explanation: `Keyboard layout typo detected (distance: ${keyboardDistance})`
    };
  }
  
  // 3. Phonetic Matching - Best for sound-alike words
  const phoneticGuess = generatePhonetic(normalizedGuess);
  const phoneticTarget = generatePhonetic(normalizedTarget);
  
  if (phoneticGuess === phoneticTarget && phoneticGuess.length > 1) {
    return {
      isFuzzy: true,
      confidence: 85,
      method: 'phonetic',
      explanation: `Sounds similar (${phoneticGuess})`
    };
  }
  
  // 4. Morphological Analysis - Best for word variations
  const stemGuess = getStem(normalizedGuess);
  const stemTarget = getStem(normalizedTarget);
  
  if (stemGuess === stemTarget && stemGuess.length > 2) {
    return {
      isFuzzy: true,
      confidence: 80,
      method: 'morphological',
      explanation: `Same word stem: "${stemGuess}"`
    };
  }
  
  // 5. Semantic Similarity - Best for related words
  if (config.enableSemanticMatching) {
    try {
      const semanticScore = await checkSemanticSimilarity(normalizedGuess, normalizedTarget);
      if (semanticScore >= (config.semanticThreshold || 0.75)) {
        return {
          isFuzzy: true,
          confidence: Math.round(semanticScore * 100),
          method: 'semantic',
          similarity: semanticScore,
          explanation: `Semantically related (${Math.round(semanticScore * 100)}% similarity)`
        };
      }
    } catch (error) {
      console.warn('[AdvancedFuzzyMatcher] Semantic matching failed:', error);
    }
  }
  
  // 6. Fallback to character overlap (legacy method)
  const characterResult = calculateCharacterOverlap(normalizedGuess, normalizedTarget);
  if (characterResult.isFuzzy) {
    return {
      isFuzzy: true,
      confidence: characterResult.confidence,
      method: 'character_overlap',
      explanation: `Character overlap (${characterResult.confidence}% similarity)`
    };
  }
  
  // No fuzzy match found
  return {
    isFuzzy: false,
    confidence: 0,
    method: 'character_overlap',
    explanation: 'No similarity detected'
  };
}

/**
 * Simplified interface for backward compatibility
 */
export async function isFuzzyMatch(guess: string, target: string): Promise<boolean> {
  const result = await advancedFuzzyMatch(guess, target);
  return result.isFuzzy;
}

/**
 * Get fuzzy match confidence score
 */
export async function getFuzzyMatchConfidence(guess: string, target: string): Promise<number> {
  const result = await advancedFuzzyMatch(guess, target);
  return result.confidence;
} 